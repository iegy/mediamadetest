import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import { t } from "./i18n.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const COLLECTIONS = ["clients", "projects", "quotations", "priceList", "payments", "expenses", "users", "settings"];

const exportBtn = document.getElementById("export-btn");
const exportStatus = document.getElementById("export-status");
const importFile = document.getElementById("import-file");
const importBtn = document.getElementById("import-btn");
const importStatus = document.getElementById("import-status");

initAppShell(() => { /* الصفحة دي للإدارة بس، وقواعد Firestore بتفرض ده أصلاً */ });

// بيحوّل أي Firestore Timestamp (وأي تاريخ جواه array/object) لنص ISO عادي عشان يبقى قابل لـ JSON
function serializeValue(v) {
  if (v && typeof v.toDate === "function") return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(serializeValue);
  if (v && typeof v === "object") {
    const out = {};
    Object.keys(v).forEach((k) => { out[k] = serializeValue(v[k]); });
    return out;
  }
  return v;
}

exportBtn.addEventListener("click", async () => {
  exportStatus.textContent = t("exporting_msg");
  exportBtn.disabled = true;
  try {
    const result = { exportedAt: new Date().toISOString(), collections: {} };
    for (const name of COLLECTIONS) {
      const snap = await getDocs(collection(db, name));
      result.collections[name] = snap.docs.map((d) => ({ id: d.id, ...serializeValue(d.data()) }));
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-made-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    exportStatus.textContent = "";
  } catch (err) {
    exportStatus.textContent = t("err_save_generic") + err.message;
  } finally {
    exportBtn.disabled = false;
  }
});

importBtn.addEventListener("click", async () => {
  importStatus.textContent = "";
  const file = importFile.files[0];
  if (!file) return;

  if (!confirm(t("confirm_import"))) return;

  importBtn.disabled = true;
  importStatus.textContent = t("importing_msg");

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const collectionsData = parsed.collections || {};

    for (const name of Object.keys(collectionsData)) {
      const docs = collectionsData[name] || [];
      for (const docData of docs) {
        const { id, createdAt, updatedAt, ...rest } = docData;
        const payload = { ...rest };
        if (createdAt) payload.importedCreatedAt = createdAt;
        if (updatedAt) payload.importedUpdatedAt = updatedAt;
        payload.createdAt = serverTimestamp();
        payload.updatedAt = serverTimestamp();
        await addDoc(collection(db, name), payload);
      }
    }

    importStatus.textContent = t("import_done_msg");
    importFile.value = "";
  } catch (err) {
    importStatus.textContent = t("import_error") + err.message;
  } finally {
    importBtn.disabled = false;
  }
});
