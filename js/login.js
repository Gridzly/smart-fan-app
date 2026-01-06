import { auth, db } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const loginForm = document.getElementById("loginForm");

/* ----------------------------- EMAIL + PASSWORD LOGIN ----------------------------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Fetch the user data from the database
    const userRef = ref(db, "users/" + uid);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      alert("User not found in database!");
      return;
    }

    const userData = snapshot.val();
    console.log("User logged in with role:", userData.role);

    // Store role and name for dashboard use
    localStorage.setItem("role", userData.role);
    localStorage.setItem("name", userData.name);

    // Redirect to dashboard
    window.location.href = "dashboard.html";

  } catch (err) {
    alert(err.message);
  }
});
