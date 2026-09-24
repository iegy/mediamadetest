import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import {
  PROJECT_STATUS_KEYS, projectStatusLabel, projectStatusGroup,
  EDITING_STATUS_KEYS, editingStatusLabel,
} from "./permissions.js";
import { t } from "./i18n.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let currentRole = null;
let allProjects = [];
let allClients = [];
let allUsers = [];
let editingId = "";

const tbody = document.getElementById("projects-tbody");
const searchInput = document.getElementById("search-input");
const addBtn = document.getElementById("add-project-btn");

const modal = document.getElementById("project-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("project-form");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");

const fId = document.getElementById("project-id");
const fClient = document.getElementById("f-client");
const fService = document.getElementById("f-service");
const fValue = document.getElementById("f-value");
const fOwner = document.getElementById("f-owner");
const fStatus = document.getElementById("f-status");
const fStartDate = document.getElementById("f-start-date");
const fShootDate = document.getElementById("f-shoot-date");
const fDeliveryDate = document.getElementById("f-delivery-date");
const fLocation = document.getElementById("f-location");
const fTeam = document.getElementById("f-team");
const fEditingStatus = document.getElementById("f-editing-status");

initAppShell((profile) => {
  currentRole = profile.role;
  populateStatusSelects();
  loadClients();
  loadUsers();
  watchProjects();
});

document.addEventListener("mm:langchange", () => {
  populateStatusSelects();
  loadClients();
  renderTable();
  modalTitle.textContent = editingId ? t("modal_title_edit_project") : t("modal_title_new_project");
});

function populateStatusSelects() {
  const curStatus = fStatus.value;
  fStatus.innerHTML = "";
  PROJECT_STATUS_KEYS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = projectStatusLabel(s.key);
    fStatus.appendChild(opt);
  });
  if (curStatus) fStatus.value = curStatus;

  const curEStatus = fEditingStatus.value;
  fEditingStatus.innerHTML = "";
  EDITING_STATUS_KEYS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = editingStatusLabel(s.key);
    fEditingStatus.appendChild(opt);
  });
  if (curEStatus) fEditingStatus.value = curEStatus;
}

async function loadClients() {
  const snap = await getDocs(collection(db, "clients"));
  allClients = snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
  allClients.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const selected = fClient.value;
  fClient.innerHTML = `<option value="">${t("option_choose_client")}</option>`;
  allClients.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    fClient.appendChild(opt);
  });
  if (selected) fClient.value = selected;
}

async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  allUsers = snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
  allUsers.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  fOwner.innerHTML = `<option value="">${t("option_no_owner")}</option>`;
  allUsers.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    fOwner.appendChild(opt);
  });

  fTeam.innerHTML = "";
  allUsers.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    fTeam.appendChild(opt);
  });
}

function watchProjects() {
  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${t("err_save_generic")}${err.message}</td></tr>`;
    }
  );
}

function renderTable() {
  const term = (searchInput.value || "").trim().toLowerCase();
  const filtered = term
    ? allProjects.filter((p) =>
        [p.clientName, p.service].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
    : allProjects;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${
      allProjects.length === 0 ? t("empty_no_projects") : t("empty_no_results")
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.clientName || "—")}</td>
      <td>${escapeHtml(p.service || "—")}</td>
      <td>${p.projectValue ? Number(p.projectValue).toLocaleString("en-US") : "—"}</td>
      <td>${escapeHtml(p.shootDate || "—")}</td>
      <td>${escapeHtml(p.deliveryDate || "—")}</td>
      <td><span class="status-pill ${projectStatusGroup(p.status)}">${projectStatusLabel(p.status)}</span></td>
      <td class="row-actions">
        <a class="icon-btn" href="project-detail.html?id=${p.id}">${t("btn_details")}</a>
        <button class="icon-btn" data-action="edit" data-id="${p.id}">${t("btn_edit")}</button>
        <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${p.id}">${t("btn_delete")}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.id)));
  tbody.querySelectorAll('[data-action="delete"]').forEach((b) => {
    if (currentRole !== "management") { b.style.display = "none"; return; }
    b.addEventListener("click", () => handleDelete(b.dataset.id));
  });
}

searchInput.addEventListener("input", renderTable);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- Modal ----------

function openAdd() {
  form.reset();
  fId.value = "";
  editingId = "";
  fStatus.value = "brief";
  fEditingStatus.value = "pending";
  Array.from(fTeam.options).forEach((o) => { o.selected = false; });
  modalTitle.textContent = t("modal_title_new_project");
  formError.textContent = "";
  modal.hidden = false;
}

function openEdit(id) {
  const p = allProjects.find((x) => x.id === id);
  if (!p) return;
  fId.value = p.id;
  editingId = id;
  fClient.value = p.clientId || "";
  fService.value = p.service || "";
  fValue.value = p.projectValue || "";
  fOwner.value = p.ownerId || "";
  fStatus.value = p.status || "brief";
  fEditingStatus.value = p.editingStatus || "pending";
  fStartDate.value = p.startDate || "";
  fShootDate.value = p.shootDate || "";
  fDeliveryDate.value = p.deliveryDate || "";
  fLocation.value = p.shootLocation || "";
  const teamIds = p.teamIds || [];
  Array.from(fTeam.options).forEach((o) => { o.selected = teamIds.includes(o.value); });
  modalTitle.textContent = t("modal_title_edit_project");
  formError.textContent = "";
  modal.hidden = false;
}

addBtn.addEventListener("click", openAdd);
cancelBtn.addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  if (!fClient.value) {
    formError.textContent = t("err_choose_client");
    return;
  }

  const clientOpt = fClient.options[fClient.selectedIndex];
  const ownerOpt = fOwner.options[fOwner.selectedIndex];
  const teamSelected = Array.from(fTeam.selectedOptions);

  const payload = {
    clientId: fClient.value,
    clientName: clientOpt.textContent,
    service: fService.value.trim(),
    projectValue: fValue.value ? Number(fValue.value) : 0,
    ownerId: fOwner.value || "",
    ownerName: fOwner.value ? ownerOpt.textContent : "",
    status: fStatus.value,
    editingStatus: fEditingStatus.value,
    startDate: fStartDate.value,
    shootDate: fShootDate.value,
    deliveryDate: fDeliveryDate.value,
    shootLocation: fLocation.value.trim(),
    teamIds: teamSelected.map((o) => o.value),
    teamNames: teamSelected.map((o) => o.textContent),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser ? auth.currentUser.uid : null,
  };

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = t("btn_saving");

  try {
    if (fId.value) {
      await updateDoc(doc(db, "projects", fId.value), payload);
    } else {
      await addDoc(collection(db, "projects"), {
        ...payload,
        clientBrief: "",
        projectDetails: "",
        references: "",
        ideas: "",
        shotList: "",
        shootingDetails: "",
        notes: "",
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.uid : null,
      });
    }
    modal.hidden = true;
  } catch (err) {
    formError.textContent = t("err_save_generic") + err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t("btn_save");
  }
});

async function handleDelete(id) {
  const p = allProjects.find((x) => x.id === id);
  const ok = confirm(t("confirm_delete_project", { name: p ? p.clientName : "" }));
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "projects", id));
  } catch (err) {
    alert(t("err_delete_generic") + err.message);
  }
}
