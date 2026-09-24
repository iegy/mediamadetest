import { loginWithEmail, watchAuth } from "./auth.js";
import { t, getLang, setLang, applyDirection, applyI18n } from "./i18n.js";

applyDirection();
applyI18n();

const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");
const langBtn = document.getElementById("lang-toggle");

langBtn.addEventListener("click", () => {
  setLang(getLang() === "ar" ? "en" : "ar");
});

// لو المستخدم مسجل دخول بالفعل، يتوجه على طول للداشبورد
watchAuth(
  () => { window.location.href = "dashboard.html"; },
  () => { /* يفضل في صفحة الدخول */ }
);

const ERROR_KEYS = {
  "auth/invalid-email": "err_invalid_email",
  "auth/user-disabled": "err_user_disabled",
  "auth/user-not-found": "err_user_not_found",
  "auth/wrong-password": "err_wrong_password",
  "auth/invalid-credential": "err_invalid_credential",
  "auth/too-many-requests": "err_too_many_requests",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = t("btn_login_loading");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await loginWithEmail(email, password);
    // التحويل بيحصل تلقائي من خلال watchAuth فوق
  } catch (err) {
    errorBox.textContent = t(ERROR_KEYS[err.code] || "err_generic");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t("btn_login");
  }
});
