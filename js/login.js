import { auth, db } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email.endsWith("@gmail.com")) {
      alert("Email must be a valid @gmail.com account!");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const snapshot = await get(ref(db, "users/" + uid));
      if (!snapshot.exists()) {
        alert("User not found in database!");
        return;
      }

      const userData = snapshot.val();
      localStorage.setItem("role", userData.role);
      localStorage.setItem("name", userData.name);

      alert("Login successful!");
      // Redirect to dashboard in the same folder as index.html
      window.location.href = "dashboard.html";
    } catch (err) {
      alert("Login failed: " + err.message);
      console.error(err);
    }
  });
});
