import { watchAuth, logout, db } from "./auth.js";
import { NAV_ITEMS, ROLE_LABELS } from "./permissions.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// بيحمي أي صفحة داخلية: يتأكد من تسجيل الدخول، يرسم القائمة الجانبية حسب الدور،
// ويستدعي onReady(profile, user) بعد ما كل حاجة تتجهز — كل صفحة تبني منطقها الخاص جواه.
export function initAppShell(onReady) {
  const sidebarNav = document.getElementById("sidebar-nav");
  const userNameEl = document.getElementById("user-name");
  const userRoleEl = document.getElementById("user-role");
  const logoutBtn = document.getElementById("logout-btn");

  watchAuth(
    (user, profile) => {
      userNameEl.textContent = profile.name || user.email;
      userRoleEl.textContent = ROLE_LABELS[profile.role] || profile.role;
      renderNav(sidebarNav, profile.role);
      watchOverdueFollowUps();
      if (onReady) onReady(profile, user);
    },
    (message) => {
      if (message) alert(message);
      window.location.href = "index.html";
    }
  );

  if (logoutBtn) logoutBtn.addEventListener("click", logout);
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

function renderNav(sidebarNav, role) {
  const items = NAV_ITEMS[role] || [];
  const currentPage = window.location.pathname.split("/").filter(Boolean).pop() || "dashboard.html";

  sidebarNav.innerHTML = "";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "nav-item" + (item.built ? "" : " nav-item--soon");
    a.href = item.built ? item.href : "#";

    const label = document.createElement("span");
    label.textContent = item.label;
    a.appendChild(label);

    if (item.href === currentPage) a.classList.add("is-active");

    if (!item.built) {
      const badge = document.createElement("span");
      badge.className = "nav-soon-badge";
      badge.textContent = "قريبًا";
      a.appendChild(badge);
      a.addEventListener("click", (e) => e.preventDefault());
    }

    sidebarNav.appendChild(a);
  });
}
