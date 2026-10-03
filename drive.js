import { DRIVE_CLIENT_ID, DRIVE_SCOPE } from "./drive-config.js";

let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0; // Date.now() بالمللي ثانية

function ensureGisLoaded() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google's sign-in library"));
    document.head.appendChild(script);
  });
}

// بيطلب إذن الوصول لدرايف المستخدم (Popup تسجيل دخول جوجل) ويرجّع access token صالح لجلسة المتصفح الحالية.
// التوكن بتاع جوجل بيصلح لساعة بس، فبنتابع وقت انتهائه ونطلب واحد جديد تلقائي قبل ما يخلص
// (مع هامش أمان دقيقة) بدل ما نفضل نستخدم توكن منتهي ويفشل الرفع من غير سبب واضح.
export async function requestDriveAccess() {
  await ensureGisLoaded();
  const SAFETY_MARGIN_MS = 60 * 1000;
  if (accessToken && Date.now() < tokenExpiresAt - SAFETY_MARGIN_MS) return accessToken;

  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        accessToken = resp.access_token;
        const expiresInSeconds = Number(resp.expires_in) || 3600;
        tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function driveFetch(url, options = {}) {
  const token = await requestDriveAccess();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error (${res.status}): ${text}`);
  }
  return res;
}

// بيدوّر على فولدر بنفس الاسم جوه درايف المستخدم، ولو مش موجود بينشئه
export async function findOrCreateFolder(folderName) {
  const safeName = folderName.replace(/'/g, "\\'");
  const q = encodeURIComponent(`name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const listRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await listRes.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  const createRes = await driveFetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
  });
  const created = await createRes.json();
  return created.id;
}

// رفع ملف مباشرة من المتصفح لدرايف المستخدم عن طريق الـ resumable upload endpoint
export async function uploadFile(file, folderId) {
  const token = await requestDriveAccess();
  const metadata = { name: file.name, parents: [folderId] };

  const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.type || "application/octet-stream",
    },
    body: JSON.stringify(metadata),
  });
  if (!initRes.ok) throw new Error(await initRes.text());
  const uploadUrl = initRes.headers.get("Location");

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadRes.ok) throw new Error(await uploadRes.text());
  const uploaded = await uploadRes.json();

  const linkRes = await driveFetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}?fields=id,name,webViewLink,mimeType`);
  return await linkRes.json();
}

// بيشارك الملف مع إيميل ثابت (درايف الشركة) عشان الملكية متفضلش مقصورة على حساب شخصي
export async function shareFile(fileId, email, role = "reader") {
  if (!email) return;
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user", role, emailAddress: email }),
  });
}

// بيتأكد إن الرابط فعلاً رابط Drive حقيقي قبل ما نستخدمه كـ href — لأن حقل webViewLink
// مُخزّن في مستند المشروع، والإنتاج/المونتاج عندهم صلاحية تعديل الحقل ده (files)، فلو حد
// بعت رابط مزوّر زي javascript:... مباشرة عن طريق الـ SDK (من غير ما يعدي بواجهة الرفع
// بتاعتنا)، المتصفح ممكن ينفّذه لو حد ضغط عليه. التحقق ده بيمنع عرضه كرابط قابل للنقر أصلاً.
export function isSafeDriveLink(url) {
  return typeof url === "string" && /^https:\/\/drive\.google\.com\//.test(url);
}

// بيحذف الملف من Drive نفسه — بينجح بس لو اللي بيحاول الحذف هو مالك الملف (اللي رفعه فعليًا)
export async function deleteFile(fileId) {
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
  });
}
