import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { t } from "./i18n.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allProjects = [];
let allPayments = [];

const tbody = document.getElementById("payments-tbody");
const searchInput = document.getElementById("search-input");
const statCollected = document.getElementById("stat-collected");
const statOutstanding = document.getElementById("stat-outstanding");

const payModal = document.getElementById("payment-modal");
const payForm = document.getElementById("payment-form");
const payProjectId = document.getElementById("payment-project-id");
const payProjectLabel = document.getElementById("payment-project-label");
const payAmount = document.getElementById("p-amount");
const payDate = document.getElementById("p-date");
const payMethod = document.getElementById("p-method");
const payNotes = document.getElementById("p-notes");
const payError = document.getElementById("payment-form-error");
const payCancelBtn = document.getElementById("payment-cancel-btn");

const histModal = document.getElementById("history-modal");
const histProjectLabel = document.getElementById("history-project-label");
const histTbody = document.getElementById("history-tbody");
const histCloseBtn = document.getElementById("history-close-btn");

initAppShell(() => {
  watchProjects();
  watchPayments();
});

document.addEventListener("mm:langchange", renderTable);

function watchProjects() {
  onSnapshot(collection(db, "projects"), (snap) => {
    allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTable();
  });
}

function watchPayments() {
  const q = query(collection(db, "payments"), orderBy("date", "desc"));
  onSnapshot(q, (snap) => {
    allPayments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTable();
  });
}

function paidForProject(projectId) {
  return allPayments
    .filter((p) => p.projectId === projectId)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

function paymentStatus(total, paid) {
  if (paid <= 0) return { key: "unpaid", group: "neutral" };
  if (paid >= total && total > 0) return { key: "paid", group: "success" };
  return { key: "partial", group: "active" };
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderTable() {
  // Stats
  const collected = allPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = allProjects.reduce((s, p) => {
    const total = Number(p.projectValue) || 0;
    const remaining = total - paidForProject(p.id);
    return s + (remaining > 0 ? remaining : 0);
  }, 0);
  statCollected.textContent = collected.toLocaleString("en-US");
  statOutstanding.textContent = outstanding.toLocaleString("en-US");

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
    const total = Number(p.projectValue) || 0;
    const paid = paidForProject(p.id);
    const remaining = total - paid;
    const st = paymentStatus(total, paid);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.clientName || "—")}</td>
      <td>${escapeHtml(p.service || "—")}</td>
      <td>${total.toLocaleString("en-US")}</td>
      <td>${paid.toLocaleString("en-US")}</td>
      <td>${remaining.toLocaleString("en-US")}</td>
      <td><span class="status-pill ${st.group}">${t("pay_status_" + st.key)}</span></td>
      <td class="row-actions">
        <button class="icon-btn" data-action="log" data-id="${p.id}">${t("btn_log_payment")}</button>
        <button class="icon-btn" data-action="history" data-id="${p.id}">${t("btn_history")}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="log"]').forEach((b) => b.addEventListener("click", () => openLogPayment(b.dataset.id)));
  tbody.querySelectorAll('[data-action="history"]').forEach((b) => b.addEventListener("click", () => openHistory(b.dataset.id)));
}

searchInput.addEventListener("input", renderTable);

// ---------- Log payment ----------

function openLogPayment(projectId) {
  const p = allProjects.find((x) => x.id === projectId);
  if (!p) return;
  payForm.reset();
  payProjectId.value = projectId;
  payProjectLabel.textContent = `${p.clientName || ""} — ${p.service || ""}`;
  payDate.value = new Date().toISOString().slice(0, 10);
  payError.textContent = "";
  payModal.hidden = false;
}

payCancelBtn.addEventListener("click", () => { payModal.hidden = true; });
payModal.addEventListener("click", (e) => { if (e.target === payModal) payModal.hidden = true; });

payForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  payError.textContent = "";
  const amount = parseFloat(payAmount.value);
  if (!amount || amount <= 0) {
    payError.textContent = t("err_amount_required");
    return;
  }
  const p = allProjects.find((x) => x.id === payProjectId.value);

  const saveBtn = document.getElementById("payment-save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = t("btn_saving");
  try {
    await addDoc(collection(db, "payments"), {
      projectId: payProjectId.value,
      projectClientName: p ? p.clientName : "",
      amount,
      date: payDate.value || new Date().toISOString().slice(0, 10),
      method: payMethod.value.trim(),
      notes: payNotes.value.trim(),
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser ? auth.currentUser.uid : null,
    });
    payModal.hidden = true;
  } catch (err) {
    payError.textContent = t("err_save_generic") + err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t("btn_save");
  }
});

// ---------- History ----------

function openHistory(projectId) {
  const p = allProjects.find((x) => x.id === projectId);
  histProjectLabel.textContent = p ? `${p.clientName || ""} — ${p.service || ""}` : "";
  renderHistory(projectId);
  histModal.hidden = false;
}

function renderHistory(projectId) {
  const items = allPayments.filter((x) => x.projectId === projectId);
  if (items.length === 0) {
    histTbody.innerHTML = `<tr class="empty-row"><td colspan="4">${t("empty_no_payments_yet")}</td></tr>`;
    return;
  }
  histTbody.innerHTML = "";
  items.forEach((pay) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(pay.date || "—")}</td>
      <td>${(Number(pay.amount) || 0).toLocaleString("en-US")}</td>
      <td>${escapeHtml(pay.method || "—")}</td>
      <td><button class="icon-btn icon-btn--danger" data-id="${pay.id}">${t("btn_delete")}</button></td>
    `;
    histTbody.appendChild(tr);
  });
  histTbody.querySelectorAll("[data-id]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm(t("confirm_delete_payment"))) return;
      await deleteDoc(doc(db, "payments", b.dataset.id));
      renderHistory(projectId);
    })
  );
}

histCloseBtn.addEventListener("click", () => { histModal.hidden = true; });
histModal.addEventListener("click", (e) => { if (e.target === histModal) histModal.hidden = true; });
