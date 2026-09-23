import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { CLIENT_STATUSES, statusLabel, statusGroup } from "./permissions.js";
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
let allClients = [];

const tbody = document.getElementById("clients-tbody");
const searchInput = document.getElementById("search-input");
const addBtn = document.getElementById("add-client-btn");

const modal = document.getElementById("client-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("client-form");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");

const fId = document.getElementById("client-id");
const fName = document.getElementById("f-name");
const fPhone = document.getElementById("f-phone");
const fType = document.getElementById("f-type");
const fCompany = document.getElementById("f-company");
const fService = document.getElementById("f-service");
const fSource = document.getElementById("f-source");
const fOwner = document.getElementById("f-owner");
const fStatus = document.getElementById("f-status");
const fDate = document.getElementById("f-date");
const fNotes = document.getElementById("f-notes");

initAppShell((profile) => {
  currentRole = profile.role;
  // الحذف متاح للإدارة وإدارة العملاء بس
  const canDelete = currentRole === "management" || currentRole === "client_management";
  document.body.classList.toggle("can-delete", canDelete);

  populateStatusOptions();
  loadOwners();
  watchClients();
});

function populateStatusOptions() {
  fStatus.innerHTML = "";
  CLIENT_STATUSES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.key;
    opt.textContent = s.label;
    fStatus.appendChild(opt);
  });
}

async function loadOwners() {
  try {
    const snap = await getDocs(collection(db, "users"));
    snap.forEach((d) => {
      const data = d.data();
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = data.name || d.id;
      opt.dataset.name = data.name || "";
      fOwner.appendChild(opt);
    });
  } catch (err) {
    // لو مفيش صلاحية قراءة كل المستخدمين، الحقل يفضل بس "بدون تحديد"
    console.warn("تعذّر تحميل قائمة المسؤولين:", err);
  }
}

function watchClients() {
  const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      allClients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">تعذّر تحميل العملاء: ${err.message}</td></tr>`;
    }
  );
}

function renderTable() {
  const term = (searchInput.value || "").trim().toLowerCase();
  const filtered = term
    ? allClients.filter((c) =>
        [c.name, c.phone, c.service, c.companyName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      )
    : allClients;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${
      allClients.length === 0 ? "لسه مفيش عملاء، دوس على «+ عميل جديد» عشان تضيف أول عميل." : "مفيش نتائج مطابقة للبحث."
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.name || "—")}</td>
      <td>${escapeHtml(c.phone || "—")}</td>
      <td>${escapeHtml(c.service || "—")}</td>
      <td><span class="status-pill ${statusGroup(c.status)}">${statusLabel(c.status)}</span></td>
      <td>${escapeHtml(c.ownerName || "—")}</td>
      <td>${escapeHtml(c.firstContactDate || "—")}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit" data-id="${c.id}">تعديل</button>
        <button class="icon-btn icon-btn--danger delete-btn" data-action="delete" data-id="${c.id}">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id));
    const canDelete = currentRole === "management" || currentRole === "client_management";
    if (!canDelete) btn.style.display = "none";
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
  fStatus.value = "new";
  modalTitle.textContent = "عميل جديد";
  formError.textContent = "";
  modal.hidden = false;
}

function openEdit(id) {
  const c = allClients.find((x) => x.id === id);
  if (!c) return;
  fId.value = c.id;
  fName.value = c.name || "";
  fPhone.value = c.phone || "";
  fType.value = c.clientType || "";
  fCompany.value = c.companyName || "";
  fService.value = c.service || "";
  fSource.value = c.source || "";
  fOwner.value = c.ownerId || "";
  fStatus.value = c.status || "new";
  fDate.value = c.firstContactDate || "";
  fNotes.value = c.notes || "";
  modalTitle.textContent = "تعديل بيانات العميل";
  formError.textContent = "";
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

addBtn.addEventListener("click", openAdd);
cancelBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const name = fName.value.trim();
  if (!name) {
    formError.textContent = "اسم العميل مطلوب.";
    return;
  }

  const ownerOption = fOwner.options[fOwner.selectedIndex];
  const payload = {
    name,
    phone: fPhone.value.trim(),
    clientType: fType.value.trim(),
    companyName: fCompany.value.trim(),
    service: fService.value.trim(),
    source: fSource.value.trim(),
    ownerId: fOwner.value || "",
    ownerName: fOwner.value ? ownerOption.dataset.name || ownerOption.textContent : "",
    status: fStatus.value,
    firstContactDate: fDate.value,
    notes: fNotes.value.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser ? auth.currentUser.uid : null,
  };

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "جاري الحفظ...";

  try {
    if (fId.value) {
      await updateDoc(doc(db, "clients", fId.value), payload);
    } else {
      await addDoc(collection(db, "clients"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.uid : null,
      });
    }
    closeModal();
  } catch (err) {
    formError.textContent = "حصل خطأ أثناء الحفظ: " + err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ";
  }
});

async function handleDelete(id) {
  const c = allClients.find((x) => x.id === id);
  const ok = confirm(`متأكد إنك عايز تحذف "${c ? c.name : "العميل"}"؟ الخطوة دي مش قابلة للتراجع.`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "clients", id));
  } catch (err) {
    alert("تعذّر الحذف: " + err.message);
  }
}
