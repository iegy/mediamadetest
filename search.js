import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { statusLabel, statusGroup, projectStatusLabel, projectStatusGroup } from "./permissions.js";
import { t } from "./i18n.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allClients = [];
let allProjects = [];
let canSeeProjects = false;

const searchInput = document.getElementById("search-input");
const hintEl = document.getElementById("search-hint");
const noResultsEl = document.getElementById("no-results");
const clientsSection = document.getElementById("clients-section");
const projectsSection = document.getElementById("projects-section");
const clientsResults = document.getElementById("clients-results");
const projectsResults = document.getElementById("projects-results");

initAppShell((profile) => {
  const role = profile.role;
  if (["management", "client_management", "sales"].includes(role)) {
    onSnapshot(collection(db, "clients"), (snap) => {
      allClients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderResults();
    });
  }
  if (["management", "client_management"].includes(role)) {
    canSeeProjects = true;
    onSnapshot(collection(db, "projects"), (snap) => {
      allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderResults();
    });
  }
});

document.addEventListener("mm:langchange", renderResults);
searchInput.addEventListener("input", renderResults);

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderResults() {
  const term = (searchInput.value || "").trim().toLowerCase();

  if (!term) {
    hintEl.hidden = false;
    noResultsEl.hidden = true;
    clientsSection.hidden = true;
    projectsSection.hidden = true;
    return;
  }
  hintEl.hidden = true;

  const matchedClients = allClients.filter((c) =>
    [c.name, c.phone, c.service, statusLabel(c.status)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(term))
  );

  const matchedProjects = canSeeProjects
    ? allProjects.filter((p) =>
        [p.clientName, p.service, projectStatusLabel(p.status)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      )
    : [];

  clientsSection.hidden = matchedClients.length === 0;
  clientsResults.innerHTML = matchedClients.map((c) => `
    <tr>
      <td>${escapeHtml(c.name || "—")}</td>
      <td>${escapeHtml(c.phone || "—")}</td>
      <td>${escapeHtml(c.service || "—")}</td>
      <td><span class="status-pill ${statusGroup(c.status)}">${statusLabel(c.status)}</span></td>
      <td><a class="icon-btn" href="clients.html?edit=${c.id}">${t("btn_edit")}</a></td>
    </tr>
  `).join("");

  projectsSection.hidden = matchedProjects.length === 0;
  projectsResults.innerHTML = matchedProjects.map((p) => `
    <tr>
      <td>${escapeHtml(p.clientName || "—")}</td>
      <td>${escapeHtml(p.service || "—")}</td>
      <td><span class="status-pill ${projectStatusGroup(p.status)}">${projectStatusLabel(p.status)}</span></td>
      <td><a class="icon-btn" href="project-detail.html?id=${p.id}">${t("btn_details")}</a></td>
    </tr>
  `).join("");

  noResultsEl.hidden = !(matchedClients.length === 0 && matchedProjects.length === 0);
}
