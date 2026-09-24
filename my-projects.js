import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { projectStatusLabel, projectStatusGroup } from "./permissions.js";
import { t } from "./i18n.js";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let myProjects = [];
const tbody = document.getElementById("my-projects-tbody");

initAppShell(() => {
  watchMyProjects();
});

document.addEventListener("mm:langchange", renderTable);

function watchMyProjects() {
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  if (!uid) return;
  const q = query(collection(db, "projects"), where("teamIds", "array-contains", uid));
  onSnapshot(
    q,
    (snap) => {
      myProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${t("err_save_generic")}${err.message}</td></tr>`;
    }
  );
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderTable() {
  if (myProjects.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${t("empty_no_assigned_projects")}</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  myProjects.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.clientName || "—")}</td>
      <td>${escapeHtml(p.service || "—")}</td>
      <td>${escapeHtml(p.shootDate || "—")}</td>
      <td>${escapeHtml(p.shootLocation || "—")}</td>
      <td><span class="status-pill ${projectStatusGroup(p.status)}">${projectStatusLabel(p.status)}</span></td>
      <td><a class="icon-btn" href="project-detail.html?id=${p.id}">${t("btn_open_sheet")}</a></td>
    `;
    tbody.appendChild(tr);
  });
}
