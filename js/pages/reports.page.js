/**
 * Hisaab Pro — Reports (Phase 7)
 * Pie chart · Monthly bar chart · Category breakdown · Income vs Expense
 * CSV export. Uses Chart.js loaded from CDN.
 */
import { icon }             from "../components/icons.js";
import { getUser }          from "../services/firebase/auth.service.js";
import { getTransactions, getCategoryTotals, getMonthlyTotals, getAllTimeBalance }
                            from "../services/firebase/transactions.service.js";
import { formatMoney, formatDate } from "../utils/formatters.js";
import { toastSuccess, toastInfo } from "../components/toast.js";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, APP } from "../../config/app.config.js";
import { LocalStore }       from "../services/storage/local.service.js";

const ALL_CATS = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const currency = () => LocalStore.get("preferences", {})?.currency || APP.defaultCurrency;
const fmt = v => formatMoney(v, currency());

let charts = {};

export default async function render(outlet) {
  // Destroy previous charts to prevent canvas conflicts on re-render
  Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
  charts = {};

  const u = getUser();
  outlet.innerHTML = `
  <div class="page-head">
    <div><span class="eyebrow">Insight</span><h1>Reports</h1></div>
    <button class="btn btn--ghost" id="csv-export-btn">${icon("file-text")} Export CSV</button>
  </div>

  <div class="report-filter-bar">
    <div class="select-wrap select-wrap--sm">${icon("chevron-down","select-caret")}
      <select class="input" id="report-period">
        <option value="all">All time</option>
        ${last12Months().map(m=>`<option value="${m.value}">${m.label}</option>`).join("")}
      </select></div>
  </div>

  <div id="report-body"><div class="skeleton skeleton--block" style="height:400px"></div></div>`;

  let period = "all";
  outlet.querySelector("#report-period").addEventListener("change", async e => {
    period = e.target.value;
    await loadReports(outlet, u, period);
  });
  outlet.querySelector("#csv-export-btn").addEventListener("click", () => exportCSV(u));

  await loadReports(outlet, u, period);

  // Cleanup on page unmount
  return () => { Object.values(charts).forEach(c => { try { c.destroy(); } catch {} }); charts = {}; };
}

async function loadReports(outlet, u, period) {
  const body = outlet.querySelector("#report-body");
  body.innerHTML = `<div class="skeleton skeleton--block" style="height:400px"></div>`;

  const [allTxns, expCats, incCats, monthly, balance] = await Promise.all([
    getTransactions(u.uid).catch(() => []),
    getCategoryTotals(u.uid, "expense", period !== "all" ? period : null).catch(() => ({})),
    getCategoryTotals(u.uid, "income",  period !== "all" ? period : null).catch(() => ({})),
    getMonthlyTotals(u.uid, 6).catch(() => []),
    getAllTimeBalance(u.uid).catch(() => ({ income:0, expenses:0, balance:0 }))
  ]);

  let txns = allTxns;
  if (period !== "all") txns = txns.filter(t => (t.date||"").startsWith(period));
  const periodIncome   = txns.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const periodExpenses = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);

  body.innerHTML = `
  <!-- Summary KPIs -->
  <div class="grid grid-4 stagger" style="margin-bottom:28px">
    ${repKpi("Total Income",   balance.income,  "success")}
    ${repKpi("Total Expenses", balance.expenses,"danger")}
    ${repKpi("Net Balance",    balance.balance, balance.balance>=0?"success":"danger")}
    ${repKpi("Transactions",   allTxns.length,  "primary", true)}
  </div>

  <div class="reports-grid">
    <!-- Expense pie -->
    <div class="card card--pad-lg" data-anim>
      <div class="card-header"><div class="card-title">Expense Breakdown</div></div>
      <div class="chart-wrap" style="height:280px"><canvas id="pie-chart"></canvas></div>
    </div>

    <!-- Income vs Expense bar -->
    <div class="card card--pad-lg" data-anim>
      <div class="card-header"><div class="card-title">Income vs Expenses — Last 6 Months</div></div>
      <div class="chart-wrap" style="height:280px"><canvas id="bar-chart"></canvas></div>
    </div>

    <!-- Category breakdown table -->
    <div class="card card--pad-lg" data-anim>
      <div class="card-header">
        <div class="card-title">Category Breakdown</div>
        <div class="seg-tabs">
          <button class="seg-btn is-active" id="cat-btn-exp">Expenses</button>
          <button class="seg-btn" id="cat-btn-inc">Income</button>
        </div>
      </div>
      <div id="cat-table">${categoryTable(expCats, "expense")}</div>
    </div>

    <!-- Net worth line (simple) -->
    <div class="card card--pad-lg" data-anim>
      <div class="card-header"><div class="card-title">Monthly Net (6 months)</div></div>
      <div class="chart-wrap" style="height:280px"><canvas id="line-chart"></canvas></div>
    </div>
  </div>`;

  // Switch category table
  let showInc = false;
  outlet.querySelector("#cat-btn-exp")?.addEventListener("click", e => {
    showInc = false;
    outlet.querySelectorAll("#cat-btn-exp,#cat-btn-inc").forEach(b=>b.classList.toggle("is-active",!showInc ? b.id==="cat-btn-exp" : b.id==="cat-btn-inc"));
    outlet.querySelector("#cat-table").innerHTML = categoryTable(expCats, "expense");
  });
  outlet.querySelector("#cat-btn-inc")?.addEventListener("click", e => {
    showInc = true;
    outlet.querySelectorAll("#cat-btn-exp,#cat-btn-inc").forEach(b=>b.classList.toggle("is-active",showInc ? b.id==="cat-btn-inc" : b.id==="cat-btn-exp"));
    outlet.querySelector("#cat-table").innerHTML = categoryTable(incCats, "income");
  });

  // Render charts after DOM is ready
  requestAnimationFrame(() => drawCharts(expCats, incCats, monthly));
}

function drawCharts(expCats, incCats, monthly) {
  const Chart = window.Chart;
  if (!Chart) {
    document.querySelectorAll(".chart-wrap").forEach(el => {
      el.innerHTML = `<div class="empty" style="height:100%">${icon("bar-chart")}<div class="sec-sub">Chart.js is loading…<br>Refresh if this persists.</div></div>`;
    });
    return;
  }

  const theme = getComputedStyle(document.documentElement);
  const gridColor = theme.getPropertyValue("--c-border").trim() || "rgba(255,255,255,0.08)";
  const textColor = theme.getPropertyValue("--c-text-mute").trim() || "#888";
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = textColor;

  // -- Pie chart: expense categories --
  const pieCanvas = document.getElementById("pie-chart");
  if (pieCanvas) {
    const entries = Object.entries(expCats).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a);
    if (entries.length) {
      charts.pie = new Chart(pieCanvas, {
        type: "doughnut",
        data: {
          labels: entries.map(([id]) => ALL_CATS.find(c=>c.id===id)?.label || id),
          datasets: [{ data: entries.map(([,v])=>v), backgroundColor: entries.map(([id]) => ALL_CATS.find(c=>c.id===id)?.color || "#8b7cff"), borderWidth: 2, borderColor: "var(--c-elevated)", hoverOffset: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 14, padding: 16 } } }, cutout: "60%" }
      });
    } else {
      pieCanvas.parentElement.innerHTML = `<div class="empty" style="height:100%">${icon("pie-chart")}<div class="sec-sub">No expense data yet.</div></div>`;
    }
  }

  // -- Bar chart: income vs expenses per month --
  const barCanvas = document.getElementById("bar-chart");
  if (barCanvas && monthly.length) {
    charts.bar = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: monthly.map(m => m.label),
        datasets: [
          { label: "Income",   data: monthly.map(m=>m.income),   backgroundColor: "rgba(91,231,169,0.75)", borderRadius: 6 },
          { label: "Expenses", data: monthly.map(m=>m.expenses), backgroundColor: "rgba(255,107,125,0.75)", borderRadius: 6 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { color: gridColor }, ticks: { callback: v => fmt(v) } }
      }}
    });
  }

  // -- Line chart: net per month --
  const lineCanvas = document.getElementById("line-chart");
  if (lineCanvas && monthly.length) {
    charts.line = new Chart(lineCanvas, {
      type: "line",
      data: {
        labels: monthly.map(m => m.label),
        datasets: [{
          label: "Net", data: monthly.map(m=>m.net),
          borderColor: "var(--c-primary)", backgroundColor: "rgba(139,124,255,0.12)",
          borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: "var(--c-primary)",
          tension: 0.35, fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { color: gridColor }, ticks: { callback: v => fmt(v) } }
      }}
    });
  }
}

function categoryTable(cats, type) {
  const total = Object.values(cats).reduce((s,v)=>s+v, 0);
  const entries = Object.entries(cats).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a);
  if (!entries.length) return `<div class="sec-sub" style="padding:16px 0">No ${type} data for this period.</div>`;
  return `<table class="report-table">
    <thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead>
    <tbody>${entries.map(([id, val]) => {
      const cat = ALL_CATS.find(c=>c.id===id);
      const pct = total > 0 ? Math.round((val/total)*100) : 0;
      return `<tr>
        <td><span class="cat-dot" style="background:${cat?.color||"var(--c-border)"}"></span>${cat?.label||id}</td>
        <td class="figure">${fmt(val)}</td>
        <td><div class="mini-bar"><div style="width:${pct}%;background:${cat?.color||"var(--c-primary)"}"></div></div><span>${pct}%</span></td>
      </tr>`;
    }).join("")}</tbody>
    <tfoot><tr><td><strong>Total</strong></td><td class="figure"><strong>${fmt(total)}</strong></td><td></td></tr></tfoot>
  </table>`;
}

async function exportCSV(u) {
  const txns = await getTransactions(u.uid).catch(() => []);
  if (!txns.length) { toastInfo("No transactions to export."); return; }
  const header = ["Date","Type","Category","Description","Amount","Receipt"];
  const rows = txns.map(t => [
    t.date || "",
    t.type,
    ALL_CATS.find(c=>c.id===t.category)?.label || t.category || "",
    `"${(t.description||"").replace(/"/g,'""')}"`,
    t.amount,
    t.receiptUrl || ""
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hisaab-transactions-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toastSuccess(`Exported ${txns.length} transactions.`, "CSV Downloaded");
}

function repKpi(label, value, color, isCount = false) {
  return `<div class="card kpi-card" data-anim>
    <div class="figure kpi-val ${color}">${isCount ? value.toLocaleString() : fmt(value)}</div>
    <div class="kpi-label">${label}</div>
  </div>`;
}

function last12Months() {
  return Array.from({length:12},(_,i)=>{
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    return { value: d.toISOString().slice(0,7), label: d.toLocaleDateString("en-PK",{month:"long",year:"numeric"}) };
  });
}
