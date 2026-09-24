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
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const QUOTE_STATUS_GROUPS = {
  draft: "neutral",
  sent: "active",
  approved: "success",
  rejected: "lost",
  expired: "lost",
};

function quoteStatusLabel(status) {
  return t(`qstatus_${status}`) || status;
}

let currentRole = null;
let allQuotes = [];
let allClients = [];
let priceList = [];
let currentLineItems = [];
let editingId = "";

const tbody = document.getElementById("quotes-tbody");
const searchInput = document.getElementById("search-input");
const addBtn = document.getElementById("add-quote-btn");
const priceListBtn = document.getElementById("price-list-btn");

const modal = document.getElementById("quote-modal");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("quote-form");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");

const fId = document.getElementById("quote-id");
const fClient = document.getElementById("f-client");
const fService = document.getElementById("f-service");
const fScope = document.getElementById("f-scope");
const fDeliverables = document.getElementById("f-deliverables");
const fTerms = document.getElementById("f-terms");
const fValidUntil = document.getElementById("f-valid-until");
const fStatus = document.getElementById("f-status");
const priceListSelect = document.getElementById("price-list-select");
const totalAmountEl = document.getElementById("total-amount");

const plModal = document.getElementById("price-list-modal");
const plTbody = document.getElementById("price-list-tbody");
const plName = document.getElementById("pl-name");
const plPrice = document.getElementById("pl-price");
const plError = document.getElementById("price-list-error");

initAppShell((profile) => {
  currentRole = profile.role;
  if (currentRole === "management") {
    priceListBtn.hidden = false;
    document.getElementById("company-info-btn").hidden = false;
  }
  loadClients();
  watchPriceList();
  watchQuotes();
});

document.addEventListener("mm:langchange", () => {
  loadClients();
  renderPriceListSelect();
  renderPriceListAdminTable();
  renderTable();
  renderLineItems();
  modalTitle.textContent = editingId ? t("modal_title_edit_quote") : t("modal_title_new_quote");
});

// ---------- Data loading ----------

async function loadClients() {
  const snap = await getDocs(collection(db, "clients"));
  allClients = snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
  allClients.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const selected = fClient.value;
  fClient.innerHTML = `<option value="" data-i18n="option_choose_client">${t("option_choose_client")}</option>`;
  allClients.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    fClient.appendChild(opt);
  });
  if (selected) fClient.value = selected;
}

function watchPriceList() {
  onSnapshot(collection(db, "priceList"), (snap) => {
    priceList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    priceList.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    renderPriceListSelect();
    renderPriceListAdminTable();
  });
}

function renderPriceListSelect() {
  priceListSelect.innerHTML = `<option value="">${t("option_add_from_pricelist")}</option>`;
  priceList.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = `${item.name} — ${item.price}`;
    priceListSelect.appendChild(opt);
  });
}

function watchQuotes() {
  const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      allQuotes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${t("err_save_generic")}${err.message}</td></tr>`;
    }
  );
}

// ---------- Table ----------

function renderTable() {
  const term = (searchInput.value || "").trim().toLowerCase();
  const filtered = term
    ? allQuotes.filter((q) =>
        [q.clientName, q.service].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
    : allQuotes;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${
      allQuotes.length === 0 ? t("empty_no_quotes") : t("empty_no_results")
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((q) => {
    const group = QUOTE_STATUS_GROUPS[q.status] || "neutral";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>Q-${q.id.slice(0, 6).toUpperCase()}</td>
      <td>${escapeHtml(q.clientName || "—")}</td>
      <td>${escapeHtml(q.service || "—")}</td>
      <td>${(q.total || 0).toLocaleString("en-US")}</td>
      <td><span class="status-pill ${group}">${quoteStatusLabel(q.status)}</span></td>
      <td>${escapeHtml(q.validUntil || "—")}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="print" data-id="${q.id}">${t("btn_pdf")}</button>
        <button class="icon-btn" data-action="edit" data-id="${q.id}">${t("btn_edit")}</button>
        <button class="icon-btn icon-btn--danger mgmt-only" data-action="delete" data-id="${q.id}">${t("btn_delete")}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.id)));
  tbody.querySelectorAll('[data-action="print"]').forEach((b) => b.addEventListener("click", () => {
    window.open(`quotation-print.html?id=${b.dataset.id}`, "_blank");
  }));
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

// ---------- Line items ----------

function renderLineItems() {
  const wrap = document.getElementById("line-items-wrap");
  wrap.innerHTML = "";
  currentLineItems.forEach((item, idx) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:8px; margin-bottom:6px;";
    row.innerHTML = `
      <input type="text" class="li-desc" data-idx="${idx}" value="${escapeHtml(item.description)}" style="flex:2; padding:8px; border:1px solid var(--border); border-radius:6px; font-family:inherit; background:var(--surface-alt);">
      <input type="number" class="li-price" data-idx="${idx}" value="${item.price}" min="0" style="width:110px; padding:8px; border:1px solid var(--border); border-radius:6px; font-family:inherit; background:var(--surface-alt);">
      <button type="button" class="icon-btn icon-btn--danger li-remove" data-idx="${idx}">${t("btn_delete")}</button>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll(".li-desc").forEach((inp) =>
    inp.addEventListener("input", (e) => { currentLineItems[+e.target.dataset.idx].description = e.target.value; })
  );
  wrap.querySelectorAll(".li-price").forEach((inp) =>
    inp.addEventListener("input", (e) => {
      currentLineItems[+e.target.dataset.idx].price = parseFloat(e.target.value) || 0;
      recomputeTotal();
    })
  );
  wrap.querySelectorAll(".li-remove").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      currentLineItems.splice(+e.target.dataset.idx, 1);
      renderLineItems();
      recomputeTotal();
    })
  );
}

function recomputeTotal() {
  const total = currentLineItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  totalAmountEl.textContent = total.toLocaleString("en-US");
  return total;
}

document.getElementById("add-from-list-btn").addEventListener("click", () => {
  const id = priceListSelect.value;
  if (!id) return;
  const item = priceList.find((p) => p.id === id);
  if (!item) return;
  currentLineItems.push({ description: item.name, price: Number(item.price) || 0 });
  priceListSelect.value = "";
  renderLineItems();
  recomputeTotal();
});

document.getElementById("add-custom-line-btn").addEventListener("click", () => {
  currentLineItems.push({ description: "", price: 0 });
  renderLineItems();
  recomputeTotal();
});

// ---------- Add / Edit modal ----------

function openAdd() {
  form.reset();
  fId.value = "";
  editingId = "";
  fStatus.value = "draft";
  currentLineItems = [];
  renderLineItems();
  recomputeTotal();
  modalTitle.textContent = t("modal_title_new_quote");
  formError.textContent = "";
  modal.hidden = false;
}

function openEdit(id) {
  const q = allQuotes.find((x) => x.id === id);
  if (!q) return;
  fId.value = q.id;
  editingId = id;
  fClient.value = q.clientId || "";
  fService.value = q.service || "";
  fScope.value = q.scopeOfWork || "";
  fDeliverables.value = q.deliverables || "";
  fTerms.value = q.paymentTerms || "";
  fValidUntil.value = q.validUntil || "";
  fStatus.value = q.status || "draft";
  currentLineItems = (q.lineItems || []).map((it) => ({ ...it }));
  renderLineItems();
  recomputeTotal();
  modalTitle.textContent = t("modal_title_edit_quote");
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
  if (currentLineItems.length === 0) {
    formError.textContent = t("err_min_one_item");
    return;
  }

  const clientOpt = fClient.options[fClient.selectedIndex];
  const total = recomputeTotal();

  const payload = {
    clientId: fClient.value,
    clientName: clientOpt.textContent,
    service: fService.value.trim(),
    scopeOfWork: fScope.value.trim(),
    deliverables: fDeliverables.value.trim(),
    lineItems: currentLineItems,
    total,
    paymentTerms: fTerms.value.trim(),
    validUntil: fValidUntil.value,
    status: fStatus.value,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser ? auth.currentUser.uid : null,
  };

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = t("btn_saving");

  try {
    if (fId.value) {
      await updateDoc(doc(db, "quotations", fId.value), payload);
    } else {
      await addDoc(collection(db, "quotations"), {
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
  const q = allQuotes.find((x) => x.id === id);
  const ok = confirm(t("confirm_delete_quote", { name: q ? q.clientName : "" }));
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "quotations", id));
  } catch (err) {
    alert(t("err_delete_generic") + err.message);
  }
}

// ---------- Price list admin (management only) ----------

function renderPriceListAdminTable() {
  plTbody.innerHTML = "";
  if (priceList.length === 0) {
    plTbody.innerHTML = `<tr class="empty-row"><td colspan="3">${t("empty_no_price_items")}</td></tr>`;
    return;
  }
  priceList.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.price}</td>
      <td><button class="icon-btn icon-btn--danger" data-id="${item.id}">${t("btn_delete")}</button></td>
    `;
    plTbody.appendChild(tr);
  });
  plTbody.querySelectorAll("[data-id]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm(t("confirm_delete_price_item"))) return;
      await deleteDoc(doc(db, "priceList", b.dataset.id));
    })
  );
}

priceListBtn.addEventListener("click", () => { plModal.hidden = false; });
document.getElementById("price-list-close-btn").addEventListener("click", () => { plModal.hidden = true; });
plModal.addEventListener("click", (e) => { if (e.target === plModal) plModal.hidden = true; });

document.getElementById("price-list-add-btn").addEventListener("click", async () => {
  plError.textContent = "";
  const name = plName.value.trim();
  const price = parseFloat(plPrice.value);
  if (!name || isNaN(price)) {
    plError.textContent = t("err_fill_name_price");
    return;
  }
  try {
    await addDoc(collection(db, "priceList"), { name, price });
    plName.value = "";
    plPrice.value = "";
  } catch (err) {
    plError.textContent = t("err_save_generic") + err.message;
  }
});

// ---------- Company info (shown on printed quotations instead of the developer credit) ----------

const ciModal = document.getElementById("company-info-modal");
const ciName = document.getElementById("ci-name");
const ciPhone = document.getElementById("ci-phone");
const ciEmail = document.getElementById("ci-email");
const ciAddress = document.getElementById("ci-address");
const ciWebsite = document.getElementById("ci-website");
const ciError = document.getElementById("company-info-error");

document.getElementById("company-info-btn").addEventListener("click", async () => {
  ciError.textContent = "";
  try {
    const snap = await getDoc(doc(db, "settings", "company"));
    const data = snap.exists() ? snap.data() : {};
    ciName.value = data.name || "";
    ciPhone.value = data.phone || "";
    ciEmail.value = data.email || "";
    ciAddress.value = data.address || "";
    ciWebsite.value = data.website || "";
  } catch (err) {
    ciError.textContent = t("err_save_generic") + err.message;
  }
  ciModal.hidden = false;
});

document.getElementById("company-info-close-btn").addEventListener("click", () => { ciModal.hidden = true; });
ciModal.addEventListener("click", (e) => { if (e.target === ciModal) ciModal.hidden = true; });

document.getElementById("company-info-save-btn").addEventListener("click", async () => {
  ciError.textContent = "";
  try {
    await setDoc(doc(db, "settings", "company"), {
      name: ciName.value.trim(),
      phone: ciPhone.value.trim(),
      email: ciEmail.value.trim(),
      address: ciAddress.value.trim(),
      website: ciWebsite.value.trim(),
      updatedAt: serverTimestamp(),
    });
    ciModal.hidden = true;
  } catch (err) {
    ciError.textContent = t("err_save_generic") + err.message;
  }
});
