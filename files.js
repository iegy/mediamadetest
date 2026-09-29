import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { t } from "./i18n.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allFiles = [];
const tbody = document.getElementById("files-tbody");
const searchInput = document.getElementById("search-input");

initAppShell(() => {
  watchFiles();
});

document.addEventListener("mm:langchange", renderTable);

function watchFiles() {
  onSnapshot(collection(db, "projects"), (snap) => {
    allFiles = [];
    snap.docs.forEach((d) => {
      const p = d.data();
      (p.files || []).forEach((f) => {
        allFiles.push({
          ...f,
          projectId: d.id,
          clientName: p.clientName || "",
          service: p.service || "",
        });
      });
    });
    allFiles.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    renderTable();
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderTable() {
  const term = (searchInput.value || "").trim().toLowerCase();
  const filtered = term
    ? allFiles.filter((f) =>
        [f.fileName, f.clientName, f.service].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
    : allFiles;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${
      allFiles.length === 0 ? t("empty_no_files_global") : t("empty_no_results")
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((f) => {
    const tr = document.createElement("tr");
    const dateDisplay = f.uploadedAt ? f.uploadedAt.slice(0, 10) : "—";
    tr.innerHTML = `
      <td>${escapeHtml(f.fileName)}</td>
      <td>${escapeHtml(f.clientName || "—")}</td>
      <td>${escapeHtml(f.service || "—")}</td>
      <td>${escapeHtml(dateDisplay)}</td>
      <td class="row-actions">
        <a class="icon-btn" href="${escapeHtml(f.webViewLink)}" target="_blank" rel="noopener">${t("open_in_drive")}</a>
        <a class="icon-btn" href="project-detail.html?id=${f.projectId}">${t("btn_open_sheet")}</a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

searchInput.addEventListener("input", renderTable);
