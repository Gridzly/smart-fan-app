import { auth, db } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("signupForm");

  if (!form) {
    console.error("signupForm not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔹 SAFE idNo handling (HTML does not have it)
    const idNoInput = document.getElementById("idNo");
    const idNo = idNoInput ? idNoInput.value.trim() : "";

    let name = document.getElementById("name").value.trim();
    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!name) name = "User";

    if (password.length < 8) {
      alert("Password must be at least 8 characters!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      await set(ref(db, "users/" + uid), {
        idNo: idNo,
        name: name,
        role: role,
        email: email,
        createdAt: new Date().toISOString()
      });

      alert("Account created successfully!");
      window.location.href = "index.html";

    } catch (err) {
      alert(err.message);
      console.error(err);
    }
  });

});
