import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
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

let allExpenses = [];
let allProjects = [];
let editingId = "";

const tbody = document.getElementById("expenses-tbody");
const searchInput = document.getElementById("search-input");
const addBtn = document.getElementById("add-expense-btn");
const statTotal = document.getElementById("stat-total-expenses");

const modal = document.getElementById("expense-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("expense-form");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");

const fId = document.getElementById("expense-id");
const fName = document.getElementById("f-name");
const fAmount = document.getElementById("f-amount");
const fDate = document.getElementById("f-date");
const fCategory = document.getElementById("f-category");
const fProject = document.getElementById("f-project");
const fNotes = document.getElementById("f-notes");

initAppShell(() => {
  loadProjects();
  watchExpenses();
});

document.addEventListener("mm:langchange", () => {
  loadProjects();
  renderTable();
  modalTitle.textContent = editingId ? t("modal_title_edit_expense") : t("modal_title_new_expense");
});

async function loadProjects() {
  const snap = await getDocs(collection(db, "projects"));
  allProjects = snap.docs.map((d) => ({ id: d.id, label: `${d.data().clientName || ""} — ${d.data().service || ""}` }));
  const selected = fProject.value;
  fProject.innerHTML = `<option value="">${t("option_no_project")}</option>`;
  allProjects.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    fProject.appendChild(opt);
  });
  if (selected) fProject.value = selected;
}

function watchExpenses() {
  const q = query(collection(db, "expenses"), orderBy("date", "desc"));
  onSnapshot(
    q,
    (snap) => {
      allExpenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const total = allExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  statTotal.textContent = total.toLocaleString("en-US");

  const term = (searchInput.value || "").trim().toLowerCase();
  const filtered = term
    ? allExpenses.filter((e) =>
        [e.name, e.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
    : allExpenses;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${
      allExpenses.length === 0 ? t("empty_no_expenses") : t("empty_no_results")
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(e.name || "—")}</td>
      <td>${escapeHtml(e.category || "—")}</td>
      <td>${(Number(e.amount) || 0).toLocaleString("en-US")}</td>
      <td>${escapeHtml(e.date || "—")}</td>
      <td>${escapeHtml(e.projectLabel || "—")}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit" data-id="${e.id}">${t("btn_edit")}</button>
        <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${e.id}">${t("btn_delete")}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.id)));
  tbody.querySelectorAll('[data-action="delete"]').forEach((b) => b.addEventListener("click", () => handleDelete(b.dataset.id)));
}

searchInput.addEventListener("input", renderTable);

// ---------- Modal ----------

function openAdd() {
  form.reset();
  fId.value = "";
  editingId = "";
  fDate.value = new Date().toISOString().slice(0, 10);
  modalTitle.textContent = t("modal_title_new_expense");
  formError.textContent = "";
  modal.hidden = false;
}

function openEdit(id) {
  const e = allExpenses.find((x) => x.id === id);
  if (!e) return;
  fId.value = e.id;
  editingId = id;
  fName.value = e.name || "";
  fAmount.value = e.amount || "";
  fDate.value = e.date || "";
  fCategory.value = e.category || "";
  fProject.value = e.projectId || "";
  fNotes.value = e.notes || "";
  modalTitle.textContent = t("modal_title_edit_expense");
  formError.textContent = "";
  modal.hidden = false;
}

addBtn.addEventListener("click", openAdd);
cancelBtn.addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  formError.textContent = "";

  const name = fName.value.trim();
  if (!name) {
    formError.textContent = t("err_name_required");
    return;
  }

  const projectOpt = fProject.options[fProject.selectedIndex];
  const payload = {
    name,
    amount: fAmount.value ? Number(fAmount.value) : 0,
    date: fDate.value,
    category: fCategory.value.trim(),
    projectId: fProject.value || "",
    projectLabel: fProject.value ? projectOpt.textContent : "",
    notes: fNotes.value.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser ? auth.currentUser.uid : null,
  };

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = t("btn_saving");

  try {
    if (fId.value) {
      await updateDoc(doc(db, "expenses", fId.value), payload);
    } else {
      await addDoc(collection(db, "expenses"), {
        ...payload,
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
  const e = allExpenses.find((x) => x.id === id);
  const ok = confirm(t("confirm_delete_expense", { name: e ? e.name : "" }));
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "expenses", id));
  } catch (err) {
    alert(t("err_delete_generic") + err.message);
  }
}
