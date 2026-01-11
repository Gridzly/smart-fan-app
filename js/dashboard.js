import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, push, onValue, get, query, limitToLast }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ---------------- ELEMENTS ---------------- */
const welcomeMsg = document.getElementById("welcomeMsg");
const logoutBtn = document.getElementById("logoutBtn");
const usageHistoryList = document.getElementById("usageHistoryList");
const recentUsers = document.getElementById("recentUsers");
const statusText = document.getElementById("currentStatusText");
const statusBox = document.getElementById("statusBox");
const weatherContainer = document.getElementById("weatherContainer");
const toggleRecentBtn = document.getElementById("toggleRecentUsers");

/* ---------------- STATE ---------------- */
let currentUserName = "";
let currentUserRole = "";
let showAllRecentUsers = false;

/* ---------------- AUTH CHECK ---------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const snap = await get(ref(db, "users/" + user.uid));

  currentUserName = snap.exists() && snap.val().name
    ? snap.val().name
    : user.displayName || "Unknown User";

  currentUserRole = snap.exists() && snap.val().role
    ? snap.val().role
    : "User";

  welcomeMsg.textContent = `Welcome, ${currentUserName} (${currentUserRole})`;

  // LOG LOGIN
  const now = new Date();
  push(ref(db, "usageHistory"), {
    name: currentUserName,
    role: currentUserRole,
    action: "Logged In",
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
  });

  loadRecentUsers();
  loadHistory();
  loadHeatLevels();

  setInterval(loadHeatLevels, 5 * 60 * 1000);
});

/* ---------------- RECENT USERS ---------------- */
function loadRecentUsers() {
  const recentQuery = query(ref(db, "usageHistory"), limitToLast(100));

  onValue(recentQuery, (snapshot) => {
    recentUsers.innerHTML = "";

    const logins = [];

    snapshot.forEach(child => {
      const d = child.val();
      if (!d?.name || !d?.date || !d?.time) return;
      if (d.action !== "Logged In") return;

      const dateTime = new Date(`${d.date} ${d.time}`);
      logins.push({ ...d, dateTime });
    });

    logins.sort((a, b) => b.dateTime - a.dateTime);

    const grouped = {};
    logins.forEach(l => {
      if (!grouped[l.name]) grouped[l.name] = [];
      grouped[l.name].push(l);
    });

    const users = Object.entries(grouped);
    const visibleUsers = showAllRecentUsers ? users : users.slice(0, 4);

    visibleUsers.forEach(([name, records]) => {
      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.style.padding = "14px";
      li.style.marginBottom = "12px";
      li.style.borderRadius = "16px";
      li.style.background = "#96D9C0";
      li.style.boxShadow = "0 6px 18px rgba(0,0,0,.2)";

      let html = `<strong>${name}</strong><br>`;

      records.forEach((r, i) => {
        if (i === 0) {
          html += `<small style="opacity:.8">Latest: ${r.date} • ${r.time}</small><br>`;
        } else if (showAllRecentUsers) {
          html += `<small style="opacity:.6">${r.date} • ${r.time}</small><br>`;
        }
      });

      li.innerHTML = html;
      recentUsers.appendChild(li);
    });

    toggleRecentBtn.textContent = showAllRecentUsers ? "Hide" : "See More";
  });
}

/* ---------------- TOGGLE BUTTON ---------------- */
toggleRecentBtn.addEventListener("click", () => {
  showAllRecentUsers = !showAllRecentUsers;
  loadRecentUsers();
});

/* ---------------- USAGE HISTORY ---------------- */
function loadHistory() {
  onValue(ref(db, "usageHistory"), (snapshot) => {
    usageHistoryList.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns =
      window.innerWidth < 768 ? "1fr" : "1fr 1fr";
    wrapper.style.gap = "16px";

    const onCol = createColumn("#96D9C0", "FAN ON HISTORY");
    const offCol = createColumn("#96D9C0", "FAN OFF HISTORY");

    let latestStatus = "OFF";

    snapshot.forEach(child => {
      const d = child.val();
      if (!d?.action || !d?.date || !d?.time) return;

      const isON = d.action.toUpperCase().includes("ON");
      const isOFF = d.action.toUpperCase().includes("OFF");
      if (!isON && !isOFF) return;

      latestStatus = isON ? "ON" : "OFF";

      const card = document.createElement("div");
      card.style.background = isON ? "#A8E6CF" : "#FFB3B3";
      card.style.borderRadius = "14px";
      card.style.padding = "12px";
      card.style.marginBottom = "10px";

      card.innerHTML = `
        <strong>${d.name || "Arduino R4"}</strong><br>
        Fan ${isON ? "ON" : "OFF"}<br>
        <small style="opacity:.7">${d.date} • ${d.time}</small>
      `;

      isON ? onCol.appendChild(card) : offCol.appendChild(card);
    });

    statusText.textContent = latestStatus;
    statusText.style.color =
      latestStatus === "ON" ? "#16a34a" : "#dc2626";
    statusBox.style.borderLeft =
      `6px solid ${latestStatus === "ON" ? "#16a34a" : "#dc2626"}`;

    wrapper.appendChild(onCol);
    wrapper.appendChild(offCol);
    usageHistoryList.appendChild(wrapper);
  });
}

/* ---------------- COLUMN HELPER ---------------- */
function createColumn(bg, title) {
  const col = document.createElement("div");
  col.style.background = bg;
  col.style.borderRadius = "18px";
  col.style.padding = "14px";
  col.style.boxShadow = "0 6px 20px rgba(0,0,0,.2)";
  col.style.maxHeight = "420px";
  col.style.overflowY = "auto";

  const h = document.createElement("h3");
  h.textContent = title;
  h.style.textAlign = "center";
  col.appendChild(h);

  return col;
}

/* ---------------- WEATHER ---------------- */
const API_KEY = "8387b43714e736b0d4296517564e1201";
const LAT = 14.4297;
const LON = 120.9367;

async function loadHeatLevels() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`
    );
    const data = await res.json();

    weatherContainer.innerHTML = "";
    const now = new Date();
    const currentHour = now.getHours();

    // LAST 5 HOURS INCLUDING CURRENT
    const hoursToShow = [];
    for (let i = 0; i < 5; i++) {
      hoursToShow.push((currentHour - i + 24) % 24);
    }

    hoursToShow.forEach(h => {
      const item = data.list.reduce((prev, curr) => {
        const forecastHour = new Date(curr.dt_txt).getHours();
        return Math.abs(forecastHour - h) < Math.abs(new Date(prev.dt_txt).getHours() - h) ? curr : prev;
      }, data.list[0]);

      const hr12 = ((h + 11) % 12) + 1;
      const ampm = h >= 12 ? "PM" : "AM";

      const card = document.createElement("div");
      card.classList.add("card"); // use existing CSS
      card.innerHTML = `
        <div style="font-weight:600; margin-bottom:4px;">${hr12}:00 ${ampm}</div>
        <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" width="40" style="filter: hue-rotate(200deg) brightness(1.2);">
        <div style="font-weight:700; margin-top:4px;">${item.main.temp.toFixed(1)}°C</div>
      `;

      weatherContainer.appendChild(card);
    });

  } catch (e) {
    weatherContainer.innerHTML = "Failed to load weather";
  }
}

/* ---------------- LOGOUT ---------------- */
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "index.html");
});
