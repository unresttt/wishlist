// app.js — versi fix + offline autosync

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================
   🔧 Firebase config — FIXED
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDtuhghR2rpV360CGDBrQ0XXFvgHa7t7zg",
  authDomain: "wishlist-71fb9.firebaseapp.com",
  databaseURL: "https://wishlist-71fb9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wishlist-71fb9",
  storageBucket: "wishlist-71fb9.appspot.com", // ✅ fixed domain
  messagingSenderId: "361109086271",
  appId: "1:361109086271:web:1da0caff0d52ec7f97988a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const appVersion = "0.5.0-offline";

/* =========================
   Default data
   ========================= */
const defaultMakan = [
  "Bakmi Ry (Concat)", "Sarangeui Oppa (Concat)", "Ayam Rempah Teh Sari (Amikom)",
  "Bakso Malang Cakmin (Embung Potorono)", "Doyan Es Teler (Seturan)", "Sate Kulit Jumbo Boemisae (Jakal)"
];
const defaultWisata = [
  "Potrobayan Camp (Bantul)", "Waterboom Jogja (Maguwo)", "Gunung Andong (Mgl)",
  "Hutan Pinus Pengger", "HeHa Sky View", "Pantai Indrayanti"
];

// DB refs
const rootRef = ref(db, "wishlist");
const makanRef = ref(db, "wishlist/makan");
const wisataRef = ref(db, "wishlist/wisata");

/* =========================
   Confetti effect
   ========================= */
const confettiContainer = document.getElementById("confetti-container");
function fireConfetti(n = 18) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.textContent = Math.random() > 0.5 ? "💗" : "💜";
    el.style.position = "absolute";
    el.style.left = Math.random() * 100 + "%";
    el.style.top = "-20px";
    el.style.fontSize = Math.random() * 1.3 + 0.9 + "rem";
    el.style.opacity = 0.95;
    confettiContainer.appendChild(el);
    const duration = 2200 + Math.random() * 1500;
    const translateX = Math.random() * 120 - 60;
    const rotate = Math.random() * 720 - 360;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        {
          transform: `translate(${translateX}px, ${window.innerHeight + 80}px) rotate(${rotate}deg)`,
          opacity: 0,
        },
      ],
      { duration, easing: "ease-in-out" }
    ).onfinish = () => el.remove();
  }
}

/* =========================
   Local cache + offline queue
   ========================= */
function saveLocalCache(tab, data) {
  localStorage.setItem(`cache-${tab}`, JSON.stringify(data));
}
function loadLocalCache(tab) {
  try {
    return JSON.parse(localStorage.getItem(`cache-${tab}`) || "{}");
  } catch {
    return {};
  }
}

// Queue untuk item yang ditambahkan saat offline
function addToOfflineQueue(tab, name) {
  const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
  queue.push({ tab, name, created: Date.now() });
  localStorage.setItem("offline-queue", JSON.stringify(queue));
  console.warn("💾 Disimpan offline:", name);
}
async function processOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
  if (!queue.length) return;
  console.log("🔁 Syncing", queue.length, "item dari offline queue...");
  for (const item of queue) {
    await push(ref(db, `wishlist/${item.tab}`), {
      name: item.name,
      checked: false,
      created: item.created
    });
  }
  localStorage.removeItem("offline-queue");
  console.log("✅ Semua item offline berhasil di-sync!");
}

/* =========================
   UI render
   ========================= */
function renderList(containerId, itemsObj, filter = "") {
  const section = document.getElementById(containerId);
  section.innerHTML = "";
  const keys = Object.keys(itemsObj || {});
  const normalizedFilter = filter.trim().toLowerCase();

  keys.forEach((k) => {
    const item = itemsObj[k];
    if (!item?.name) return;
    if (normalizedFilter && !item.name.toLowerCase().includes(normalizedFilter)) return;

    const div = document.createElement("div");
    div.className = "item";
    div.dataset.key = k;
    div.innerHTML = `
      <input type="checkbox" id="${containerId}-${k}" ${item.checked ? "checked" : ""}>
      <label for="${containerId}-${k}">${item.name}</label>
      <button class="delete-btn">&times;</button>
    `;
    section.appendChild(div);

    div.querySelector("input").addEventListener("change", (e) => {
      const checked = e.target.checked;
      update(ref(db, `wishlist/${containerId}/${k}`), { checked }).catch(console.error);
      if (checked) fireConfetti(14);
    });

    div.querySelector(".delete-btn").addEventListener("click", () => {
      remove(ref(db, `wishlist/${containerId}/${k}`)).catch(console.error);
    });
  });
  updateProgress(containerId);
}

function updateProgress(tabId) {
  const section = document.getElementById(tabId);
  const items = Array.from(section.querySelectorAll(".item"));
  const done = items.filter(it => it.querySelector("input").checked).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("progress-text").textContent = `${done} / ${total}`;
  document.getElementById("progress-fill").style.width = pct + "%";
}

/* =========================
   Tabs & search
   ========================= */
let currentTab = "makan";
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
    document.querySelectorAll(".input-area").forEach((a) => {
      a.style.display = a.dataset.tab === btn.dataset.tab ? "flex" : "none";
    });
    currentTab = btn.dataset.tab;
    updateProgress(currentTab);
  });
});

document.getElementById("search-input").addEventListener("input", (e) => {
  const q = e.target.value || "";
  renderList(currentTab, loadLocalCache(currentTab), q);
});

/* =========================
   Add new item (online/offline)
   ========================= */
async function addNewItem(tab, name) {
  if (!name.trim()) return;
  if (navigator.onLine) {
    await push(ref(db, `wishlist/${tab}`), { name, checked: false, created: Date.now() });
  } else {
    addToOfflineQueue(tab, name);
    const cache = loadLocalCache(tab);
    const tempKey = "temp-" + Date.now();
    cache[tempKey] = { name, checked: false };
    saveLocalCache(tab, cache);
    renderList(tab, cache);
  }
}

document.getElementById("add-makan").addEventListener("click", async () => {
  const v = document.getElementById("input-makan").value.trim();
  if (!v) return;
  document.getElementById("input-makan").value = "";
  addNewItem("makan", v);
});
document.getElementById("add-wisata").addEventListener("click", async () => {
  const v = document.getElementById("input-wisata").value.trim();
  if (!v) return;
  document.getElementById("input-wisata").value = "";
  addNewItem("wisata", v);
});

/* =========================
   Theme toggle
   ========================= */
const themeToggle = document.getElementById("theme-toggle");
function applyTheme(mode) {
  if (mode === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");
  localStorage.setItem("theme", mode);
  themeToggle.textContent = mode === "dark" ? "☀️" : "🌙";
}
applyTheme(localStorage.getItem("theme") || "light");
themeToggle.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
});

/* =========================
   Realtime listeners
   ========================= */
function snapshotToObj(snapshotVal) {
  return snapshotVal || {};
}
onValue(makanRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("makan", data);
  renderList("makan", data, document.getElementById("search-input").value || "");
});
onValue(wisataRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("wisata", data);
  renderList("wisata", data, document.getElementById("search-input").value || "");
});

/* =========================
   Seed default jika kosong
   ========================= */
async function seedIfEmpty() {
  try {
    const rootSnap = await get(rootRef);
    if (!rootSnap.exists()) {
      console.log("🌱 Seeding default data...");
      for (const name of defaultMakan)
        await push(makanRef, { name, checked: false, created: Date.now() });
      for (const name of defaultWisata)
        await push(wisataRef, { name, checked: false, created: Date.now() });
    }
  } catch (err) {
    console.error("seedIfEmpty error", err);
  }
}
seedIfEmpty().catch(console.error);

/* =========================
   Offline/online sync
   ========================= */
window.addEventListener("online", () => {
  document.getElementById("offline-message").style.display = "none";
  processOfflineQueue(); // ✅ sync otomatis
});
window.addEventListener("offline", () => {
  document.getElementById("offline-message").style.display = "block";
});

// Run on start
if (navigator.onLine) processOfflineQueue();
console.log("✅ Wishlist Cloud (offline-ready) v" + appVersion);
