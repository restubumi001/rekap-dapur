importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAd7MbDGCiwMYfFeGBItlQd1JqFoWfH9KA",
  authDomain: "rekap-dapur-pesantren.firebaseapp.com",
  projectId: "rekap-dapur-pesantren",
  messagingSenderId: "274739603368",
  appId: "1:274739603368:web:415a868d4416be514e9f9d"
});

const messaging = firebase.messaging();

// Link default kalau server tidak mengirim link khusus
const DEFAULT_URL = "https://restubumi001.github.io/rekap-dapur/";

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    data: {
      url: (payload.fcmOptions && payload.fcmOptions.link) || DEFAULT_URL
    }
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ini bagian yang tadinya hilang: apa yang terjadi pas notifikasi diketuk.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || DEFAULT_URL;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
