import { auth, db, googleProvider } from "./firebaseConfig.js";
import { signInWithEmailAndPassword, signInWithPopup } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set, get } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const loginForm = document.getElementById("loginForm");
const googleBtn = document.getElementById("googleLoginBtn");

/* EMAIL + PASSWORD LOGIN */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // Name already exists from signup → dashboard will read it
      window.location.href = "dashboard.html";
    })
    .catch((err) => alert(err.message));
});

/* GOOGLE LOGIN */
googleBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = ref(db, "users/" + user.uid);
    const snapshot = await get(userRef);

    // Save ONLY if user does not exist
    if (!snapshot.exists()) {
      await set(userRef, {
        name: user.displayName,
        email: user.email,
        role: "Google User"
      });
    }

    window.location.href = "dashboard.html";
  } catch (err) {
    alert(err.message);
  }
});