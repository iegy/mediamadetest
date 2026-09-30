import { db, auth } from "./auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let cachedActorName = "";
let cachedActorRole = "";

// بتتنادى مرة واحدة من app-shell.js أول ما يتعرف دور المستخدم، عشان أي صفحة تقدر تسجّل نشاط
export function setActivityActor(name, role) {
  cachedActorName = name || "";
  cachedActorRole = role || "";
}

// actionKey: مفتاح i18n زي "act_client_created"، entityLabel: وصف مختصر (اسم العميل، اسم الملف...)
export async function logActivity(actionKey, entityLabel) {
  try {
    await addDoc(collection(db, "activity"), {
      actorId: auth.currentUser ? auth.currentUser.uid : null,
      actorName: cachedActorName || (auth.currentUser ? auth.currentUser.email : ""),
      actorRole: cachedActorRole,
      action: actionKey,
      entityLabel: entityLabel || "",
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // لو فشل التسجيل (مثلاً صلاحيات) منوقفش العملية الأساسية بسببه
    console.warn("Could not log activity:", e);
  }
}
