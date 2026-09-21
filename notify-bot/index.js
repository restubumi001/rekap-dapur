const admin = require("firebase-admin");

function extractJsonObject(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      "Tidak ditemukan objek JSON ({ ... }) di dalam secret FIREBASE_SERVICE_ACCOUNT."
    );
  }
  return raw.slice(start, end + 1);
}

let serviceAccount;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  serviceAccount = JSON.parse(extractJsonObject(raw));
} catch (err) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  console.error("Gagal membaca secret FIREBASE_SERVICE_ACCOUNT sebagai JSON.");
  console.error("Panjang teks secret saat ini:", raw.length, "karakter.");
  console.error(
    "Kemungkinan ada karakter nyasar saat copy-paste. Coba update ulang secretnya."
  );
  throw err;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Link situs kamu — dipakai supaya notifikasi bisa diketuk buat buka aplikasi
const APP_URL = "https://restubumi001.github.io/rekap-dapur/";

function classify(items) {
  if (items.some((i) => i.status === "Kurang")) return "Kurang";
  if (items.some((i) => i.status === "Lebih")) return "Lebih";
  return "Cukup";
}

function formatItems(items, status) {
  return items
    .filter((i) => i.status === status)
    .map((i) => (i.amount ? `${i.name} (${i.amount})` : i.name))
    .join(", ");
}

function buildMessageContent(data) {
  const items = data.items || [];
  const status = classify(items);
  const meal = data.meal || "Laporan";
  const title = `PJ KEDAPURAN — ${meal}`; // judul otomatis tampil bold di HP

  if (status === "Kurang") {
    const namesKurang = formatItems(items, "Kurang");
    return {
      title,
      body: `⚠️ Qadarullah, ada kekurangan: ${namesKurang}.${data.catatan ? " Catatan: " + data.catatan + "." : ""} Ketuk untuk lihat detail.`,
    };
  }

  if (status === "Lebih") {
    const namesLebih = formatItems(items, "Lebih");
    return {
      title,
      body: `🙏 Alhamdulillah, tidak ada kekurangan. Kelebihan di: ${namesLebih}. Ketuk untuk lihat detail.`,
    };
  }

  const namesCukup = items.map((i) => i.name).join(", ");
  return {
    title,
    body: `🙏 Alhamdulillah, semua item cukup (${namesCukup}). Ketuk untuk lihat detail.`,
  };
}

async function main() {
  const stateRef = db.collection("meta").doc("notifyState");
  const stateSnap = await stateRef.get();

  // Jalan pertama kali: jangan langsung kirim notif buat SEMUA laporan lama.
  // Cukup catat waktu sekarang sebagai titik awal, baru mulai kirim dari laporan berikutnya.
  if (!stateSnap.exists) {
    await stateRef.set({ lastTs: Date.now() });
    console.log("Inisialisasi pertama kali. Belum ada notifikasi dikirim.");
    return;
  }

  const lastTs = stateSnap.data().lastTs || 0;

  const newDocs = await db
    .collection("laporan")
    .where("ts", ">", lastTs)
    .orderBy("ts", "asc")
    .get();

  if (newDocs.empty) {
    console.log("Tidak ada laporan baru sejak pengecekan terakhir.");
    return;
  }

  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens = tokensSnap.docs.map((d) => d.id);

  let maxTs = lastTs;

  for (const doc of newDocs.docs) {
    const data = doc.data();
    if ((data.ts || 0) > maxTs) maxTs = data.ts;

    if (tokens.length === 0) continue;

    const { title, body } = buildMessageContent(data);
    const message = {
      notification: { title, body },
      webpush: { fcmOptions: { link: APP_URL } },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `Laporan ${doc.id}: ${response.successCount} terkirim, ${response.failureCount} gagal`
      );

      const invalidTokens = [];
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
      if (invalidTokens.length > 0) {
        await Promise.all(
          invalidTokens.map((t) => db.collection("fcmTokens").doc(t).delete())
        );
      }
    } catch (err) {
      console.error(`Gagal kirim untuk laporan ${doc.id}:`, err);
    }
  }

  await stateRef.set({ lastTs: maxTs }, { merge: true });
  console.log("Selesai. Titik cek terakhir diperbarui.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
