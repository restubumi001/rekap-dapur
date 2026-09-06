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

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body
  });
});
