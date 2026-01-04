import { auth, db } from "./firebaseConfig.js"; 
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, push, onValue, get } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const welcomeMsg = document.getElementById("welcomeMsg");
const logoutBtn = document.getElementById("logoutBtn");
const usageHistoryList = document.getElementById("usageHistoryList");
const recentUsers = document.getElementById("recentUsers");
const statusText = document.getElementById("currentStatusText");
const themeToggle = document.getElementById("themeToggle");

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
  
  currentUserName =
    snap.exists() && snap.val().name
      ? snap.val().name
      : user.displayName
        ? user.displayName
        : "Unknown User";

  currentUserRole =
    snap.exists() && snap.val().role
      ? snap.val().role
      : "Unknown Role";

  // Display name AND role
  welcomeMsg.textContent = `Welcome, ${currentUserName} (${currentUserRole})`;

  // Save login action with date & time
  const now = new Date();
  push(ref(db, "usageHistory"), {
    name: currentUserName,
    role: currentUserRole,
    action: "Logged In",
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString()
  });

  loadHistory();
});

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

    const usersMap = new Map(); // last active users
    const loginHistoryMap = new Map(); // login history

    snapshot.forEach((child) => {
      const d = child.val();

      // Add last active user info
      if (
        !usersMap.has(d.name) ||
        new Date(`${d.date} ${d.time}`) >
          new Date(`${usersMap.get(d.name).date} ${usersMap.get(d.name).time}`)
      ) {
        usersMap.set(d.name, { date: d.date, time: d.time, role: d.role || "Unknown" });
      }

      // Store login history
      if (d.action === "Logged In") {
        if (!loginHistoryMap.has(d.name)) loginHistoryMap.set(d.name, []);
        loginHistoryMap.get(d.name).push({ date: d.date, time: d.time });
      }

      const div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.style.borderBottom = "1px solid rgba(0,0,0,0.1)";
      div.style.paddingBottom = "4px";

      // Only display date & time for automatic ESP32 logs or ON/OFF actions
      div.innerHTML = `
        <strong>${d.name} (${d.role || "Unknown"})</strong><br>
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

    /* -------- RECENT USERS -------- */
    usersMap.forEach((val, name) => {
      const li = document.createElement("li");

      const header = document.createElement("div");
      header.textContent = `${name} (${val.role}) • ${val.date} • ${val.time}`;
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
/* ---------------- FAN STATUS (ESP32 AUTOMATIC) ---------------- */
onValue(ref(db, "fanStatus"), (snap) => {
  if (!snap.exists()) return;

  const data = snap.val(); // { status, temperature, updatedBy }

  fanStatus = data.status;

  // Update status text
  statusText.textContent = fanStatus;

  // Update the status box color
  const statusBox = document.querySelector(".status-box");
  statusBox.classList.remove("on", "off");
  statusBox.classList.add(fanStatus.toLowerCase());

  // OPTIONAL: show ESP32 temperature if you have an element
  const espTempEl = document.getElementById("espTemp");
  if (espTempEl && data.temperature !== undefined) {
    espTempEl.textContent = `${data.temperature} °C`;
  }

  console.log("ESP32 AUTO:", fanStatus, "Temp:", data.temperature);
});


/* ---------------- THEME TOGGLE ---------------- */
const themeToggleInput = document.getElementById("themeToggle");
const themeLabel = document.querySelector(".switch-label");

themeToggleInput.checked = document.body.classList.contains("dark");
themeLabel.textContent = themeToggleInput.checked ? "NIGHT MODE" : "LIGHT MODE";

themeToggleInput.addEventListener("change", () => {
  document.body.classList.toggle("dark");
  themeLabel.textContent = document.body.classList.contains("dark")
    ? "NIGHT MODE"
    : "LIGHT MODE";
});

/* ---------------- WEATHER ---------------- */
const temperatureEl = document.getElementById("temperature");
const weatherConditionEl = document.getElementById("weatherCondition");
const OPENWEATHER_API_KEY = "8387b43714e736b0d4296517564e1201";
const CAVITE_LAT = 14.4586;
const CAVITE_LON = 120.9360;

async function loadCaviteWeather() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${CAVITE_LAT}&lon=${CAVITE_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const data = await res.json();
    if (data.cod !== 200) throw new Error(data.message);

    temperatureEl.textContent = `Temperature: ${Math.round(data.main.temp)} °C`;
    weatherConditionEl.textContent = `Condition: ${data.weather[0].description}`;
  } catch (err) {
    temperatureEl.textContent = "Temperature: Error";
    weatherConditionEl.textContent = "Condition: Unable to load";
    console.error("Weather error:", err.message);
  }
}

loadCaviteWeather();
setInterval(loadCaviteWeather, 300000);

/* ---------------- LOGOUT ---------------- */
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => (window.location.href = "index.html"));
});
