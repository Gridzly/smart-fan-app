import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set, push, onValue, get } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const welcomeMsg = document.getElementById("welcomeMsg");
const fanBtn = document.getElementById("fanBtn");
const logoutBtn = document.getElementById("logoutBtn");
const usageHistoryList = document.getElementById("usageHistoryList");
const recentUsers = document.getElementById("recentUsers");
const statusText = document.getElementById("currentStatusText");
const themeToggle = document.getElementById("themeToggle");

let currentUserName = "";
let fanStatus = "OFF";

/* ---------------- AUTH CHECK ---------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await get(ref(db, "users/" + user.uid));
  currentUserName =
  snap.exists() && snap.val().name
    ? snap.val().name
    : user.displayName
      ? user.displayName
      : "Unknown User";

  welcomeMsg.textContent = `Welcome, ${currentUserName}`;

  // Save login action with date and time
  const now = new Date();
  push(ref(db, "usageHistory"), {
    name: currentUserName,
    action: "Logged In",
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString()
  });

  loadFanStatus();
  loadHistory();
});

/* ---------------- FAN TOGGLE ---------------- */
fanBtn.addEventListener("click", () => {
  fanStatus = fanStatus === "OFF" ? "ON" : "OFF";

  fanBtn.classList.toggle("on", fanStatus === "ON");
  fanBtn.classList.toggle("off", fanStatus === "OFF");
  fanBtn.textContent = fanStatus === "ON" ? "Turn OFF" : "Turn ON";

  set(ref(db, "fanStatus"), {
    status: fanStatus,
    updatedBy: currentUserName,
    timestamp: new Date().toISOString()
  });

  saveUsage(`Fan ${fanStatus}`);
});

/* ---------------- SAVE HISTORY ---------------- */
function saveUsage(action) {
  const now = new Date();
  push(ref(db, "usageHistory"), {
    name: currentUserName,
    action,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString()
  });
}

/* ---------------- LOAD HISTORY ---------------- */
function loadHistory() {
  onValue(ref(db, "usageHistory"), (snapshot) => {
    usageHistoryList.innerHTML = "";
    recentUsers.innerHTML = "";

    const onColumn = document.createElement("div");
    const offColumn = document.createElement("div");
    onColumn.style.flex = "1";
    offColumn.style.flex = "1";
    onColumn.innerHTML = "<h4>Fan ON</h4>";
    offColumn.innerHTML = "<h4>Fan OFF</h4>";

    const usersMap = new Map(); // existing: last activity
    const loginHistoryMap = new Map(); // added: all login history

    snapshot.forEach((child) => {
      const d = child.val();

      /* -------- EXISTING LAST ACTIVE -------- */
      if (
        !usersMap.has(d.name) ||
        new Date(`${d.date} ${d.time}`) >
          new Date(`${usersMap.get(d.name).date} ${usersMap.get(d.name).time}`)
      ) {
        usersMap.set(d.name, { date: d.date, time: d.time });
      }

      /* -------- ADD: STORE LOGIN HISTORY -------- */
      if (d.action === "Logged In") {
        if (!loginHistoryMap.has(d.name)) {
          loginHistoryMap.set(d.name, []);
        }
        loginHistoryMap.get(d.name).push({
          date: d.date,
          time: d.time
        });
      }

      const div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.style.borderBottom = "1px solid rgba(0,0,0,0.1)";
      div.style.paddingBottom = "4px";
      div.innerHTML = `
        <strong>${d.name}</strong><br>
        ${d.action}<br>
        <small>${d.date} • ${d.time}</small>
      `;

      if (d.action.includes("ON")) {
        onColumn.appendChild(div);
      } else if (d.action.includes("OFF")) {
        offColumn.appendChild(div);
      }
    });

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "20px";
    container.appendChild(onColumn);
    container.appendChild(offColumn);
    usageHistoryList.appendChild(container);

    /* -------- RECENT USERS (CLEAN VIEW) -------- */
    usersMap.forEach((val, name) => {
      const li = document.createElement("li");

      const header = document.createElement("div");
      header.textContent = `${name} • ${val.date} • ${val.time}`;
      header.style.fontWeight = "600";

      const toggle = document.createElement("span");
      toggle.textContent = "See more";
      toggle.style.color = "#3498db";
      toggle.style.cursor = "pointer";
      toggle.style.display = "block";
      toggle.style.marginTop = "4px";

      const historyBox = document.createElement("div");
      historyBox.style.display = "none";
      historyBox.style.marginTop = "6px";

      if (loginHistoryMap.has(name)) {
        loginHistoryMap.get(name).forEach((e) => {
          const small = document.createElement("small");
          small.innerHTML = `${e.date} • ${e.time}<br>`;
          historyBox.appendChild(small);
        });
      }

      toggle.addEventListener("click", () => {
        const isOpen = historyBox.style.display === "block";
        historyBox.style.display = isOpen ? "none" : "block";
        toggle.textContent = isOpen ? "See more" : "Hide";
      });

      li.appendChild(header);
      li.appendChild(toggle);
      li.appendChild(historyBox);
      recentUsers.appendChild(li);
    });
  });
}

/* ---------------- FAN STATUS ---------------- */
function loadFanStatus() {
  onValue(ref(db, "fanStatus"), (snap) => {
    if (snap.exists()) {
      fanStatus = snap.val().status;
      statusText.textContent = fanStatus;
      fanBtn.textContent = fanStatus === "ON" ? "Turn OFF" : "Turn ON";
      fanBtn.classList.toggle("on", fanStatus === "ON");
      fanBtn.classList.toggle("off", fanStatus === "OFF");
    }
  });
}

const themeToggleInput = document.getElementById("themeToggle");
const themeLabel = document.querySelector(".switch-label");

// Initialize toggle based on current theme
themeToggleInput.checked = document.body.classList.contains("dark");
themeLabel.textContent = themeToggleInput.checked ? "NIGHT MODE" : "LIGHT MODE";

themeToggleInput.addEventListener("change", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    themeLabel.textContent = "NIGHT MODE";
  } else {
    themeLabel.textContent = "LIGHT MODE";
  }
});


/* ---------------- LOGOUT ---------------- */
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "login.html");
});
