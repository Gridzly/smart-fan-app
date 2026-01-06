  // Firebase CDN imports (WORKS WITH LIVE SERVER)
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

  // Your Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBWi0HbBMixDIOmeJ8Dtd9_R94xw2tRFCU",
    authDomain: "smart-app-e8a21.firebaseapp.com",
    databaseURL: "https://smart-app-e8a21-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smart-app-e8a21",
    storageBucket: "smart-app-e8a21.firebasestorage.app",
    messagingSenderId: "448276110068",
    appId: "1:448276110068:web:4bfb975dd1cc93498adca1"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // Export services
  export const auth = getAuth(app);
  export const db = getDatabase(app);
  export const googleProvider = new GoogleAuthProvider();