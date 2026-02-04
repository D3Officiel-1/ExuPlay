
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuration Firebase pour le Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyAy6Nk_D75ourUGLv7An9nppw0OLO-vGuQ",
  authDomain: "exu-play.firebaseapp.com",
  projectId: "exu-play",
  storageBucket: "exu-play.firebasestorage.app",
  messagingSenderId: "613280056029",
  appId: "1:613280056029:web:1b1cc65a1284e1df1ad134",
  measurementId: "G-NS856SJ4Q0"
});

const messaging = firebase.messaging();

// Gestion des messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan ', payload);
  
  const notificationTitle = payload.notification.title || "Exu Play";
  const notificationOptions = {
    body: payload.notification.body || "Nouvelle vibration dans l'éther.",
    icon: '/icon.png',
    badge: '/icon.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
