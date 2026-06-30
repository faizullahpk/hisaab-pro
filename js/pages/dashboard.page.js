/**
 * Hisaab Pro — Dashboard (Phase 3)
 * Live financial command center:
 *   Current Balance · Savings · Income/Expenses This Month
 *   Recent Transactions · Quick Add · Pending Client Payments
 *   Money I Owe · Money Others Owe Me
 */
import { icon }                   from "../components/icons.js";
import { getUser }                from "../services/firebase/auth.service.js";
import { getAllTimeBalance, getMonthSummary, getRecentTransactions, addTransaction }
                                  from "../services/firebase/transactions.service.js";
import { getAllPendingPayments }  from "../services/firebase/clients.service.js";
import { getDebtSummary }         from "../services/firebase/debts.service.js";
import { getTotalSaved }          from "../services/firebase/savings.service.js";
import { formatMoney, formatDate } from "../utils/formatters.js";
import { countUp }                from "../utils/animations.js";
import { greeting }               from "../utils/helpers.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, APP } from "../../config/app.config.js";
import { LocalStore }             from "../services/storage/local.service.js";
import { isCloudinaryConfigured } from "../services/cloudinary/cloudinary.service.js";

const currency = () => LocalStore.get("preferences", {})?.currency || APP.defaultCurrency;
const fmt = v => formatMoney(v, currency());

export default async function render(outlet) {
  const u = getUser();
  outlet.innerHTML = buildSkeleton();

  const [bal, monthData, recent, pending, debtSummary, savedTotal] = await Promise.all([
    getAllTimeBalance(u.uid).catch(() => ({ income: 0, expenses: 0, balance: 0 })),
    getMonthSummary(u.uid).catch(() => ({ income: 0, expenses: 0 })),
    getRecentTransactions(u.uid, 8).catch(() => []),
    getAllPendingPayments(u.uid).catch(() => []),
    getDebtSummary(u.uid).catch(() => ({ iOwe: 0, owedMe: 0 })),
    getTotalSaved(u.uid).catch(() => 0)
  ]);

  const totalOwed = debtSummary.owedMe + pending.reduce((s, p) => s + Number(p.amount), 0);

  outlet.innerHTML = `
  <div class="page-head dash-head">
    <div>
      <span class="eyebrow">${new Date().toLocaleDateString("en-PK",{weekday:"long",month:"long",day:"numeric"})}</span>
      <h1>${greeting()}, ${esc(u.name?.split(" ")[0] || "there")}.</h1>
    </div>
    <div class="dash-quick-btns">
      <button class="btn btn--primary" id="quick-income">${icon("arrow-up")} Add Income</button>
      <button class="btn btn--ghost"   id="quick-expense">${icon("arrow-down")} Add Expense</button>
    </div>
  </div>

  <div class="grid grid-4 stagger dash-kpis">
    ${kpi("Current Balance", bal.balance,      "wallet",     bal.balance   < 0 ? "danger" : "primary", "")}
    ${kpi("Total Savings",   savedTotal,        "piggy",      "success",   "")}
    ${kpi("Income",          monthData.income,  "arrow-up",   "success",   "This month")}
    ${kpi("Expenses",        monthData.expenses,"arrow-down", "danger",    "This month")}
  </div>

  <div class="dash-grid">
    <div class="col gap-6">
      <div class="card card--pad-lg" data-anim>
        <div class="card-header">
          <div><span class="eyebrow">Activity</span><div class="card-title">Recent Transactions</div></div>
          <a class="btn btn--subtle" href="#/income-expenses">All ${icon("arrow-right")}</a>
        </div>
        <div id="recent-list">
          ${recent.length ? recent.map(txnRow).join("") : emptyState("receipt","No transactions yet","Add your first income or expense.")}
        </div>
      </div>

      <div class="card card--pad-lg" data-anim>
        <div class="card-header">
          <div><span class="eyebrow">Clients</span><div class="card-title">Pending Payments</div></div>
          <a class="btn btn--subtle" href="#/clients-debts">All ${icon("arrow-right")}</a>
        </div>
        <div id="pending-list">
          ${pending.length ? pending.slice(0,5).map(pendingRow).join("") : emptyState("briefcase","No pending payments","Add clients and log their invoices.")}
        </div>
        ${pending.length > 5 ? `<div class="list-more">+${pending.length-5} more pending</div>` : ""}
      </div>
    </div>

    <div class="col gap-6">
      <div class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Money Overview</div></div>
        <div class="debt-overview">
          <div class="debt-row">
            <span class="txn-ic txn-ic--expense">${icon("arrow-down")}</span>
            <div class="debt-text"><div class="debt-label">Money I Owe</div><div class="debt-sub">Active debts</div></div>
            <div class="figure danger">${fmt(debtSummary.iOwe)}</div>
          </div>
          <div class="debt-row">
            <span class="txn-ic txn-ic--income">${icon("arrow-up")}</span>
            <div class="debt-text"><div class="debt-label">Others Owe Me</div><div class="debt-sub">Lent + pending invoices</div></div>
            <div class="figure success">${fmt(totalOwed)}</div>
          </div>
          <div style="height:1px;background:var(--c-border);margin:8px 0"></div>
          <div class="debt-row">
            <span class="txn-ic" style="background:var(--glass-bg)">${icon("scale")}</span>
            <div class="debt-text"><div class="debt-label">Net Position</div></div>
            <div class="figure ${totalOwed - debtSummary.iOwe >= 0 ? "success" : "danger"}">${fmt(totalOwed - debtSummary.iOwe)}</div>
          </div>
        </div>
      </div>

      <div class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">This Month</div></div>
        <div class="month-bars">
          ${mbar("Income",  monthData.income,   "income",  monthData.income + monthData.expenses)}
          ${mbar("Expenses",monthData.expenses, "expense", monthData.income + monthData.expenses)}
          ${mbar("Net",     Math.abs(monthData.income - monthData.expenses), "net", Math.max(monthData.income, monthData.expenses) || 1, monthData.income - monthData.expenses)}
        </div>
        <a class="btn btn--ghost btn--block" href="#/reports" style="margin-top:16px">${icon("pie-chart")} Full Report</a>
      </div>
    </div>
  </div>`;

  // Animate counters
  outlet.querySelectorAll("[data-count]").forEach(el => {
    countUp(el, Number(el.dataset.count), { format: n => fmt(Math.round(n)), duration: 1.2 });
  });

  outlet.querySelector("#quick-income")?.addEventListener("click",  () => openQuickAdd("income",  outlet, u));
  outlet.querySelector("#quick-expense")?.addEventListener("click", () => openQuickAdd("expense", outlet, u));
}

async function openQuickAdd(type, outlet, u) {
  const { openDrawer } = await import("../components/modal.js");
  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const body = document.createElement("form");
  body.className = "col gap-4";
  body.innerHTML = `
    <div class="field"><label class="field-label">Amount</label>
      <div class="input-wrap">${icon("coins","input-icon")}
        <input class="input input--icon" id="qa-amount" type="number" min="0" step="1" placeholder="0" required autofocus />
      </div></div>
    <div class="field"><label class="field-label">Category</label>
      <div class="select-wrap">${icon("chevron-down","select-caret")}
        <select class="input" id="qa-cat">${cats.map(c=>`<option value="${c.id}">${c.label}</option>`).join("")}</select>
      </div></div>
    <div class="field"><label class="field-label">Description</label>
      <input class="input" id="qa-desc" type="text" placeholder="What was this for?" /></div>
    <div class="field"><label class="field-label">Date</label>
      <input class="input" id="qa-date" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
    <button class="btn btn--primary btn--lg btn--block" type="submit" id="qa-save">
      ${icon(type==="income"?"arrow-up":"arrow-down")} Save ${type==="income"?"Income":"Expense"}
    </button>`;

  const { close } = openDrawer({ title: `Quick Add ${type==="income"?"Income":"Expense"}`, body, width: "sm" });
  body.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = body.querySelector("#qa-save");
    btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span> Saving…`;
    try {
      await addTransaction(u.uid, {
        type,
        amount:      Number(body.querySelector("#qa-amount").value),
        category:    body.querySelector("#qa-cat").value,
        description: body.querySelector("#qa-desc").value,
        date:        body.querySelector("#qa-date").value
      });
      toastSuccess(`${type==="income"?"Income":"Expense"} saved.`);
      close();
      await render(outlet);
    } catch(err) { toastError(err.message||"Couldn't save."); btn.disabled=false; btn.textContent="Save"; }
  });
}

function kpi(label, value, ic, color, sub) {
  return `<div class="card card--hover kpi-card">
    <div class="kpi-top">
      <span class="kpi-ic kpi-ic--${color}">${icon(ic)}</span>
      ${sub ? `<span class="kpi-sub">${sub}</span>` : ""}
    </div>
    <div class="figure kpi-val ${color}" data-count="${value}">${fmt(value)}</div>
    <div class="kpi-label">${label}</div>
  </div>`;
}

function txnRow(t) {
  const inc = t.type === "income";
  return `<div class="txn-row">
    <span class="txn-ic txn-ic--${inc?"income":"expense"}">${icon(inc?"arrow-up":"arrow-down")}</span>
    <div class="txn-text">
      <div class="txn-desc">${esc(t.description || t.category || "—")}</div>
      <div class="txn-meta">${esc(t.category)} · ${formatDate(t.date,"short")}</div>
    </div>
    <div class="figure txn-amt ${inc?"success":"danger"}">${inc?"+":"-"}${fmt(t.amount)}</div>
  </div>`;
}

function pendingRow(p) {
  return `<div class="txn-row">
    <span class="txn-ic txn-ic--pending">${icon("briefcase")}</span>
    <div class="txn-text">
      <div class="txn-desc">${esc(p.clientName||"Client")}</div>
      <div class="txn-meta">${esc(p.description||"Invoice")}</div>
    </div>
    <div class="figure txn-amt warning">${fmt(p.amount)}</div>
  </div>`;
}

function mbar(label, value, type, total, rawVal) {
  const pct = total > 0 ? Math.min(100, (Math.abs(value)/total)*100) : 0;
  const colClass = type==="net" ? (rawVal>=0?"success":"danger") : type==="income"?"success":"danger";
  return `<div class="mbar-row">
    <span class="mbar-label">${label}</span>
    <div class="mbar-track"><div class="mbar-fill mbar-fill--${type}" style="width:${pct}%"></div></div>
    <span class="figure mbar-val ${colClass}">${fmt(rawVal !== undefined ? rawVal : value)}</span>
  </div>`;
}

function emptyState(ic, title, sub) {
  return `<div class="empty-inline">${icon(ic)}<div><div class="sec-title">${title}</div><div class="sec-sub">${sub}</div></div></div>`;
}

function buildSkeleton() {
  const c = n => Array(n).fill('<div class="card" style="min-height:110px"><div class="skeleton skeleton--block" style="height:70px"></div></div>').join("");
  return `<div><div class="skeleton skeleton--block" style="width:300px;height:40px;margin-bottom:28px"></div>
    <div class="grid grid-4" style="margin-bottom:24px">${c(4)}</div>
    <div class="dash-grid">${c(2)}</div></div>`;
}

const esc = s => String(s||"").replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
