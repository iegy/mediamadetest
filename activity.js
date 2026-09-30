import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { roleLabel } from "./permissions.js";
import { t, getLang } from "./i18n.js";
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allEntries = [];
const tbody = document.getElementById("activity-tbody");
const searchInput = document.getElementById("search-input");

initAppShell(() => {
  watchActivity();
});

document.addEventListener("mm:langchange", renderTable);

function watchActivity() {
  const q = query(collection(db, "activity"), orderBy("createdAt", "desc"), limit(300));
  onSnapshot(
    q,
    (snap) => {
      allEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="3">${t("err_save_generic")}${err.message}</td></tr>`;
    }
  );
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatTime(entry) {
  if (!entry.createdAt || !entry.createdAt.toDate) return "—";
  const d = entry.createdAt.toDate();
  return new Intl.DateTimeFormat(getLang() === "en" ? "en-US" : "ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function renderTable() {
  const term = (searchInput.value || "").trim().toLowerCase();
  const filtered = term
    ? allEntries.filter((e) =>
        [e.actorName, t(e.action), e.entityLabel].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
    : allEntries;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="3">${t("empty_no_activity")}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(e.actorName || "—")} <span style="color:var(--ink-muted); font-size:12px;">(${roleLabel(e.actorRole)})</span></td>
      <td>${t(e.action)}${e.entityLabel ? " — " + escapeHtml(e.entityLabel) : ""}</td>
      <td>${formatTime(e)}</td>
    `;
    tbody.appendChild(tr);
  });
}

searchInput.addEventListener("input", renderTable);
