import { db, auth } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import {
  projectStatusLabel, PROJECT_STATUS_KEYS,
  editingStatusLabel, EDITING_STATUS_KEYS,
} from "./permissions.js";
import { t, getLang } from "./i18n.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { findOrCreateFolder, uploadFile, shareFile } from "./drive.js";

const content = document.getElementById("sheet-content");
const projectId = new URLSearchParams(window.location.search).get("id");

let currentRole = null;
let project = null;
let fullEdit = false; // management / client_management
let companyDriveEmail = "";

initAppShell((profile) => {
  currentRole = profile.role;
  fullEdit = currentRole === "management" || currentRole === "client_management";
  loadCompanySettings();
  loadProject();
});

document.addEventListener("mm:langchange", () => {
  if (project) render();
});

async function loadCompanySettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "company"));
    if (snap.exists()) companyDriveEmail = snap.data().driveEmail || "";
  } catch (e) { /* لو مفيش صلاحية، هيكمل من غير مشاركة تلقائية */ }
}

async function loadProject() {
  if (!projectId) {
    content.innerHTML = `<p>${t("print_missing_id")}</p>`;
    return;
  }
  try {
    const snap = await getDoc(doc(db, "projects", projectId));
    if (!snap.exists()) {
      content.innerHTML = `<p>${t("print_not_found")}</p>`;
      return;
    }
    project = snap.data();
    render();
  } catch (err) {
    content.innerHTML = `<p>${t("err_save_generic")}${err.message}</p>`;
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function textBlock(labelKey, value) {
  return `
    <div class="field field--full">
      <label>${t(labelKey)}</label>
      <p style="white-space:pre-wrap; margin:0; padding:9px 11px; background:var(--surface-alt); border:1px solid var(--border); border-radius:8px; min-height:20px;">${escapeHtml(value) || "—"}</p>
    </div>
  `;
}

function textAreaBlock(labelKey, id, value) {
  return `
    <div class="field field--full">
      <label for="${id}">${t(labelKey)}</label>
      <textarea id="${id}" style="min-height:90px;">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function render() {
  const p = project;

  const statusOptions = PROJECT_STATUS_KEYS.map(
    (s) => `<option value="${s.key}" ${p.status === s.key ? "selected" : ""}>${projectStatusLabel(s.key)}</option>`
  ).join("");
  const editingStatusOptions = EDITING_STATUS_KEYS.map(
    (s) => `<option value="${s.key}" ${p.editingStatus === s.key ? "selected" : ""}>${editingStatusLabel(s.key)}</option>`
  ).join("");

  content.innerHTML = `
    <div class="table-wrap" style="padding:18px 20px; margin-bottom:18px;">
      <div class="field-grid">
        <div class="field"><label>${t("th_client")}</label><p style="margin:0; font-weight:700;">${escapeHtml(p.clientName)}</p></div>
        <div class="field"><label>${t("th_service")}</label><p style="margin:0;">${escapeHtml(p.service) || "—"}</p></div>
        <div class="field"><label>${t("label_shoot_date")}</label><p style="margin:0;">${escapeHtml(p.shootDate) || "—"}</p></div>
        <div class="field"><label>${t("label_delivery_date")}</label><p style="margin:0;">${escapeHtml(p.deliveryDate) || "—"}</p></div>
        <div class="field"><label>${t("label_shoot_location")}</label><p style="margin:0;">${escapeHtml(p.shootLocation) || "—"}</p></div>
        <div class="field"><label>${t("label_team")}</label><p style="margin:0;">${(p.teamNames || []).join(", ") || "—"}</p></div>
      </div>
    </div>

    <form id="sheet-form">
      <div class="field-grid">
        <div class="field">
          <label for="f-status">${t("label_project_status")}</label>
          <select id="f-status">${statusOptions}</select>
        </div>
        <div class="field">
          <label for="f-editing-status">${t("label_editing_status")}</label>
          <select id="f-editing-status">${editingStatusOptions}</select>
        </div>

        ${fullEdit ? textAreaBlock("section_client_brief", "f-brief", p.clientBrief)
                   : textBlock("section_client_brief", p.clientBrief)}
        ${fullEdit ? textAreaBlock("section_project_details", "f-details", p.projectDetails)
                   : textBlock("section_project_details", p.projectDetails)}
        ${fullEdit ? textAreaBlock("section_references", "f-references", p.references)
                   : textBlock("section_references", p.references)}
        ${fullEdit ? textAreaBlock("section_ideas", "f-ideas", p.ideas)
                   : textBlock("section_ideas", p.ideas)}
        ${fullEdit ? textAreaBlock("section_shot_list", "f-shotlist", p.shotList)
                   : textBlock("section_shot_list", p.shotList)}

        <div class="field field--full">
          <label for="f-shooting-details">${t("section_shooting_details")}</label>
          <textarea id="f-shooting-details" style="min-height:70px;">${escapeHtml(p.shootingDetails)}</textarea>
        </div>

        ${fullEdit ? textAreaBlock("section_project_notes", "f-notes", p.notes)
                   : textBlock("section_project_notes", p.notes)}
      </div>

      <p id="form-error" class="form-error" role="alert"></p>
      <button type="submit" id="save-btn" class="btn-primary btn-primary--inline" style="margin-top:14px;">${t("btn_save")}</button>
    </form>

    <div class="field field--full" style="border-top:1px solid var(--border); padding-top:14px; margin-top:20px;">
      <label style="font-weight:700; color:var(--ink);">${t("section_files_placeholder")}</label>
      <div id="files-list" style="display:flex; flex-direction:column; gap:6px; margin:10px 0;"></div>
      <button type="button" id="upload-file-btn" class="btn-secondary" style="width:auto; padding:9px 16px;">${t("btn_upload_file")}</button>
      <input type="file" id="file-input" hidden>
      <p id="upload-status" style="font-size:12.5px; color:var(--ink-muted); margin:8px 0 0;"></p>
    </div>
  `;

  document.getElementById("sheet-form").addEventListener("submit", onSave);
  renderFilesList();
  document.getElementById("upload-file-btn").addEventListener("click", () => document.getElementById("file-input").click());
  document.getElementById("file-input").addEventListener("change", onFileChosen);
}

function renderFilesList() {
  const wrap = document.getElementById("files-list");
  const files = project.files || [];
  if (files.length === 0) {
    wrap.innerHTML = `<p style="font-size:13px; color:var(--ink-muted); margin:0;">${t("no_files_yet")}</p>`;
    return;
  }
  wrap.innerHTML = files.map((f) => `
    <div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; background:var(--surface);">
      <iframe src="https://drive.google.com/file/d/${encodeURIComponent(f.driveFileId)}/preview"
        style="width:100%; height:220px; border:none; display:block;" loading="lazy"
        allow="autoplay"></iframe>
      <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; font-size:12.5px;">
        <span>${escapeHtml(f.fileName)}</span>
        <a href="${escapeHtml(f.webViewLink)}" target="_blank" rel="noopener">${t("open_in_drive")}</a>
      </div>
    </div>
  `).join("");
}

async function onFileChosen(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  const statusEl = document.getElementById("upload-status");
  statusEl.textContent = t("uploading_msg");

  try {
    const folderName = `MediaMade - ${project.clientName || ""} - ${project.service || ""}`.trim();
    const folderId = await findOrCreateFolder(folderName);
    const uploaded = await uploadFile(file, folderId);
    if (companyDriveEmail) {
      try { await shareFile(uploaded.id, companyDriveEmail, "reader"); }
      catch (shareErr) { console.warn("Could not auto-share with company Drive:", shareErr); }
    }

    const meta = {
      driveFileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink: uploaded.webViewLink,
      mimeType: uploaded.mimeType || "",
      uploadedBy: auth.currentUser ? auth.currentUser.uid : null,
      uploadedAt: new Date().toISOString(),
    };
    const newFiles = [...(project.files || []), meta];
    await updateDoc(doc(db, "projects", projectId), { files: newFiles, updatedAt: serverTimestamp() });
    project.files = newFiles;
    renderFilesList();
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = t("upload_error") + err.message;
  }
}

async function onSave(e) {
  e.preventDefault();
  const formError = document.getElementById("form-error");
  const saveBtn = document.getElementById("save-btn");
  formError.textContent = "";

  const payload = {
    status: document.getElementById("f-status").value,
    editingStatus: document.getElementById("f-editing-status").value,
    shootingDetails: document.getElementById("f-shooting-details").value.trim(),
    updatedAt: serverTimestamp(),
  };

  if (fullEdit) {
    payload.clientBrief = document.getElementById("f-brief").value.trim();
    payload.projectDetails = document.getElementById("f-details").value.trim();
    payload.references = document.getElementById("f-references").value.trim();
    payload.ideas = document.getElementById("f-ideas").value.trim();
    payload.shotList = document.getElementById("f-shotlist").value.trim();
    payload.notes = document.getElementById("f-notes").value.trim();
  }

  saveBtn.disabled = true;
  saveBtn.textContent = t("btn_saving");
  try {
    await updateDoc(doc(db, "projects", projectId), payload);
    Object.assign(project, payload);
    saveBtn.textContent = t("sheet_saved_msg");
    setTimeout(() => { saveBtn.textContent = t("btn_save"); saveBtn.disabled = false; }, 1200);
  } catch (err) {
    formError.textContent = t("err_save_generic") + err.message;
    saveBtn.disabled = false;
    saveBtn.textContent = t("btn_save");
  }
}
