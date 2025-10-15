// app.js — v0.5.3 (final stable build)
// ✅ Fix progress bar cross-tab bug
// ✅ Fix label mismatch (wisata/makan)
// ✅ Full Firebase sync + offline mode + theme toggle

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  update,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================
   🔧 Firebase Config
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDtuhghR2rpV360CGDBrQ0XXFvgHa7t7zg",
  authDomain: "wishlist-71fb9.firebaseapp.com",
  databaseURL: "https://wishlist-71fb9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wishlist-71fb9",
  storageBucket: "wishlist-71fb9.appspot.com",
  messagingSenderId: "361109086271",
  appId: "1:361109086271:web:1da0caff0d52ec7f97988a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const appVersion = "0.5.3";

/* =========================
   Default Data
   ========================= */
const defaultMakan = [
  "Bakmi Ry (Concat)", "Sarangeui Oppa (Concat)", "Ayam Rempah Teh Sari (Amikom)",
  "Bakso Malang Cakmin (Embung Potorono)", "Doyan Es Teler (Seturan)",
  "Sate Kulit Jumbo Boemisae (Jakal)", "Ayam Presku (mana mana ad katanya 😆)",
  "Bebek Mbah Mangoen", "Geprek Mantul", "Lesehan Sumilir 2"
];

const defaultWisata = [
  "Potrobayan Camp (Bantul)", "Titik Nol Selokan Mataram (Mgl)", "Waterboom Jogja (Maguwo)",
  "Jembatan Pandansimo (Bantul)", "Gunung Andong (Mgl)", "Hutan Pinus Pengger",
  "HeHa Sky View", "Pantai Indrayanti", "Kalibiru Kulon Progo", "Tebing Breksi"
];

const rootRef = ref(db, "wishlist");
const makanRef = ref(db, "wishlist/makan");
const wisataRef = ref(db, "wishlist/wisata");

/* =========================
   Utilities
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

function addToOfflineQueue(tab, name) {
  const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
  queue.push({ tab, name, created: Date.now() });
  localStorage.setItem("offline-queue", JSON.stringify(queue));
}

async function processOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
  if (!queue.length) return;
  for (const item of queue) {
    await push(ref(db, `wishlist/${item.tab}`), {
      name: item.name,
      checked: false,
      created: item.created
    });
  }
  localStorage.removeItem("offline-queue");
  console.log("✅ Offline data synced!");
}

/* =========================
   UI + Render
   ========================= */
let currentTab = "makan";

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
      <button class="delete-btn" title="Hapus">&times;</button>
    `;
    section.appendChild(div);

    div.querySelector("input").addEventListener("change", (e) => {
      const checked = e.target.checked;
      update(ref(db, `wishlist/${containerId}/${k}`), { checked });
    });

    div.querySelector(".delete-btn").addEventListener("click", () => {
      remove(ref(db, `wishlist/${containerId}/${k}`));
    });
  });
}

// ✅ Update progress hanya untuk tab aktif
function updateProgressFromData(tab, data) {
  if (tab !== currentTab) return;

  const total = Object.keys(data || {}).length;
  const done = Object.values(data || {}).filter(v => v.checked).length;

  const text = document.getElementById("progress-text");
  const fill = document.getElementById("progress-fill");
  const context = document.getElementById("progress-context");

  if (context) {
    context.textContent = tab === "makan" ? "🍜 Tempat Makan" : "🌄 Tempat Wisata";
  }

  if (text) text.textContent = `${done} / ${total}`;
  if (fill) fill.style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
}

/* =========================
   Tabs, Search & Add
   ========================= */
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

    // Update progress sesuai tab saat ini
    const cached = loadLocalCache(currentTab);
    updateProgressFromData(currentTab, cached);
  });
});

document.getElementById("search-input").addEventListener("input", (e) => {
  const q = e.target.value || "";
  renderList(currentTab, loadLocalCache(currentTab), q);
});

async function addNewItem(tab, name) {
  if (!name.trim()) return;
  if (navigator.onLine) {
    await push(ref(db, `wishlist/${tab}`), { name, checked: false, created: Date.now() });
  } else {
    addToOfflineQueue(tab, name);
    const cache = loadLocalCache(tab);
    cache["temp-" + Date.now()] = { name, checked: false };
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
   Theme Toggle
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
   Realtime Sync
   ========================= */
function snapshotToObj(val) {
  return val || {};
}

// ✅ Update progress hanya jika tab aktif
onValue(makanRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("makan", data);
  renderList("makan", data, document.getElementById("search-input").value || "");
  if (currentTab === "makan") updateProgressFromData("makan", data);
});

onValue(wisataRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("wisata", data);
  renderList("wisata", data, document.getElementById("search-input").value || "");
  if (currentTab === "wisata") updateProgressFromData("wisata", data);
});

/* =========================
   Seed Default Data
   ========================= */
async function seedIfEmpty() {
  const rootSnap = await get(rootRef);
  if (!rootSnap.exists()) {
    console.log("🌱 Seeding default data...");
    for (const name of defaultMakan)
      await push(makanRef, { name, checked: false, created: Date.now() });
    for (const name of defaultWisata)
      await push(wisataRef, { name, checked: false, created: Date.now() });
  }
}
seedIfEmpty();

/* =========================
   Offline Handling
   ========================= */
window.addEventListener("online", () => {
  document.getElementById("offline-message").style.display = "none";
  processOfflineQueue();
});
window.addEventListener("offline", () => {
  document.getElementById("offline-message").style.display = "block";
});
if (navigator.onLine) processOfflineQueue();

/* =========================
   Progress Label Context
   ========================= */
const progressWrap = document.querySelector(".progress-wrap");
if (progressWrap) {
  const ctx = document.createElement("div");
  ctx.id = "progress-context";
  ctx.style.fontSize = "0.8rem";
  ctx.style.marginBottom = "4px";
  ctx.style.color = "var(--muted)";
  progressWrap.insertBefore(ctx, progressWrap.firstChild);
}

/* =========================
   Done
   ========================= */
console.log("✅ Couple Wishlist Kita v" + appVersion + " loaded");
