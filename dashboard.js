import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

initAppShell(() => {
  watchClientsCount();
});

function watchClientsCount() {
  const statEl = document.getElementById("stat-clients");
  if (!statEl) return;

  onSnapshot(
    collection(db, "clients"),
    (snap) => {
      // "العملاء الحاليين" = كل العملاء ما عدا اللي حالتهم "خسارة"
      const current = snap.docs.filter((d) => d.data().status !== "lost").length;
      statEl.textContent = current;
    },
    () => {
      statEl.textContent = "—";
    }
  );
}
