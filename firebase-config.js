/* =====================================================
   CONFIGURATION FIREBASE

   Remplace les valeurs ci-dessous par celles de TON
   projet Firebase (gratuit) :

   1. Va sur https://console.firebase.google.com
   2. Crée un projet (ex: "armelle-et-moi")
   3. Dans le projet : "Créer une base de données" > Firestore
      Database > commencer en "mode test"
   4. Va dans Paramètres du projet (roue crantée) >
      "Vos applications" > Ajouter une application Web (</>)
   5. Copie l'objet "firebaseConfig" qui s'affiche et
      colle ses valeurs ici en dessous.
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBJiqk0uzeOWYeva3UI7oY0Netmmsa5WAk",
    authDomain: "vinted-bf9de.firebaseapp.com",
    projectId: "vinted-bf9de",
    storageBucket: "vinted-bf9de.firebasestorage.app",
    messagingSenderId: "5029279527",
    appId: "1:5029279527:web:6bb463625fd86727611b02"
};

firebase.initializeApp(firebaseConfig);
