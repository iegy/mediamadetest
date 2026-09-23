import { loginWithEmail, watchAuth } from "./auth.js";

const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");

// لو المستخدم مسجل دخول بالفعل، يتوجه على طول للداشبورد
watchAuth(
  () => { window.location.href = "dashboard.html"; },
  () => { /* يفضل في صفحة الدخول */ }
);

const ERROR_MESSAGES = {
  "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
  "auth/user-disabled": "تم تعطيل هذا الحساب.",
  "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
  "auth/wrong-password": "كلمة المرور غير صحيحة.",
  "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "auth/too-many-requests": "محاولات كثيرة جدًا، حاول تاني بعد شوية.",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "جاري الدخول...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await loginWithEmail(email, password);
    // التحويل بيحصل تلقائي من خلال watchAuth فوق
  } catch (err) {
    errorBox.textContent = ERROR_MESSAGES[err.code] || "حصل خطأ غير متوقع، حاول تاني.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "تسجيل الدخول";
  }
});
