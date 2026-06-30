/**
 * Hisaab Pro — Income & Expenses (Phase 4 · Rewrite)
 *
 * Fixes:
 *  • Add-btn listener wired ONCE in render(), never inside reload()
 *  • Edit / delete use event-delegation on #txn-body — no per-element re-wiring
 *  • Tab & filter listeners delegated on stable container elements
 *  • data-anim on page-head so GSAP animates named items, not the whole outlet
 *
 * Layout: single-row toolbar (tabs + search + filters inline), clean month groups.
 */
import { icon }             from "../components/icons.js";
import { getUser }          from "../services/firebase/auth.service.js";
import { getTransactions, addTransaction, updateTransaction,
         deleteTransaction, searchTransactions }
                            from "../services/firebase/transactions.service.js";
import { uploadToCloudinary, isCloudinaryConfigured }
                            from "../services/cloudinary/cloudinary.service.js";
import { formatMoney, formatDate } from "../utils/formatters.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { openDrawer, confirm }  from "../components/modal.js";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, APP }
                            from "../../config/app.config.js";
import { LocalStore }       from "../services/storage/local.service.js";

const ALL_CATS = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const fmt = () => v => formatMoney(v, LocalStore.get("preferences",{})?.currency || APP.defaultCurrency);

/* ── module state ─────────────────────────────────────────────── */
let _state = { tab: "all", search: "", category: "", month: "" };
let _searchTimer = null;

export default async function render(outlet) {
  const u = getUser();
  _state = { tab: "all", search: "", category: "", month: "" };

  /* ── Paint the static shell immediately ── */
  outlet.innerHTML = `
  <div class="page-head" data-anim>
    <div>
      <span class="eyebrow">Finance</span>
      <h1>Income &amp; Expenses</h1>
    </div>
    <button class="btn btn--primary" id="ine-add-btn">
      ${icon("plus")} Add Transaction
    </button>
  </div>

  <!-- ── Toolbar: tabs + search + filters in one row ── -->
  <div class="ine-toolbar" data-anim>
    <div class="seg-tabs" id="ine-tabs">
      <button class="seg-btn is-active" data-tab="all">All</button>
      <button class="seg-btn" data-tab="income">${icon("arrow-up")} Income</button>
      <button class="seg-btn" data-tab="expense">${icon("arrow-down")} Expenses</button>
    </div>
    <div class="ine-filters">
      <div class="ine-search">
        ${icon("search","ine-search-icon")}
        <input class="input" id="ine-search" type="search"
               placeholder="Search transactions…" autocomplete="off" />
      </div>
      <div class="select-wrap select-wrap--sm">
        ${icon("chevron-down","select-caret")}
        <select class="input" id="ine-cat">
          <option value="">All categories</option>
          ${ALL_CATS.map(c=>`<option value="${c.id}">${c.label}</option>`).join("")}
        </select>
      </div>
      <div class="select-wrap select-wrap--sm">
        ${icon("chevron-down","select-caret")}
        <select class="input" id="ine-month">
          <option value="">All months</option>
          ${last12Months().map(m=>`<option value="${m.v}">${m.l}</option>`).join("")}
        </select>
      </div>
    </div>
  </div>

  <!-- ── Transaction body ── -->
  <div id="ine-body" class="ine-body"></div>`;

  /* ── Wire add button ONCE ── */
  outlet.querySelector("#ine-add-btn").addEventListener("click", () => openForm(outlet, u, null));

  /* ── Tab delegation ── */
  outlet.querySelector("#ine-tabs").addEventListener("click", e => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    outlet.querySelectorAll("#ine-tabs .seg-btn").forEach(b => b.classList.toggle("is-active", b === btn));
    _state.tab = btn.dataset.tab;
    reloadList(outlet, u);
  });

  /* ── Filter / search delegation ── */
  outlet.querySelector("#ine-search").addEventListener("input", e => {
    _state.search = e.target.value;
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => reloadList(outlet, u), 300);
  });
  outlet.querySelector("#ine-cat").addEventListener("change", e => {
    _state.category = e.target.value; reloadList(outlet, u);
  });
  outlet.querySelector("#ine-month").addEventListener("change", e => {
    _state.month = e.target.value; reloadList(outlet, u);
  });

  /* ── Delegated edit / delete on the list container ── */
  outlet.querySelector("#ine-body").addEventListener("click", e => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn  = e.target.closest("[data-del]");
    if (editBtn) openForm(outlet, u, editBtn.dataset.edit);
    if (delBtn)  doDelete(outlet, u, delBtn.dataset.del);
  });

  await reloadList(outlet, u);
}

/* ════════════════════════════════════════════════════════════════
   DATA RELOAD
═══════════════════════════════════════════════════════════════ */
async function reloadList(outlet, u) {
  const body = outlet.querySelector("#ine-body");
  body.innerHTML = `<div class="ine-loading">${skeleton()}</div>`;

  try {
    let txns = _state.search.length >= 2
      ? await searchTransactions(u.uid, _state.search)
      : await getTransactions(u.uid, _state.tab !== "all" ? { type: _state.tab } : {});

    if (_state.category) txns = txns.filter(t => t.category === _state.category);
    if (_state.month)    txns = txns.filter(t => (t.date || "").startsWith(_state.month));

    if (!txns.length) {
      body.innerHTML = emptyState();
      return;
    }

    /* summary bar */
    const inc = txns.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
    const exp = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
    const f   = fmt();

    body.innerHTML = `
      <div class="ine-summary-bar">
        <span class="ine-sum ine-sum--income">${icon("arrow-up")} ${f(inc)}</span>
        <span class="ine-sum-dot"></span>
        <span class="ine-sum ine-sum--expense">${icon("arrow-down")} ${f(exp)}</span>
        <span class="ine-sum-dot"></span>
        <span class="ine-sum ${inc-exp>=0?"ine-sum--income":"ine-sum--expense"}">Net ${f(inc-exp)}</span>
        <span class="ine-sum-count">${txns.length} transaction${txns.length!==1?"s":""}</span>
      </div>
      ${renderGrouped(txns)}`;

  } catch (err) {
    body.innerHTML = `<div class="empty">
      ${icon("alert")}<div>
        <div class="sec-title">Couldn't load transactions</div>
        <div class="sec-sub">${esc(err.message || "")}</div>
      </div></div>`;
  }
}

/* ════════════════════════════════════════════════════════════════
   RENDERING
═══════════════════════════════════════════════════════════════ */
function renderGrouped(txns) {
  const months = {};
  txns.forEach(t => {
    const ym = (t.date || new Date().toISOString()).slice(0, 7);
    (months[ym] = months[ym] || []).push(t);
  });
  const f = fmt();
  return Object.keys(months).sort((a, b) => b.localeCompare(a)).map(ym => {
    const group = months[ym];
    const [yr, mo] = ym.split("-");
    const label = new Date(yr, mo - 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
    const mInc = group.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
    const mExp = group.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
    return `
    <div class="ine-month-group">
      <div class="ine-month-head">
        <span class="ine-month-label">${label}</span>
        <span class="ine-month-totals">
          <span class="success">+${f(mInc)}</span>
          <span class="danger">-${f(mExp)}</span>
        </span>
      </div>
      <div class="ine-list">
        ${group.map(txnRow).join("")}
      </div>
    </div>`;
  }).join("");
}

function txnRow(t) {
  const inc = t.type === "income";
  const cat = ALL_CATS.find(c => c.id === t.category);
  const f   = fmt();
  return `
  <div class="ine-row">
    <span class="ine-ic ine-ic--${inc?"income":"expense"}">${icon(inc?"arrow-up":"arrow-down")}</span>
    <div class="ine-info">
      <div class="ine-desc">${esc(t.description || cat?.label || t.category || "—")}</div>
      <div class="ine-meta">
        <span class="ine-badge" style="--bc:${cat?.color||"var(--c-border)"}">
          ${esc(cat?.label || t.category)}
        </span>
        <span class="ine-date">${formatDate(t.date, "medium")}</span>
        ${t.receiptUrl ? `<a href="${t.receiptUrl}" target="_blank" rel="noopener" class="ine-receipt">${icon("file-text")} Receipt</a>` : ""}
      </div>
    </div>
    <div class="ine-right">
      <div class="ine-amount ${inc?"success":"danger"}">${inc?"+":"-"}${f(t.amount)}</div>
      <div class="ine-actions">
        <button class="icon-btn icon-btn--sm" data-edit="${t.id}" title="Edit">${icon("edit")}</button>
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-del="${t.id}" title="Delete">${icon("trash")}</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════
   ADD / EDIT FORM
═══════════════════════════════════════════════════════════════ */
async function openForm(outlet, u, editId) {
  let existing = null;
  if (editId) {
    const all = await getTransactions(u.uid);
    existing = all.find(t => t.id === editId);
  }
  const isEdit = Boolean(existing);
  let selType = existing?.type || (_state.tab === "expense" ? "expense" : "income");
  let receiptData = { url: existing?.receiptUrl || null, name: existing?.receiptName || null };

  const wrap = document.createElement("div");
  wrap.className = "col gap-4";
  wrap.innerHTML = `
    <div class="seg-tabs" id="ft-tabs">
      <button class="seg-btn ${selType==="income"?"is-active":""}" data-type="income">${icon("arrow-up")} Income</button>
      <button class="seg-btn ${selType==="expense"?"is-active":""}" data-type="expense">${icon("arrow-down")} Expense</button>
    </div>
    <div class="field">
      <label class="field-label">Amount</label>
      <div class="input-wrap">${icon("coins","input-icon")}
        <input class="input input--icon" id="ft-amount" type="number" min="0" step="1"
               value="${existing?.amount||""}" placeholder="0" required autofocus />
      </div>
    </div>
    <div class="field">
      <label class="field-label">Category</label>
      <div class="select-wrap">${icon("chevron-down","select-caret")}
        <select class="input" id="ft-cat">${catOptions(selType, existing?.category)}</select>
      </div>
    </div>
    <div class="field">
      <label class="field-label">Description</label>
      <input class="input" id="ft-desc" type="text"
             value="${esc(existing?.description||"")}" placeholder="What was this for?" />
    </div>
    <div class="field">
      <label class="field-label">Date</label>
      <input class="input" id="ft-date" type="date"
             value="${existing?.date || new Date().toISOString().slice(0,10)}" />
    </div>
    ${isCloudinaryConfigured ? `
    <div class="field">
      <label class="field-label">Receipt / Invoice</label>
      <div id="ft-receipt-area">
        ${receiptData.url
          ? `<div class="ine-receipt-preview">
               <a href="${receiptData.url}" target="_blank">${icon("file-text")} ${esc(receiptData.name||"View receipt")}</a>
               <button type="button" class="btn btn--subtle" id="ft-change-receipt">Change</button>
             </div>`
          : `<label class="btn btn--ghost" for="ft-file">${icon("upload")} Upload Receipt</label>`}
        <input type="file" id="ft-file" accept="image/*,.pdf" hidden />
        <div class="ine-upload-progress hidden" id="ft-progress">
          <div class="ine-progress-bar" id="ft-bar"></div>
          <span id="ft-pct">0%</span>
        </div>
        <div id="ft-status" class="field-hint"></div>
      </div>
    </div>` : ""}
    <button class="btn btn--primary btn--block btn--lg" id="ft-save">
      ${icon(isEdit?"save":"plus")} ${isEdit?"Update Transaction":"Add Transaction"}
    </button>`;

  /* type switching */
  wrap.querySelector("#ft-tabs").addEventListener("click", e => {
    const b = e.target.closest("[data-type]");
    if (!b) return;
    selType = b.dataset.type;
    wrap.querySelectorAll("#ft-tabs .seg-btn").forEach(x => x.classList.toggle("is-active", x===b));
    wrap.querySelector("#ft-cat").innerHTML = catOptions(selType, null);
  });

  /* receipt upload */
  wrap.querySelector("#ft-file")?.addEventListener("change", async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const prog = wrap.querySelector("#ft-progress");
    const bar  = wrap.querySelector("#ft-bar");
    const pct  = wrap.querySelector("#ft-pct");
    const status = wrap.querySelector("#ft-status");
    prog.classList.remove("hidden");
    status.textContent = "Uploading…";
    try {
      const res = await uploadToCloudinary(file, {
        folder: "hisaab-pro/receipts",
        onProgress: p => { bar.style.width = p+"%"; pct.textContent = p+"%"; }
      });
      receiptData = { url: res.secureUrl, name: file.name };
      status.innerHTML = `${icon("check")} <a href="${res.secureUrl}" target="_blank">${esc(file.name)}</a>`;
      prog.classList.add("hidden");
    } catch (err) {
      status.textContent = "Upload failed: " + (err.message||"");
      prog.classList.add("hidden");
    }
  });

  const { close } = openDrawer({ title: isEdit ? "Edit Transaction" : "New Transaction", body: wrap });

  /* save */
  wrap.querySelector("#ft-save").addEventListener("click", async () => {
    const amount = Number(wrap.querySelector("#ft-amount").value);
    if (!amount || amount <= 0) { toastError("Enter a valid amount."); return; }
    const btn = wrap.querySelector("#ft-save");
    btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span> Saving…`;
    try {
      const payload = {
        type:        selType,
        amount,
        category:    wrap.querySelector("#ft-cat").value,
        description: wrap.querySelector("#ft-desc").value,
        date:        wrap.querySelector("#ft-date").value,
        receiptUrl:  receiptData.url,
        receiptName: receiptData.name
      };
      if (isEdit) await updateTransaction(u.uid, editId, payload);
      else        await addTransaction(u.uid, payload);
      toastSuccess(isEdit ? "Transaction updated." : "Transaction added.");
      close();
      await reloadList(outlet, u);
    } catch(err) {
      toastError(err.message || "Couldn't save.");
      btn.disabled = false;
      btn.innerHTML = `${icon(isEdit?"save":"plus")} ${isEdit?"Update":"Add"}`;
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   DELETE
═══════════════════════════════════════════════════════════════ */
function doDelete(outlet, u, id) {
  confirm({
    title: "Delete transaction?",
    message: "This can't be undone.",
    confirmLabel: "Delete",
    onConfirm: async () => {
      await deleteTransaction(u.uid, id);
      toastSuccess("Transaction deleted.");
      await reloadList(outlet, u);
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function catOptions(type, selected) {
  return (type==="income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .map(c => `<option value="${c.id}" ${c.id===selected?"selected":""}>${c.label}</option>`)
    .join("");
}

function last12Months() {
  return Array.from({length:12},(_,i)=>{
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    return { v: d.toISOString().slice(0,7), l: d.toLocaleDateString("en-PK",{month:"long",year:"numeric"}) };
  });
}

function emptyState() {
  const msg = _state.search || _state.category || _state.month
    ? "No transactions match your filters."
    : "No transactions yet.";
  const sub = _state.search || _state.category || _state.month
    ? "Try adjusting your search or filters."
    : 'Tap "+ Add Transaction" to record your first one.';
  return `<div class="empty" style="padding:56px 0">
    ${icon("receipt")}
    <div><div class="sec-title">${msg}</div><div class="sec-sub">${sub}</div></div>
  </div>`;
}

function skeleton() {
  return Array(3).fill(`<div class="skeleton skeleton--block" style="height:60px;margin-bottom:8px"></div>`).join("");
}

const esc = s => String(s||"").replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
