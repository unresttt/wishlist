// app.js (module)
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
  child
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* =========================
   Firebase config (you provided)
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDtuhghR2rpV360CGDBrQ0XXFvgHa7t7zg",
  authDomain: "wishlist-71fb9.firebaseapp.com",
  databaseURL: "https://wishlist-71fb9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wishlist-71fb9",
  storageBucket: "wishlist-71fb9.firebasestorage.app",
  messagingSenderId: "361109086271",
  appId: "1:361109086271:web:1da0caff0d52ec7f97988a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const appVersion = "0.4.0"; // bump when updating cloud schema / behavior

// ===============================
// Default data (same as previous local defaults)
const defaultMakan = [
  "Bakmi Ry (Concat)",
  "Sarangeui Oppa (Concat)",
  "Ayam Rempah Teh Sari (Amikom)",
  "Bakso Malang Cakmin (Embung Potorono)",
  "Doyan Es Teler (Seturan)",
  "Sate Kulit Jumbo Boemisae (Jakal)",
  "Ayam Presku (mana mana ad katanya 😆)",
  "Bebek Mbah Mangoen",
  "Geprek Mantul",
  "Lesehan Sumilir 2",
  "Baso Goreng GG",
  "Pempek Cik Ana",
  "Soto Cak Kadir (Krapyak)",
  "Wedang Tahu Bu Sukardi (Kranggan, Mirota)",
  "Mie Sohib",
  "Seafood Hunter",
  "Sego Yojo",
  "Sate Petir Pak Nano",
  "Kalbano Caffe & Eatery",
  "Tahu Gimbal Dilla",
  "Rizbakery & Coffee",
  "Pecel Lele Mbak Wiwi",
  "Katsu Panas Malam (Demangan)",
  "Bubur Hayam Bhinneka",
  "Mie Nyemek Bu Tri (Jakal)",
  "Warung Nasi Jinggo (Pogung)",
  "Kopi Dari Hati (Kaliurang)",
  "Warung Lesehan Prambanan",
  "Bakso & Mie Ayam Cak Man",
  "Sate Taichan Goreng",
  "Es Buah Segar Kridosono"
];

const defaultWisata = [
  "Potrobayan Camp (Bantul)",
  "Titik Nol Selokan Mataram (Mgl)",
  "Waterboom Jogja (Maguwo)",
  "Jembatan Pandansimo (Bantul)",
  "Gunung Andong (Mgl)",
  "Hutan Pinus Pengger",
  "HeHa Sky View",
  "Pantai Indrayanti",
  "Kalibiru Kulon Progo",
  "Tebing Breksi",
  "Candi Prambanan",
  "Kampung Wisata Taman Sari",
  "Bukit Bintang Patuk",
  "Goa Pindul (Gunungkidul)",
  "Bukit Paralayang Watugupit",
  "Kebun Teh Nglinggo",
  "Pantai Parangtritis",
  "Teras Kaca Nguluran",
  "Pinus Asri Imogiri",
  "Malioboro Night Walk"
];

// DB references
const rootRef = ref(db, "wishlist");
const makanRef = ref(db, "wishlist/makan");
const wisataRef = ref(db, "wishlist/wisata");

// Utils DOM
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

// Simple local helpers for migration & offline cache
function localExtrasKey(tab) { return `${tab}-extra`; }
function localCheckedKey(id) { return `checked-${id}`; }
function saveLocalCache(tab, itemsObj) {
  // itemsObj: { key: { name, checked } }
  localStorage.setItem(`cache-${tab}`, JSON.stringify(itemsObj));
}
function loadLocalCache(tab) {
  try { return JSON.parse(localStorage.getItem(`cache-${tab}`) || "{}"); }
  catch(e){ return {}; }
}

// Render functions
function renderList(containerId, itemsObj, filter = "") {
  const section = document.getElementById(containerId);
  section.innerHTML = "";
  const keys = Object.keys(itemsObj || {});
  const normalizedFilter = filter.trim().toLowerCase();
  keys.forEach((k) => {
    const item = itemsObj[k];
    if (!item || !item.name) return;
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

    // checkbox change -> update DB
    div.querySelector("input").addEventListener("change", (e) => {
      const checked = e.target.checked;
      update(ref(db, `wishlist/${containerId}/${k}`), { checked: !!checked })
        .catch((err)=> console.error("update checked err", err));
      if (checked) fireConfetti(14);
    });

    // delete button
    div.querySelector(".delete-btn").addEventListener("click", () => {
      remove(ref(db, `wishlist/${containerId}/${k}`))
        .catch((err)=> console.error("remove err", err));
    });
  });

  updateProgress(containerId);
}

// Progress update
function updateProgress(tabId) {
  const section = document.getElementById(tabId);
  const items = Array.from(section.querySelectorAll(".item"));
  const total = items.length;
  const done = items.filter((it) => it.querySelector("input").checked).length;
  const text = document.getElementById("progress-text");
  const fill = document.getElementById("progress-fill");
  if (text) text.textContent = `${done} / ${total}`;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (fill) fill.style.width = pct + "%";
}

// UI: Tabs, search, add buttons
let currentTab = "makan";
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
    currentTab = btn.dataset.tab;
    document.querySelectorAll(".input-area").forEach((area) => {
      area.style.display = area.dataset.tab === currentTab ? "flex" : "none";
    });
    updateProgress(currentTab);
  });
});

const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", (e) => {
  const q = e.target.value || "";
  // re-render from cache (we keep latest DB snapshot in cache-*)
  const cache = loadLocalCache(currentTab);
  renderList(currentTab, cache, q);
});

// Add item push to DB
async function addNewItemToDb(tab, name) {
  if (!name || !name.trim()) return;
  const targetRef = tab === "makan" ? makanRef : wisataRef;
  // push object { name, checked:false, created:timestamp }
  await push(targetRef, { name: name.trim(), checked: false, created: Date.now() });
}

// Add button listeners
document.getElementById("add-makan").addEventListener("click", async () => {
  const v = document.getElementById("input-makan").value.trim();
  if (!v) return;
  document.getElementById("input-makan").value = "";
  addNewItemToDb("makan", v);
});
document.getElementById("add-wisata").addEventListener("click", async () => {
  const v = document.getElementById("input-wisata").value.trim();
  if (!v) return;
  document.getElementById("input-wisata").value = "";
  addNewItemToDb("wisata", v);
});

// Theme toggle (persist)
const themeToggle = document.getElementById("theme-toggle");
function applyTheme(mode) {
  if (mode === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");
  localStorage.setItem("theme", mode);
  themeToggle.textContent = mode === "dark" ? "☀️" : "🌙";
}
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);
themeToggle.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
});

// ===============================
// Realtime listeners: keep local cache + render on changes
// ===============================
function snapshotToObj(snapshotVal) {
  // DB may be { key1: {name,checked}, key2: ... } or null
  return snapshotVal || {};
}

onValue(makanRef, (snap) => {
  const data = snapshotToObj(snap.val());
  // save to local cache and render (search uses cache)
  saveLocalCache("makan", data);
  // if current tab filter active apply search
  const q = document.getElementById("search-input").value || "";
  renderList("makan", data, q);
});
onValue(wisataRef, (snap) => {
  const data = snapshotToObj(snap.val());
  saveLocalCache("wisata", data);
  const q = document.getElementById("search-input").value || "";
  renderList("wisata", data, q);
});

// ===============================
// First-time DB seeding & Local -> Cloud migration
// - If DB empty, seed defaults.
// - If localStorage had extras (from older local version), push them and preserve checked states.
// ===============================
async function seedIfEmpty() {
  try {
    const rootSnap = await get(rootRef);
    const val = rootSnap.exists() ? rootSnap.val() : null;
    const makanVal = val && val.makan ? val.makan : null;
    const wisataVal = val && val.wisata ? val.wisata : null;

    if (!makanVal) {
      // seed default makan
      for (const name of defaultMakan) {
        await push(makanRef, { name, checked: false, created: Date.now() });
      }
    }
    if (!wisataVal) {
      for (const name of defaultWisata) {
        await push(wisataRef, { name, checked: false, created: Date.now() });
      }
    }

    // migrate local extras -> cloud (only once)
    const migratedKey = "cloudMigrated";
    if (!localStorage.getItem(migratedKey)) {
      // try read older local extras and checked flags
      for (const tab of ["makan", "wisata"]) {
        const extras = JSON.parse(localStorage.getItem(`${tab}-extra`) || "[]");
        // push extras
        for (const ex of extras) {
          await push(ref(db, `wishlist/${tab}`), { name: ex, checked: false, created: Date.now() });
        }
        // also migrate individual checked flags saved under keys like "makan-0" earlier: best-effort - skip complex mapping
      }
      localStorage.setItem(migratedKey, "1");
    }
  } catch (err) {
    console.error("seedIfEmpty error", err);
  }
}

// run seeding & migration once on startup
seedIfEmpty().catch((e)=>console.error(e));

// expose some helpers for debugging (optional)
window.__WISH_DBG = {
  db, rootRef, makanRef, wisataRef
};

// done
console.log("Wishlist Cloud client initialized (v" + appVersion + ")");
