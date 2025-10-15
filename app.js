// app.js — v0.5.2 (progress fix definitive + offline sync)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================
   🔧 Firebase Config (Fixed)
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
const appVersion = "0.5.2";

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
   Utils & Confetti
   ========================= */
const confettiContainer = document.getElementById("confetti-container");
function fireConfetti(n = 16) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.textContent = Math.random() > 0.5 ? "💗" : "💜";
    el.style.position = "absolute";
    el.style.left = Math.random() * 100 + "%";
    el.style.top = "-20px";
    el.style.fontSize = Math.random() * 1.2 + 0.8 + "rem";
    confettiContainer.appendChild(el);
    const duration = 2200 + Math.random() * 1500;
    el.animate(
      [
        { transform: "translate(0,0)", opacity: 1 },
        {
          transform: `translate(${Math.random() * 120 - 60}px, ${
            window.innerHeight + 80
          }px) rotate(${Math.random() * 720 - 360}deg)`,
          opacity: 0
        }
      ],
      { duration, easing: "ease-in-out" }
    ).onfinish = () => el.remove();
  }
}

/* =========================
   Local Cache + Offline Queue
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
   Render & Progress
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
      update(ref(db, `wishlist/${containerId}/${k}`), { checked }).catch(console.error);
      if (checked) fireConfetti(12);
    });

    div.querySelector(".delete-btn").addEventListener("click", () => {
      remove(ref(db, `wishlist/${containerId}/${k}`)).catch(console.error);
    });
  });
}

// ✅ Fix progress bar (now computed from Firebase data)
function updateProgressFromData(tab, data) {
  if (tab !== currentTab) return;
  const total = Object.keys(data || {}).length;
  const done = Object.values(data || {}).filter(v => v.checked).length;

  const text = document.getElementById("progress-text");
  const fill = document.getElementById("progress-fill");
  const context = document.getElementById("progress-context");

  if (context) {
    context.textContent = currentTab === "makan" ? "🍜 Tempat Makan" : "🌄 Tempat Wisata";
  }

  if (text) text.textContent = `${done} / ${total}`;
  if (fill) fill.style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
}

/* =========================
   UI Tabs & Search
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
   Realtime Sync (Progress + Render)
   ========================= */
function snapshotToObj(val) {
  return val || {};
}

onValue(makanRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("makan", data);
  updateProgressFromData("makan", data);
  renderList("makan", data, document.getElementById("search-input").value || "");
});

onValue(wisataRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("wisata", data);
  updateProgressFromData("wisata", data);
  renderList("wisata", data, document.getElementById("search-input").value || "");
});

/* =========================
   Seed Default Data
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
   Add context label to progress
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
   Init complete
   ========================= */
console.log("✅ Wishlist Cloud v" + appVersion + " loaded successfully");
