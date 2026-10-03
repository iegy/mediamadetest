import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { roleLabel } from "./permissions.js";
import { t } from "./i18n.js";
import { logActivity } from "./activity-log.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

let allUsers = [];
let editingId = "";

const tbody = document.getElementById("users-tbody");
const addBtn = document.getElementById("add-user-btn");

const modal = document.getElementById("user-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("user-form");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");
const passwordField = document.getElementById("password-field");

const fId = document.getElementById("user-id");
const fName = document.getElementById("f-name");
const fEmail = document.getElementById("f-email");
const fPassword = document.getElementById("f-password");
const fRole = document.getElementById("f-role");

initAppShell(() => {
  watchUsers();
});

document.addEventListener("mm:langchange", renderTable);

function watchUsers() {
  onSnapshot(collection(db, "users"), (snap) => {
    allUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allUsers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    renderTable();
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderTable() {
  if (allUsers.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">${t("empty_no_users")}</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  allUsers.forEach((u) => {
    const isActive = !!u.role;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.name || "—")}</td>
      <td>${escapeHtml(u.email || "—")}</td>
      <td>${isActive ? roleLabel(u.role) : `<span class="status-pill lost">${t("deactivated_label")}</span>`}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit" data-id="${u.id}">${t("btn_edit")}</button>
        <button class="icon-btn" data-action="reset" data-id="${u.id}">${t("btn_reset_password")}</button>
        ${isActive
          ? `<button class="icon-btn icon-btn--danger" data-action="deactivate" data-id="${u.id}">${t("btn_deactivate")}</button>`
          : `<button class="icon-btn" data-action="edit" data-id="${u.id}">${t("btn_activate")}</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.id)));
  tbody.querySelectorAll('[data-action="reset"]').forEach((b) => b.addEventListener("click", () => handleReset(b.dataset.id)));
  tbody.querySelectorAll('[data-action="deactivate"]').forEach((b) => b.addEventListener("click", () => handleDeactivate(b.dataset.id)));
}

// ---------- Modal ----------

function openAdd() {
  form.reset();
  fId.value = "";
  editingId = "";
  passwordField.style.display = "";
  fRole.value = "client_management";
  modalTitle.textContent = t("modal_title_new_user");
  formError.textContent = "";
  modal.hidden = false;
}

function openEdit(id) {
  const u = allUsers.find((x) => x.id === id);
  if (!u) return;
  fId.value = u.id;
  editingId = id;
  fName.value = u.name || "";
  fEmail.value = u.email || "";
  fRole.value = u.role || "client_management";
  passwordField.style.display = "none"; // مينفعش نغيّر باسورد حساب حالي من هنا
  modalTitle.textContent = t("modal_title_edit_user");
  formError.textContent = "";
  modal.hidden = false;
}

addBtn.addEventListener("click", openAdd);
cancelBtn.addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const name = fName.value.trim();
  if (!name) {
    formError.textContent = t("err_name_required");
    return;
  }

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = t("btn_saving");

  try {
    if (fId.value) {
      // تعديل مستخدم موجود: بس الاسم والدور والإيميل المعروض (مش بيغيّر باسورد الحساب الحقيقي)
      await setDoc(doc(db, "users", fId.value), {
        name,
        email: fEmail.value.trim(),
        role: fRole.value,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const email = fEmail.value.trim();
      const password = fPassword.value;
      if (!email || !password) {
        formError.textContent = t("err_email_password_required");
        saveBtn.disabled = false;
        saveBtn.textContent = t("btn_save");
        return;
      }
      // بنستخدم نسخة تانية من تطبيق Firebase عشان إنشاء الحساب الجديد
      // ميأثرش على جلسة تسجيل دخول الإدارة الحالية
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryUserCreation-" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          name,
          email,
          role: fRole.value,
          createdAt: serverTimestamp(),
        });
        logActivity("act_user_created", name);
      } finally {
        await deleteApp(secondaryApp);
      }
    }
    modal.hidden = true;
  } catch (err) {
    formError.textContent = t("err_save_generic") + err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t("btn_save");
  }
});

// ---------- Row actions ----------

async function handleReset(id) {
  const u = allUsers.find((x) => x.id === id);
  if (!u || !u.email) {
    alert(t("err_email_required_for_reset"));
    return;
  }
  try {
    await sendPasswordResetEmail(auth, u.email);
    alert(t("reset_password_sent"));
  } catch (err) {
    alert(t("err_save_generic") + err.message);
  }
}

async function handleDeactivate(id) {
  const u = allUsers.find((x) => x.id === id);
  const ok = confirm(t("confirm_deactivate_user", { name: u ? u.name : "" }));
  if (!ok) return;
  try {
    // بنمسح الدور بس (مش المستند كله) — auth.js بيعتبر أي حساب من غير دور "مش مفعّل"
    // ويرفض دخوله، لكن حسابه في Firebase Auth فاضل موجود فتقدر "تفعّله" تاني من غير
    // ما تحتاج تعمل حساب جديد (اللي كان هيفشل برسالة "email-already-in-use")
    await setDoc(doc(db, "users", id), { role: "", deactivatedAt: serverTimestamp() }, { merge: true });
    logActivity("act_user_deactivated", u ? u.name : "");
  } catch (err) {
    alert(t("err_delete_generic") + err.message);
  }
}
