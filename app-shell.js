import { watchAuth, logout, db } from "./auth.js";
import { NAV_ITEMS, roleLabel } from "./permissions.js";
import { t, getLang, setLang, applyDirection, applyI18n } from "./i18n.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

applyDirection();

// بيحمي أي صفحة داخلية: يتأكد من تسجيل الدخول، يرسم القائمة الجانبية حسب الدور،
// ويستدعي onReady(profile, user) بعد ما كل حاجة تتجهز — كل صفحة تبني منطقها الخاص جواه.
export function initAppShell(onReady) {
  const sidebarNav = document.getElementById("sidebar-nav");
  const userNameEl = document.getElementById("user-name");
  const userRoleEl = document.getElementById("user-role");
  const logoutBtn = document.getElementById("logout-btn");
  const langBtn = document.getElementById("lang-toggle-side");

  applyI18n();

  let currentProfile = null;

  watchAuth(
    (user, profile) => {
      currentProfile = profile;
      userNameEl.textContent = profile.name || user.email;
      userRoleEl.textContent = roleLabel(profile.role);
      renderNav(sidebarNav, profile.role);
      watchOverdueFollowUps();
      if (onReady) onReady(profile, user);
    },
    (message) => {
      if (message) alert(t("account_disabled_msg"));
      window.location.href = "index.html";
    }
  );

  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  if (langBtn) {
    langBtn.addEventListener("click", () => setLang(getLang() === "ar" ? "en" : "ar"));
  }

  document.addEventListener("mm:langchange", () => {
    if (currentProfile) {
      userRoleEl.textContent = roleLabel(currentProfile.role);
      renderNav(sidebarNav, currentProfile.role);
    }
  });
}

function renderNav(sidebarNav, role) {
  const items = NAV_ITEMS[role] || [];
  const currentPage = window.location.pathname.split("/").filter(Boolean).pop() || "dashboard.html";

  sidebarNav.innerHTML = "";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "nav-item" + (item.built ? "" : " nav-item--soon");
    a.href = item.built ? item.href : "#";

    const label = document.createElement("span");
    label.textContent = t(item.labelKey);
    a.appendChild(label);

    if (item.href === currentPage) a.classList.add("is-active");

    if (!item.built) {
      const badge = document.createElement("span");
      badge.className = "nav-soon-badge";
      badge.textContent = t("badge_soon");
      a.appendChild(badge);
      a.addEventListener("click", (e) => e.preventDefault());
    }

    sidebarNav.appendChild(a);
  });
}

function watchOverdueFollowUps() {
  const link = document.querySelector('.nav-item[href="followup.html"]');
  if (!link) return;

  const badge = document.createElement("span");
  badge.className = "nav-alert-badge";
  badge.hidden = true;
  link.appendChild(badge);

  const today = new Date().toISOString().slice(0, 10);
  onSnapshot(collection(db, "clients"), (snap) => {
    const overdue = snap.docs.filter((d) => {
      const c = d.data();
      return c.nextFollowUpDate && c.nextFollowUpDate < today && c.status !== "closed" && c.status !== "lost";
    }).length;
    if (overdue > 0) {
      badge.textContent = overdue;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  });
}
