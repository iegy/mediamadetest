import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allClients = [];

const tbody = document.getElementById("followup-tbody");
const searchInput = document.getElementById("search-input");

const modal = document.getElementById("followup-modal");
const form = document.getElementById("followup-form");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");
const fId = document.getElementById("client-id");
const fLastDate = document.getElementById("f-last-date");
const fNextDate = document.getElementById("f-next-date");
const fLastNotes = document.getElementById("f-last-notes");
const fNextStep = document.getElementById("f-next-step");

initAppShell(() => {
  watchClients();
});

function watchClients() {
  onSnapshot(
    collection(db, "clients"),
    (snap) => {
      allClients = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.status !== "closed" && c.status !== "lost");
      renderTable();
    },
    (err) => {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">تعذّر تحميل المتابعات: ${err.message}</td></tr>`;
    }
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function renderTable() {
  const term = (searchInput.value || "").trim().toLowerCase();
  let rows = term
    ? allClients.filter((c) =>
        [c.name, c.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
    : allClients.slice();

  // ترتيب: اللي معاهم متابعة قادمة الأول (الأقرب/الأكثر تأخرًا فوق)، وبعدهم اللي مفيش لهم تاريخ محدد
  rows.sort((a, b) => {
    if (!a.nextFollowUpDate && !b.nextFollowUpDate) return 0;
    if (!a.nextFollowUpDate) return 1;
    if (!b.nextFollowUpDate) return -1;
    return a.nextFollowUpDate.localeCompare(b.nextFollowUpDate);
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">مفيش عملاء نشطين محتاجين متابعة دلوقتي.</td></tr>`;
    return;
  }

  const today = todayIso();
  tbody.innerHTML = "";
  rows.forEach((c) => {
    const tr = document.createElement("tr");
    const due = c.nextFollowUpDate;
    let dueBadge = "";
    if (due) {
      if (due < today) {
        dueBadge = `<span class="status-pill lost">${escapeHtml(due)} · متأخرة</span>`;
      } else if (due === today) {
        dueBadge = `<span class="status-pill active">${escapeHtml(due)} · النهاردة</span>`;
      } else {
        dueBadge = `<span class="status-pill neutral">${escapeHtml(due)}</span>`;
      }
    } else {
      dueBadge = `<span class="status-pill neutral">غير محددة</span>`;
    }

    tr.innerHTML = `
      <td>${escapeHtml(c.name || "—")}</td>
      <td>${escapeHtml(c.lastFollowUpDate || "—")}</td>
      <td class="wrap">${escapeHtml(c.lastFollowUpNotes || "—")}</td>
      <td>${dueBadge}</td>
      <td class="wrap">${escapeHtml(c.nextStep || "—")}</td>
      <td>${escapeHtml(c.ownerName || "—")}</td>
      <td><button class="icon-btn" data-id="${c.id}">تحديث المتابعة</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => openUpdate(btn.dataset.id));
  });
}

searchInput.addEventListener("input", renderTable);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function openUpdate(id) {
  const c = allClients.find((x) => x.id === id);
  if (!c) return;
  fId.value = c.id;
  fLastDate.value = c.lastFollowUpDate || todayIso();
  fNextDate.value = c.nextFollowUpDate || "";
  fLastNotes.value = c.lastFollowUpNotes || "";
  fNextStep.value = c.nextStep || "";
  formError.textContent = "";
  modal.hidden = false;
}

cancelBtn.addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "جاري الحفظ...";

  try {
    await updateDoc(doc(db, "clients", fId.value), {
      lastFollowUpDate: fLastDate.value,
      nextFollowUpDate: fNextDate.value,
      lastFollowUpNotes: fLastNotes.value.trim(),
      nextStep: fNextStep.value.trim(),
      updatedAt: serverTimestamp(),
    });
    modal.hidden = true;
  } catch (err) {
    formError.textContent = "حصل خطأ أثناء الحفظ: " + err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ";
  }
});
