importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon?size=192'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
