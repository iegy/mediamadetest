import { db } from "./auth.js";
import { watchAuth } from "./auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { t, getLang, setLang, applyDirection, applyI18n } from "./i18n.js";

applyDirection();
applyI18n();

const sheet = document.getElementById("sheet");
let currentId = null;
let currentQuote = null;
let currentCompany = {};

document.getElementById("lang-toggle").addEventListener("click", () => {
  setLang(getLang() === "ar" ? "en" : "ar");
});
document.addEventListener("mm:langchange", () => {
  if (currentQuote) render(currentId, currentQuote, currentCompany);
});

const QUOTE_STATUS_KEYS = {
  draft: "qstatus_draft",
  sent: "qstatus_sent",
  approved: "qstatus_approved",
  rejected: "qstatus_rejected",
  expired: "qstatus_expired",
};

watchAuth(
  async () => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      sheet.innerHTML = `<p>${t("print_missing_id")}</p>`;
      return;
    }
    try {
      const snap = await getDoc(doc(db, "quotations", id));
      if (!snap.exists()) {
        sheet.innerHTML = `<p>${t("print_not_found")}</p>`;
        return;
      }
      let company = {};
      try {
        const compSnap = await getDoc(doc(db, "settings", "company"));
        if (compSnap.exists()) company = compSnap.data();
      } catch (e) { /* لو مفيش صلاحية أو مفيش بيانات، هيتعرض اسم الشركة بس */ }
      currentId = snap.id;
      currentQuote = snap.data();
      currentCompany = company;
      render(currentId, currentQuote, currentCompany);
    } catch (err) {
      sheet.innerHTML = `<p>${t("print_error")}${err.message}</p>`;
    }
  },
  () => { window.location.href = "index.html"; }
);

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function render(id, q, company) {
  const rows = (q.lineItems || [])
    .map((it) => `<tr><td>${escapeHtml(it.description)}</td><td>${Number(it.price) || 0}</td></tr>`)
    .join("");

  const companyLines = [
    company.phone,
    company.email,
    company.address,
    company.website,
  ].filter(Boolean);

  const footerHtml = `
    <p class="credit">
      <strong>${escapeHtml(company.name || "Media Made")}</strong>
      ${companyLines.length ? "<br>" + companyLines.map(escapeHtml).join(" · ") : ""}
    </p>
  `;

  sheet.innerHTML = `
    <div class="head">
      <div class="brand">
        <img src="logo.png" alt="Media Made" class="brand-logo">
        <span class="brand-word">Media Made</span>
      </div>
      <div class="quote-meta">
        <div>${t("print_quote_no_prefix")} Q-${id.slice(0, 6).toUpperCase()}</div>
        <div>${t("print_valid_until_prefix")} ${escapeHtml(q.validUntil || t("print_not_specified"))}</div>
      </div>
    </div>

    <h1>${t("print_title")}</h1>
    <p class="status-line">${t("print_to_prefix")} <strong>${escapeHtml(q.clientName)}</strong> — ${t("print_status_prefix")} ${t(QUOTE_STATUS_KEYS[q.status] || "qstatus_draft")}</p>

    ${q.service ? `<div class="section"><h2>${t("print_service_heading")}</h2><p>${escapeHtml(q.service)}</p></div>` : ""}
    ${q.scopeOfWork ? `<div class="section"><h2>${t("label_scope")}</h2><p>${escapeHtml(q.scopeOfWork)}</p></div>` : ""}
    ${q.deliverables ? `<div class="section"><h2>${t("label_deliverables")}</h2><p>${escapeHtml(q.deliverables)}</p></div>` : ""}

    <div class="section">
      <h2>${t("print_items_heading")}</h2>
      <table>
        <thead><tr><th>${t("print_item_col")}</th><th>${t("print_price_col")}</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>${t("print_total_row")}</td><td>${(q.total || 0).toLocaleString("en-US")}</td></tr></tfoot>
      </table>
    </div>

    ${q.paymentTerms ? `<div class="section"><h2>${t("print_terms_heading")}</h2><p>${escapeHtml(q.paymentTerms)}</p></div>` : ""}

    ${footerHtml}
  `;
}
