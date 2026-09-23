import { watchAuth, logout } from "./auth.js";
import { NAV_ITEMS, ROLE_LABELS } from "./permissions.js";

const sidebarNav = document.getElementById("sidebar-nav");
const userNameEl = document.getElementById("user-name");
const userRoleEl = document.getElementById("user-role");
const logoutBtn = document.getElementById("logout-btn");

watchAuth(
  (user, profile) => {
    userNameEl.textContent = profile.name || user.email;
    userRoleEl.textContent = ROLE_LABELS[profile.role] || profile.role;
    renderNav(profile.role);
  },
  (message) => {
    if (message) alert(message);
    window.location.href = "index.html";
  }
);

function renderNav(role) {
  const items = NAV_ITEMS[role] || [];
  sidebarNav.innerHTML = "";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "nav-item" + (item.built ? "" : " nav-item--soon");
    a.href = item.built ? item.href : "#";

    const label = document.createElement("span");
    label.textContent = item.label;
    a.appendChild(label);

    if (item.key === "dashboard") a.classList.add("is-active");

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

logoutBtn.addEventListener("click", logout);
