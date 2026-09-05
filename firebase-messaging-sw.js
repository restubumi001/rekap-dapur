importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAd7MbDGCiwMYfFeGBItlQd1JqFoWfH9KA",
  authDomain: "rekap-dapur-pesantren.firebaseapp.com",
  projectId: "rekap-dapur-pesantren",
  storageBucket: "rekap-dapur-pesantren.firebasestorage.app",
  messagingSenderId: "274739603368",
  appId: "1:274739603368:web:5241a3567eb3b9ad4e9f9d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Pesan diterima di background:', payload);

  const notificationTitle = payload.notification?.title || 'Laporan Dapur';
  const notificationOptions = {
    body: payload.notification?.body || ''
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
