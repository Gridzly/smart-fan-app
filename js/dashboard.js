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

let currentUserName = "";
let currentUserRole = "";
let fanStatus = "OFF";

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

  // Log login
  const now = new Date();
  push(ref(db, "usageHistory"), {
    name: currentUserName,
    role: currentUserRole,
    action: "Logged In",
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  });

  loadHistory();
  loadRecentUsers();
  loadHeatLevels();
});

/* ---------------- RECENT USERS ---------------- */
function loadRecentUsers() {
  const recentQuery = query(ref(db, "usageHistory"), limitToLast(25));
  onValue(recentQuery, (snapshot) => {
    recentUsers.innerHTML = "";
    const userMap = new Map();

    snapshot.forEach(child => {
      const d = child.val();
      if (!d?.name || !d?.date || !d?.time) return;
      if (d.action !== "Logged In") return;
      if (!userMap.has(d.name) || new Date(`${d.date} ${d.time}`) > new Date(`${userMap.get(d.name).date} ${userMap.get(d.name).time}`)) {
        userMap.set(d.name, { date: d.date, time: d.time });
      }
    });

    [...userMap.entries()].reverse().forEach(([name, info]) => {
      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.style.marginBottom = "12px";
      li.style.padding = "14px";
      li.style.borderRadius = "16px";
      li.style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";
      li.style.background = "#96D9C0";
      li.style.color = "#000000";
      li.innerHTML = `<strong>${name}</strong><br><small style="opacity:0.7">${info.date} • ${info.time}</small>`;
      recentUsers.appendChild(li);
    });
  });
}

/* ---------------- USAGE HISTORY ---------------- */
function loadHistory() {
  onValue(ref(db, "usageHistory"), (snapshot) => {
    usageHistoryList.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns = window.innerWidth < 768 ? "1fr" : "1fr 1fr";
    wrapper.style.gap = "16px";

    const onCol = createColumn("#96D9C0", "FAN ON HISTORY");
    const offCol = createColumn("#96D9C0", "FAN OFF HISTORY");

    let latestFanStatus = "OFF";

    snapshot.forEach(child => {
      const d = child.val();
      if (!d?.action || !d?.date || !d?.time) return;
      const isON = d.action.toUpperCase().includes("ON");
      const isOFF = d.action.toUpperCase().includes("OFF");
      if (!isON && !isOFF) return;
      latestFanStatus = isON ? "ON" : "OFF";

      const card = document.createElement("div");
      card.style.background = isON ? "#A8E6CF" : "#FFB3B3";
      card.style.borderRadius = "14px";
      card.style.padding = "12px";
      card.style.marginBottom = "10px";
      card.innerHTML = `<strong>${d.name || "Arduino R4"}</strong><br>Fan ${isON ? "ON" : "OFF"}<br><small style="opacity:0.7">${d.date} • ${d.time}</small>`;
      isON ? onCol.appendChild(card) : offCol.appendChild(card);
    });

    statusText.textContent = latestFanStatus;
    statusText.style.color = latestFanStatus === "ON" ? "#16a34a" : "#dc2626";
    statusBox.style.borderLeft = `6px solid ${latestFanStatus === "ON" ? "#16a34a" : "#dc2626"}`;

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
  col.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
  col.style.maxHeight = "420px";
  col.style.overflowY = "auto";

  const h = document.createElement("h3");
  h.textContent = title;
  h.style.textAlign = "center";
  h.style.color = "#000000";
  h.style.marginBottom = "12px";
  col.appendChild(h);

  return col;
}

/* ---------------- HOURLY HEAT / TEMPERATURE ---------------- */
const API_KEY = "8387b43714e736b0d4296517564e1201";
const LAT = 14.43;
const LON = 120.95;
const UNITS = "metric";

async function loadHeatLevels() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=${UNITS}&appid=${API_KEY}`
    );
    if (!res.ok) throw new Error("Failed to fetch weather data");
    const data = await res.json();

    weatherContainer.innerHTML = "";

    const now = new Date();
    const currentHour = now.getHours();
    const hoursToShow = [];
    for (let i = 5; i >= 1; i--) {
      hoursToShow.push((currentHour - i + 24) % 24);
    }

    hoursToShow.forEach(hour => {
      const hourData = data.list.reduce((prev, curr) => {
        const forecastHour = new Date(curr.dt_txt).getHours();
        return Math.abs(forecastHour - hour) < Math.abs(new Date(prev.dt_txt).getHours() - hour) ? curr : prev;
      }, data.list[0]);

      const temp = hourData.main.temp;
      const desc = hourData.weather[0].main;
      const icon = `https://openweathermap.org/img/wn/${hourData.weather[0].icon}@2x.png`;

      const hour12 = ((hour + 11) % 12) + 1;
      const ampm = hour >= 12 ? "PM" : "AM";

      const card = document.createElement("div");
      card.style.background = "#d1fae5";
      card.style.borderRadius = "14px";
      card.style.padding = "12px";
      card.style.textAlign = "center";
      card.style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)";
      card.style.flex = "1";
      card.style.minWidth = "0";

      card.innerHTML = `<strong>${hour12}:00 ${ampm}</strong><br>
                        <img src="${icon}" style="width:40px;height:40px;"><br>
                        <span style="font-weight:bold;">${temp.toFixed(1)}°C</span><br>
                        <small>${desc}</small>`;

      weatherContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Heat API Error:", err);
    weatherContainer.innerHTML = "<p style='color:red;'>Failed to load heat data</p>";
  }
}

/* ---------------- LOGOUT ---------------- */
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "index.html");
});
