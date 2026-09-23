import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// تسجيل الدخول بإيميل وباسورد
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// تسجيل الخروج
export async function logout() {
  await signOut(auth);
  sessionStorage.removeItem("mm_role");
  sessionStorage.removeItem("mm_name");
  window.location.href = "index.html";
}

// جلب بيانات المستخدم (الاسم والدور) من users/{uid}
export async function fetchUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data(); // { name, role, ... }
}

// مراقب حالة تسجيل الدخول — بيستخدم في كل صفحة محمية وفي صفحة الدخول
// onSignedIn(user, profile) لما يكون فيه مستخدم مسجل وله دور فعّال
// onSignedOut(message?) لما مفيش مستخدم، أو الحساب موجود بس من غير دور مفعّل
export function watchAuth(onSignedIn, onSignedOut) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onSignedOut();
      return;
    }
    const profile = await fetchUserProfile(user.uid);
    if (!profile || !profile.role) {
      onSignedOut("الحساب ده لسه مش مفعّل. تواصل مع الإدارة لإضافة صلاحيتك.");
      return;
    }
    sessionStorage.setItem("mm_role", profile.role);
    sessionStorage.setItem("mm_name", profile.name || user.email || "");
    onSignedIn(user, profile);
  });
}
