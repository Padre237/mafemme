/* =====================================================
   CONFIGURATION FIREBASE

   Projet Firebase : "armelle-et-aaron"
   (console : https://console.firebase.google.com/project/armelle-et-aaron)

   Les règles de sécurité de la base sont recopiées dans le
   fichier firestore.rules : toute nouvelle collection utilisée
   par le site doit y être ajoutée, puis les règles publiées
   dans la console (Firestore Database > Règles).
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBv51M-3p-NOgfwCs6ryc8Zn0xAuhjFWSo",
    authDomain: "armelle-et-aaron.firebaseapp.com",
    projectId: "armelle-et-aaron",
    storageBucket: "armelle-et-aaron.firebasestorage.app",
    messagingSenderId: "243297911311",
    appId: "1:243297911311:web:16847283757a2788e1d97a"
};

firebase.initializeApp(firebaseConfig);
