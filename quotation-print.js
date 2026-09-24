import { db } from "./auth.js";
import { watchAuth } from "./auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const STATUS_LABELS = {
  draft: "مسودة",
  sent: "تم الإرسال",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
  expired: "منتهي الصلاحية",
};

const sheet = document.getElementById("sheet");

watchAuth(
  async () => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      sheet.innerHTML = "<p>معرف عرض السعر غير موجود في الرابط.</p>";
      return;
    }
    try {
      const snap = await getDoc(doc(db, "quotations", id));
      if (!snap.exists()) {
        sheet.innerHTML = "<p>عرض السعر ده مش موجود.</p>";
        return;
      }
      let company = {};
      try {
        const compSnap = await getDoc(doc(db, "settings", "company"));
        if (compSnap.exists()) company = compSnap.data();
      } catch (e) { /* لو مفيش صلاحية أو مفيش بيانات، هيتعرض اسم الشركة بس */ }
      render(snap.id, snap.data(), company);
    } catch (err) {
      sheet.innerHTML = `<p>حصل خطأ أثناء التحميل: ${err.message}</p>`;
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
        <span class="brand-mark"></span>
        <span class="brand-word">Media Made</span>
      </div>
      <div class="quote-meta">
        <div>عرض سعر رقم: Q-${id.slice(0, 6).toUpperCase()}</div>
        <div>صالح حتى: ${escapeHtml(q.validUntil || "غير محدد")}</div>
      </div>
    </div>

    <h1>عرض سعر</h1>
    <p class="status-line">مقدّم إلى: <strong>${escapeHtml(q.clientName)}</strong> — الحالة: ${STATUS_LABELS[q.status] || q.status}</p>

    ${q.service ? `<div class="section"><h2>الخدمة</h2><p>${escapeHtml(q.service)}</p></div>` : ""}
    ${q.scopeOfWork ? `<div class="section"><h2>Scope of Work</h2><p>${escapeHtml(q.scopeOfWork)}</p></div>` : ""}
    ${q.deliverables ? `<div class="section"><h2>Deliverables</h2><p>${escapeHtml(q.deliverables)}</p></div>` : ""}

    <div class="section">
      <h2>البنود والأسعار</h2>
      <table>
        <thead><tr><th>البند</th><th>السعر</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>الإجمالي</td><td>${(q.total || 0).toLocaleString("en-US")}</td></tr></tfoot>
      </table>
    </div>

    ${q.paymentTerms ? `<div class="section"><h2>شروط الدفع</h2><p>${escapeHtml(q.paymentTerms)}</p></div>` : ""}

    ${footerHtml}
  `;
}
