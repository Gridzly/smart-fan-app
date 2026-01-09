import { auth, db } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const passwordInput = document.getElementById("password");
  const strengthText = document.getElementById("passwordStrength");

  // Password strength checker
  function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[\W]/.test(password)) score++;

    if (score <= 2) return { text: "Weak", color: "#dc2626" };
    if (score === 3 || score === 4) return { text: "Medium", color: "#facc15" };
    if (score === 5) return { text: "Strong", color: "#16a34a" };
  }

  // Live indicator
  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    if (!val) {
      strengthText.textContent = "";
    } else {
      const { text, color } = getPasswordStrength(val);
      strengthText.textContent = text;
      strengthText.style.color = color;
    }
  });

  // Signup form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    if (!email.endsWith("@gmail.com")) {
      alert("Email must be a valid @gmail.com account!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await set(ref(db, "users/" + uid), {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        role,
        email
      });

      alert("Sign up successful!");
      window.location.href = "index.html";
    } catch (err) {
      alert("Signup failed: " + err.message);
      console.error(err);
    }
  });
});
