import { auth, db } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const form = document.getElementById("signupForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const idNo = document.getElementById("idNo").value.trim();
  let name = document.getElementById("name").value.trim();
  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // ❌ Fallback if name is empty
  if (!name) name = "User"; // default name

  if (password.length < 8) {
    alert("Password must be at least 8 characters!");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;

      // ✅ Save user info using UID
      set(ref(db, "users/" + uid), {
        idNo: idNo,
        name: name, // now guaranteed to have a value
        role: role,
        email: email,
        createdAt: new Date().toISOString()
      })
      .then(() => {
        alert("Account created successfully!");
        window.location.href = "index.html";
      });
    })
    .catch((err) => alert(err.message));
});
