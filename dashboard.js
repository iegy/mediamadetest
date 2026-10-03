import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { localDateIso } from "./date-utils.js";

initAppShell((profile) => {
  const role = profile.role;
  watchClientStats(role);
  watchProjectStats(role);
  watchFollowUpsCount(role);
  watchPaymentsAndExpenses(role);
});

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function watchClientStats(role) {
  if (!["management", "client_management", "sales"].includes(role)) {
    setText("stat-leads", "—");
    setText("stat-clients", "—");
    return;
  }
  onSnapshot(
    collection(db, "clients"),
    (snap) => {
      const docs = snap.docs.map((d) => d.data());
      setText("stat-leads", docs.filter((c) => c.status === "new").length);
      setText("stat-clients", docs.filter((c) => c.status !== "lost").length);
    },
    () => { setText("stat-leads", "—"); setText("stat-clients", "—"); }
  );
}

function watchProjectStats(role) {
  const ids = ["stat-projects", "stat-completed-projects", "stat-delayed-projects", "stat-total-value"];
  if (!["management", "client_management"].includes(role)) {
    ids.forEach((id) => setText(id, "—"));
    return;
  }
  const today = localDateIso();
  onSnapshot(
    collection(db, "projects"),
    (snap) => {
      const docs = snap.docs.map((d) => d.data());
      const active = docs.filter((p) => p.status !== "completed").length;
      const completed = docs.filter((p) => p.status === "completed").length;
      const delayed = docs.filter((p) => p.status !== "completed" && p.deliveryDate && p.deliveryDate < today).length;
      const totalValue = docs.reduce((s, p) => s + (Number(p.projectValue) || 0), 0);
      setText("stat-projects", active);
      setText("stat-completed-projects", completed);
      setText("stat-delayed-projects", delayed);
      setText("stat-total-value", totalValue.toLocaleString("en-US"));
    },
    () => { ids.forEach((id) => setText(id, "—")); }
  );
}

function watchFollowUpsCount(role) {
  if (!["management", "client_management", "sales"].includes(role)) {
    setText("stat-followups", "—");
    return;
  }
  const today = localDateIso();
  onSnapshot(
    collection(db, "clients"),
    (snap) => {
      const due = snap.docs.filter((d) => {
        const c = d.data();
        return c.nextFollowUpDate && c.nextFollowUpDate <= today && c.status !== "closed" && c.status !== "lost";
      }).length;
      setText("stat-followups", due);
    },
    () => { setText("stat-followups", "—"); }
  );
}

function watchPaymentsAndExpenses(role) {
  const ids = ["stat-collected", "stat-payments", "stat-expenses"];
  if (role !== "management") {
    ids.forEach((id) => setText(id, "—"));
    return;
  }

  let projects = [];
  let payments = [];
  const recomputePayments = () => {
    const paidFor = (id) => payments.filter((p) => p.projectId === id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const collected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = projects.reduce((s, p) => {
      const remaining = (Number(p.projectValue) || 0) - paidFor(p.id);
      return s + (remaining > 0 ? remaining : 0);
    }, 0);
    setText("stat-collected", collected.toLocaleString("en-US"));
    setText("stat-payments", outstanding.toLocaleString("en-US"));
  };
  onSnapshot(collection(db, "projects"), (snap) => {
    projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    recomputePayments();
  }, () => { setText("stat-payments", "—"); });
  onSnapshot(collection(db, "payments"), (snap) => {
    payments = snap.docs.map((d) => d.data());
    recomputePayments();
  }, () => { setText("stat-collected", "—"); setText("stat-payments", "—"); });

  onSnapshot(collection(db, "expenses"), (snap) => {
    const total = snap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
    setText("stat-expenses", total.toLocaleString("en-US"));
  }, () => { setText("stat-expenses", "—"); });
}
