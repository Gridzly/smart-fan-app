// Import Firebase services
import { auth, db } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Get DOM elements
const loginForm = document.getElementById("loginForm");
const googleBtn = document.getElementById("googleLoginBtn");

/* ----------------------------- EMAIL + PASSWORD LOGIN ----------------------------- */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // Redirect to dashboard if login succeeds
      window.location.href = "dashboard.html";
    })
    .catch((err) => alert(err.message));
});

/* ----------------------------- GOOGLE BUTTON TRIGGER ONLY ----------------------------- */
googleBtn.addEventListener("click", () => {
  // Just trigger something without Firebase auth
  console.log("Google button clicked!");
  alert("Button triggered successfully!");

  // Example: redirect to dashboard without signing in
  window.location.href = "dashboard.html";
});
