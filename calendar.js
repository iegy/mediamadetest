import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { t, getLang } from "./i18n.js";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allProjects = [];
let viewYear, viewMonth; // viewMonth: 0-11

const today = new Date();
viewYear = today.getFullYear();
viewMonth = today.getMonth();

const weekdaysEl = document.getElementById("cal-weekdays");
const gridEl = document.getElementById("cal-grid");
const monthLabelEl = document.getElementById("cal-month-label");

initAppShell((profile) => {
  watchProjects(profile.role);
});

document.getElementById("cal-prev").addEventListener("click", () => { shiftMonth(-1); });
document.getElementById("cal-next").addEventListener("click", () => { shiftMonth(1); });
document.getElementById("cal-today").addEventListener("click", () => {
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  render();
});

document.addEventListener("mm:langchange", render);

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
}

function watchProjects(role) {
  let q;
  if (role === "production") {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    q = query(collection(db, "projects"), where("teamIds", "array-contains", uid || "__none__"));
  } else {
    q = collection(db, "projects");
  }
  onSnapshot(
    q,
    (snap) => {
      allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    },
    () => { allProjects = []; render(); }
  );
}

function locale() {
  return getLang() === "en" ? "en-US" : "ar-EG";
}

function buildEventsMap() {
  const map = {};
  allProjects.forEach((p) => {
    if (p.shootDate) {
      (map[p.shootDate] = map[p.shootDate] || []).push({ type: "shoot", project: p });
    }
    if (p.deliveryDate) {
      (map[p.deliveryDate] = map[p.deliveryDate] || []).push({ type: "delivery", project: p });
    }
  });
  return map;
}

function render() {
  renderWeekdayHeaders();
  renderMonthLabel();
  renderGrid();
}

function renderWeekdayHeaders() {
  weekdaysEl.innerHTML = "";
  // 2023-01-01 كان الأحد، بنستخدمه كمرجع ثابت لأسماء أيام الأسبوع بالترتيب الصحيح باللغة الحالية
  const fmt = new Intl.DateTimeFormat(locale(), { weekday: "short" });
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(2023, 0, 1 + i));
    const el = document.createElement("div");
    el.className = "cal-weekday";
    el.textContent = fmt.format(d);
    weekdaysEl.appendChild(el);
  }
}

function renderMonthLabel() {
  const fmt = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" });
  monthLabelEl.textContent = fmt.format(new Date(viewYear, viewMonth, 1));
}

function pad2(n) { return String(n).padStart(2, "0"); }

function renderGrid() {
  gridEl.innerHTML = "";
  const eventsMap = buildEventsMap();

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day is-empty";
    gridEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    const cell = document.createElement("div");
    cell.className = "cal-day" + (iso === todayIso ? " is-today" : "");

    const num = document.createElement("div");
    num.className = "cal-day-num";
    num.textContent = day;
    cell.appendChild(num);

    (eventsMap[iso] || []).forEach((ev) => {
      const pill = document.createElement("div");
      pill.className = `cal-event ${ev.type}`;
      pill.textContent = ev.project.clientName || "—";
      pill.title = `${ev.type === "shoot" ? t("legend_shoot") : t("legend_delivery")} — ${ev.project.clientName || ""}${ev.project.shootLocation ? " · " + ev.project.shootLocation : ""}`;
      pill.addEventListener("click", () => {
        window.location.href = `project-detail.html?id=${ev.project.id}`;
      });
      cell.appendChild(pill);
    });

    gridEl.appendChild(cell);
  }
}
