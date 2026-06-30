/**
 * Hisaab Pro — Income & Expenses (Phase 4)
 * Full CRUD: add, edit, delete, search, filter by category/date/type.
 * Receipt upload to Cloudinary. Transactions grouped by month.
 */
import { icon }               from "../components/icons.js";
import { getUser }            from "../services/firebase/auth.service.js";
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, searchTransactions }
                              from "../services/firebase/transactions.service.js";
import { uploadToCloudinary, isCloudinaryConfigured }
                              from "../services/cloudinary/cloudinary.service.js";
import { formatMoney, formatDate } from "../utils/formatters.js";
import { readAsDataURL }      from "../utils/helpers.js";
import { toastSuccess, toastError, toastInfo } from "../components/toast.js";
import { openDrawer, confirm }  from "../components/modal.js";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, APP } from "../../config/app.config.js";
import { LocalStore }         from "../services/storage/local.service.js";

const ALL_CATS = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const currency = () => LocalStore.get("preferences", {})?.currency || APP.defaultCurrency;
const fmt = v => formatMoney(v, currency());

let state = { tab: "all", search: "", category: "", month: "" };

export default async function render(outlet) {
  const u = getUser();
  state = { tab: "all", search: "", category: "", month: "" };
  outlet.innerHTML = pageShell();
  attachTabListeners(outlet);
  await reload(outlet, u);
}

function pageShell() {
  return `
  <div class="page-head">
    <div><span class="eyebrow">Finance</span><h1>Income & Expenses</h1></div>
    <button class="btn btn--primary" id="add-txn-btn">${icon("plus")} Add Transaction</button>
  </div>

  <!-- Tabs + Search + Filters -->
  <div class="module-toolbar">
    <div class="seg-tabs" id="txn-tabs">
      <button class="seg-btn is-active" data-tab="all">All</button>
      <button class="seg-btn" data-tab="income">${icon("arrow-up")} Income</button>
      <button class="seg-btn" data-tab="expense">${icon("arrow-down")} Expenses</button>
    </div>
    <div class="toolbar-right">
      <div class="searchbar-inline">
        ${icon("search","input-icon")}
        <input class="input input--icon" id="txn-search" placeholder="Search transactions…" type="search" />
      </div>
      <div class="filter-row">
        <div class="select-wrap select-wrap--sm">${icon("chevron-down","select-caret")}
          <select class="input" id="filter-cat"><option value="">All categories</option>
            ${ALL_CATS.map(c=>`<option value="${c.id}">${c.label}</option>`).join("")}
          </select></div>
        <div class="select-wrap select-wrap--sm">${icon("chevron-down","select-caret")}
          <select class="input" id="filter-month"><option value="">All months</option>
            ${last12Months().map(m=>`<option value="${m.value}">${m.label}</option>`).join("")}
          </select></div>
      </div>
    </div>
  </div>

  <!-- Transaction list -->
  <div id="txn-body" class="txn-module-body">
    <div class="skeleton skeleton--block" style="height:200px"></div>
  </div>`;
}

async function reload(outlet, u) {
  const body = outlet.querySelector("#txn-body");
  body.innerHTML = `<div class="skeleton skeleton--block" style="height:200px"></div>`;

  try {
    let txns;
    if (state.search.length >= 2) {
      txns = await searchTransactions(u.uid, state.search);
    } else {
      txns = await getTransactions(u.uid, state.tab !== "all" ? { type: state.tab } : {});
    }
    if (state.category) txns = txns.filter(t => t.category === state.category);
    if (state.month)    txns = txns.filter(t => (t.date||"").startsWith(state.month));

    body.innerHTML = txns.length ? renderGrouped(txns) : `
      <div class="empty" style="padding:48px 0">
        ${icon("receipt")}<div>
          <div class="sec-title">No transactions</div>
          <div class="sec-sub">Tap "+ Add Transaction" to get started.</div>
        </div></div>`;

    // wire edit/delete buttons
    body.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => openForm(outlet, u, btn.dataset.edit)));
    body.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => doDelete(outlet, u, btn.dataset.del)));
    // summary bar
    const inc  = txns.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
    const exp  = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
    const sumBar = outlet.querySelector("#txn-summary");
    if (sumBar) sumBar.innerHTML = `
      <span class="sum-item success">${icon("arrow-up")} ${fmt(inc)}</span>
      <span class="sum-sep">·</span>
      <span class="sum-item danger">${icon("arrow-down")} ${fmt(exp)}</span>
      <span class="sum-sep">·</span>
      <span class="sum-item ${inc-exp>=0?"success":"danger"}">Net ${fmt(inc-exp)}</span>`;
  } catch (err) {
    body.innerHTML = `<div class="empty"><div class="sec-title">Couldn't load transactions</div><div class="sec-sub">${err.message||""}</div></div>`;
  }

  // wire add btn
  outlet.querySelector("#add-txn-btn")?.addEventListener("click", () => openForm(outlet, u, null));
}

function renderGrouped(txns) {
  const months = {};
  txns.forEach(t => {
    const ym = (t.date||new Date().toISOString()).slice(0,7);
    if (!months[ym]) months[ym] = [];
    months[ym].push(t);
  });

  let html = `<div class="txn-summary-bar" id="txn-summary"></div>`;
  Object.keys(months).sort((a,b)=>b.localeCompare(a)).forEach(ym => {
    const group = months[ym];
    const monthInc = group.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
    const monthExp = group.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
    const [yr,mo] = ym.split("-");
    const label = new Date(yr, mo-1).toLocaleDateString("en-PK",{month:"long",year:"numeric"});
    html += `<div class="txn-month-group">
      <div class="txn-month-head">
        <span class="txn-month-label">${label}</span>
        <span class="txn-month-stats">
          <span class="success">+${fmt(monthInc)}</span>
          <span class="danger">-${fmt(monthExp)}</span>
        </span>
      </div>
      ${group.map(txnCard).join("")}
    </div>`;
  });
  return html;
}

function txnCard(t) {
  const inc = t.type === "income";
  const cat = ALL_CATS.find(c=>c.id===t.category);
  return `<div class="txn-card">
    <span class="txn-ic txn-ic--${inc?"income":"expense"} txn-ic--lg">${icon(inc?"arrow-up":"arrow-down")}</span>
    <div class="txn-info">
      <div class="txn-desc">${esc(t.description||cat?.label||t.category||"—")}</div>
      <div class="txn-meta">
        <span class="badge" style="background:${cat?.color||"var(--c-border)"}22;color:${cat?.color||"var(--c-text-mute)"};border:1px solid ${cat?.color||"var(--c-border)"}44">
          ${cat?.label||t.category}
        </span>
        · ${formatDate(t.date,"medium")}
        ${t.receiptUrl ? `· <a href="${t.receiptUrl}" target="_blank" rel="noopener" class="txn-receipt">${icon("file-text")} Receipt</a>` : ""}
      </div>
    </div>
    <div class="txn-right">
      <div class="figure txn-amount ${inc?"success":"danger"}">${inc?"+":"-"}${fmt(t.amount)}</div>
      <div class="txn-actions">
        <button class="icon-btn icon-btn--sm" data-edit="${t.id}" title="Edit">${icon("edit")}</button>
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-del="${t.id}" title="Delete">${icon("trash")}</button>
      </div>
    </div>
  </div>`;
}

function attachTabListeners(outlet) {
  outlet.addEventListener("click", e => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    outlet.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.tab = btn.dataset.tab;
    const u = getUser();
    reload(outlet, u);
  });

  let searchTimer;
  outlet.addEventListener("input", e => {
    const el = e.target;
    if (el.id === "txn-search")    { clearTimeout(searchTimer); state.search = el.value; searchTimer = setTimeout(() => reload(outlet, getUser()), 320); }
    if (el.id === "filter-cat")    { state.category = el.value; reload(outlet, getUser()); }
    if (el.id === "filter-month")  { state.month    = el.value; reload(outlet, getUser()); }
  });
}

/* ---- Add/Edit form ---- */
async function openForm(outlet, u, editId) {
  let existing = null;
  if (editId) {
    const all = await getTransactions(u.uid);
    existing = all.find(t => t.id === editId);
  }
  const isEdit = Boolean(existing);
  const t = existing || { type: state.tab === "expense" ? "expense" : "income", date: new Date().toISOString().slice(0,10) };

  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `
    <div class="seg-tabs" id="form-type-tabs">
      <button class="seg-btn ${t.type==="income"?"is-active":""}" data-type="income">${icon("arrow-up")} Income</button>
      <button class="seg-btn ${t.type==="expense"?"is-active":""}" data-type="expense">${icon("arrow-down")} Expense</button>
    </div>

    <div class="field"><label class="field-label">Amount</label>
      <div class="input-wrap">${icon("coins","input-icon")}
        <input class="input input--icon" id="f-amount" type="number" min="0" step="1" value="${existing?.amount||""}" placeholder="0" required />
      </div></div>

    <div class="field"><label class="field-label">Category</label>
      <div class="select-wrap">${icon("chevron-down","select-caret")}
        <select class="input" id="f-cat">${buildCatOptions(t.type, existing?.category)}</select>
      </div></div>

    <div class="field"><label class="field-label">Description</label>
      <input class="input" id="f-desc" type="text" value="${esc(existing?.description||"")}" placeholder="What was this for?" /></div>

    <div class="field"><label class="field-label">Date</label>
      <input class="input" id="f-date" type="date" value="${t.date}" /></div>

    ${isCloudinaryConfigured ? `
    <div class="field"><label class="field-label">Receipt</label>
      <div class="receipt-upload-area" id="receipt-area">
        ${existing?.receiptUrl
          ? `<a href="${existing.receiptUrl}" target="_blank" class="receipt-preview">${icon("file-text")} ${esc(existing.receiptName||"View receipt")}</a>
             <button type="button" class="btn btn--subtle" id="change-receipt">Change</button>`
          : `<label class="btn btn--ghost" for="f-receipt">${icon("upload")} Upload Receipt</label>`}
        <input type="file" id="f-receipt" accept="image/*,.pdf" hidden />
        <div class="receipt-progress hidden" id="receipt-progress"><div class="bar"></div><span id="receipt-pct">0%</span></div>
        <div id="receipt-status" class="field-hint"></div>
      </div></div>` : ""}

    <div class="flex gap-3">
      <button class="btn btn--primary btn--block" id="f-save">${isEdit ? icon("save")+" Update" : icon("plus")+" Add Transaction"}</button>
    </div>`;

  // Type tab switching inside form
  let selectedType = t.type;
  body.addEventListener("click", e => {
    const typeBtn = e.target.closest("[data-type]");
    if (!typeBtn) return;
    selectedType = typeBtn.dataset.type;
    body.querySelectorAll("[data-type]").forEach(b => b.classList.toggle("is-active", b === typeBtn));
    const cats = selectedType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    body.querySelector("#f-cat").innerHTML = buildCatOptions(selectedType, null);
  });

  // Receipt upload
  let receiptData = { url: existing?.receiptUrl||null, name: existing?.receiptName||null };
  body.addEventListener("change", async e => {
    if (e.target.id !== "f-receipt") return;
    const file = e.target.files?.[0]; if (!file) return;
    const progress = body.querySelector("#receipt-progress");
    const pctEl   = body.querySelector("#receipt-pct");
    const status  = body.querySelector("#receipt-status");
    progress.classList.remove("hidden");
    status.textContent = "Uploading…";
    try {
      const res = await uploadToCloudinary(file, {
        folder: "hisaab-pro/receipts",
        tags:   ["receipt"],
        onProgress: pct => { progress.querySelector(".bar").style.width=pct+"%"; pctEl.textContent=pct+"%"; }
      });
      receiptData = { url: res.secureUrl, name: file.name };
      status.innerHTML = `${icon("check")} Uploaded: <a href="${res.secureUrl}" target="_blank">${esc(file.name)}</a>`;
      progress.classList.add("hidden");
    } catch (err) {
      status.textContent = "Upload failed: " + (err.message||"");
      progress.classList.add("hidden");
    }
  });

  const { close } = openDrawer({ title: isEdit ? "Edit Transaction" : "New Transaction", body });

  body.querySelector("#f-save").addEventListener("click", async () => {
    const amount = Number(body.querySelector("#f-amount").value);
    if (!amount) { toastError("Enter an amount."); return; }
    const btn = body.querySelector("#f-save");
    btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span> Saving…`;
    try {
      const payload = {
        type:        selectedType,
        amount,
        category:    body.querySelector("#f-cat").value,
        description: body.querySelector("#f-desc").value,
        date:        body.querySelector("#f-date").value,
        receiptUrl:  receiptData.url,
        receiptName: receiptData.name
      };
      if (isEdit) await updateTransaction(u.uid, editId, payload);
      else        await addTransaction(u.uid, payload);
      toastSuccess(isEdit ? "Transaction updated." : "Transaction added.");
      close();
      await reload(outlet, u);
    } catch(err) { toastError(err.message||"Couldn't save."); btn.disabled=false; btn.textContent="Save"; }
  });
}

async function doDelete(outlet, u, id) {
  confirm({
    title: "Delete transaction?",
    message: "This action can't be undone.",
    confirmLabel: "Delete",
    onConfirm: async () => {
      await deleteTransaction(u.uid, id);
      toastSuccess("Transaction deleted.");
      await reload(outlet, u);
    }
  });
}

function buildCatOptions(type, selected) {
  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return cats.map(c => `<option value="${c.id}" ${c.id===selected?"selected":""}>${c.label}</option>`).join("");
}

function last12Months() {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const value = d.toISOString().slice(0,7);
    const label = d.toLocaleDateString("en-PK",{month:"long",year:"numeric"});
    months.push({ value, label });
  }
  return months;
}

const esc = s => String(s||"").replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
