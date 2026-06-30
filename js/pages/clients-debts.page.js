/**
 * Hisaab Pro — Clients & Debts (Phase 5)
 * Tab 1: Clients — add/edit clients, log payments (pending→paid), history.
 * Tab 2: Debts — borrowed vs lent with partial-settle support.
 */
import { icon }             from "../components/icons.js";
import { getUser }          from "../services/firebase/auth.service.js";
import { addClient, updateClient, deleteClient, getClients, addPayment, updatePayment, deletePayment, getClientPayments, getClientSummary }
                            from "../services/firebase/clients.service.js";
import { addDebt, updateDebt, deleteDebt, settleDebt, getDebts }
                            from "../services/firebase/debts.service.js";
import { formatMoney, formatDate, relativeTime } from "../utils/formatters.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { openDrawer, confirm }       from "../components/modal.js";
import { APP }              from "../../config/app.config.js";
import { LocalStore }       from "../services/storage/local.service.js";

const currency = () => LocalStore.get("preferences", {})?.currency || APP.defaultCurrency;
const fmt = v => formatMoney(v, currency());
let activeTab = "clients";

export default async function render(outlet) {
  activeTab = "clients";
  outlet.innerHTML = shell();
  wireTabBar(outlet);
  await reloadClients(outlet);
}

function shell() {
  return `
  <div class="page-head">
    <div><span class="eyebrow">People</span><h1>Clients & Debts</h1></div>
    <button class="btn btn--primary" id="cd-add-btn">${icon("plus")} Add</button>
  </div>
  <div class="seg-tabs" id="cd-tabs" style="margin-bottom:24px">
    <button class="seg-btn is-active" data-tab="clients">${icon("briefcase")} Clients</button>
    <button class="seg-btn" data-tab="debts">${icon("scale")} Debts</button>
  </div>
  <div id="cd-body"></div>`;
}

function wireTabBar(outlet) {
  outlet.addEventListener("click", async e => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    outlet.querySelectorAll("#cd-tabs .seg-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeTab = btn.dataset.tab;
    if (activeTab === "clients") await reloadClients(outlet);
    else await reloadDebts(outlet);
  });
}

/* ========================== CLIENTS =============================== */
async function reloadClients(outlet) {
  const u = getUser();
  const body = outlet.querySelector("#cd-body");
  body.innerHTML = `<div class="skeleton skeleton--block" style="height:200px"></div>`;
  outlet.querySelector("#cd-add-btn").onclick = () => openClientForm(outlet, u, null);

  try {
    const clients = await getClients(u.uid);
    if (!clients.length) {
      body.innerHTML = `<div class="empty" style="padding:48px 0">
        ${icon("briefcase")}<div><div class="sec-title">No clients yet</div>
        <div class="sec-sub">Add your first client to track payments.</div></div></div>`;
      return;
    }

    // Load summaries
    const summaries = await Promise.all(clients.map(c => getClientSummary(u.uid, c.id)));
    const totalPending = summaries.reduce((s, sm) => s + sm.pending, 0);

    body.innerHTML = `
      ${totalPending > 0 ? `<div class="info-banner">${icon("info")} Total pending from all clients: <strong>${fmt(totalPending)}</strong></div>` : ""}
      <div class="clients-grid">
        ${clients.map((c, i) => clientCard(c, summaries[i])).join("")}
      </div>`;

    body.querySelectorAll("[data-client]").forEach(card => {
      const id = card.dataset.client;
      card.querySelector("[data-edit]")?.addEventListener("click", () => openClientForm(outlet, u, clients.find(c=>c.id===id)));
      card.querySelector("[data-del]")?.addEventListener("click", () => confirm({ title:`Delete ${clients.find(c=>c.id===id)?.name}?`, message:"All payment history will also be deleted.", onConfirm: async () => { await deleteClient(u.uid, id); toastSuccess("Client deleted."); await reloadClients(outlet); }}));
      card.querySelector("[data-payments]")?.addEventListener("click", () => openPayments(outlet, u, clients.find(c=>c.id===id)));
    });
  } catch (err) { body.innerHTML = `<div class="sec-sub">${err.message}</div>`; }
}

function clientCard(c, sm) {
  const pct = sm.total > 0 ? Math.min(100, (sm.paid / sm.total) * 100) : 0;
  return `<div class="client-card" data-client="${c.id}">
    <div class="client-head">
      <div class="client-avatar">${(c.name||"?")[0].toUpperCase()}</div>
      <div class="client-meta">
        <div class="client-name">${esc(c.name)}</div>
        <div class="client-sub">${esc(c.company||c.email||"")}</div>
      </div>
      <div class="client-actions">
        <button class="icon-btn icon-btn--sm" data-edit="${c.id}" title="Edit">${icon("edit")}</button>
        <button class="icon-btn icon-btn--sm" data-payments="${c.id}" title="Payments">${icon("credit-card")}</button>
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-del="${c.id}" title="Delete">${icon("trash")}</button>
      </div>
    </div>
    <div class="client-stats">
      <div class="cs-item"><div class="cs-label">Billed</div><div class="figure cs-val">${fmt(sm.total)}</div></div>
      <div class="cs-item"><div class="cs-label">Paid</div><div class="figure cs-val success">${fmt(sm.paid)}</div></div>
      <div class="cs-item"><div class="cs-label">Pending</div><div class="figure cs-val ${sm.pending>0?"warning":"success"}">${fmt(sm.pending)}</div></div>
    </div>
    ${sm.total > 0 ? `<div class="client-progress"><div class="cp-fill" style="width:${pct}%"></div></div>
    <div style="font-size:var(--fs-xs);color:var(--c-text-mute);text-align:right">${Math.round(pct)}% paid</div>` : ""}
  </div>`;
}

function openClientForm(outlet, u, existing) {
  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `
    <div class="field"><label class="field-label">Client Name *</label>
      <input class="input" id="cl-name" type="text" value="${esc(existing?.name||"")}" placeholder="Full name" required /></div>
    <div class="field"><label class="field-label">Company</label>
      <input class="input" id="cl-company" type="text" value="${esc(existing?.company||"")}" placeholder="Company name" /></div>
    <div class="field"><label class="field-label">Email</label>
      <input class="input" id="cl-email" type="email" value="${esc(existing?.email||"")}" placeholder="email@company.com" /></div>
    <div class="field"><label class="field-label">Phone</label>
      <input class="input" id="cl-phone" type="tel" value="${esc(existing?.phone||"")}" placeholder="+92 300 0000000" /></div>
    <div class="field"><label class="field-label">Notes</label>
      <textarea class="input" id="cl-notes" rows="2" placeholder="Internal notes…">${esc(existing?.notes||"")}</textarea></div>
    <button class="btn btn--primary btn--block" id="cl-save">${existing ? icon("save")+" Update Client" : icon("plus")+" Add Client"}</button>`;

  const { close } = openDrawer({ title: existing ? "Edit Client" : "New Client", body, width: "sm" });
  body.querySelector("#cl-save").addEventListener("click", async () => {
    const name = body.querySelector("#cl-name").value.trim();
    if (!name) { toastError("Client name is required."); return; }
    const btn = body.querySelector("#cl-save"); btn.disabled = true;
    try {
      const data = { name, company: body.querySelector("#cl-company").value, email: body.querySelector("#cl-email").value, phone: body.querySelector("#cl-phone").value, notes: body.querySelector("#cl-notes").value };
      if (existing) await updateClient(u.uid, existing.id, data);
      else await addClient(u.uid, data);
      toastSuccess(existing ? "Client updated." : "Client added.");
      close(); await reloadClients(outlet);
    } catch(err) { toastError(err.message||""); btn.disabled=false; }
  });
}

async function openPayments(outlet, u, client) {
  const { openDrawer: openD } = await import("../components/modal.js");
  const container = document.createElement("div");
  container.className = "col gap-4";

  const refresh = async () => {
    const payments = await getClientPayments(u.uid, client.id);
    const total = payments.reduce((s,p)=>s+Number(p.amount),0);
    const paid  = payments.filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.amount),0);
    const list = container.querySelector("#payments-list");
    if (list) list.innerHTML = payments.length ? payments.map(p => paymentRow(p)).join("") : `<div class="sec-sub">No payments logged yet.</div>`;
    const sm = container.querySelector("#sm-bar");
    if (sm) sm.innerHTML = `<span class="sum-item">Total: <strong>${fmt(total)}</strong></span> · <span class="sum-item success">Paid: <strong>${fmt(paid)}</strong></span> · <span class="sum-item warning">Pending: <strong>${fmt(total-paid)}</strong></span>`;
  };

  container.innerHTML = `
    <div class="sum-bar" id="sm-bar"></div>
    <div id="payments-list"><div class="skeleton skeleton--block" style="height:80px"></div></div>
    <div style="border-top:1px solid var(--c-border);padding-top:16px">
      <div class="field"><label class="field-label">Amount</label>
        <input class="input" id="pay-amount" type="number" min="0" placeholder="Invoice amount" /></div>
      <div class="field"><label class="field-label">Description</label>
        <input class="input" id="pay-desc" type="text" placeholder="Project name / Invoice #" /></div>
      <div class="field"><label class="field-label">Status</label>
        <div class="select-wrap">${icon("chevron-down","select-caret")}
          <select class="input" id="pay-status"><option value="pending">Pending</option><option value="paid">Paid</option></select>
        </div></div>
      <button class="btn btn--primary btn--block" id="pay-add">${icon("plus")} Log Payment</button>
    </div>`;

  container.addEventListener("click", async e => {
    if (e.target.closest("#pay-add")) {
      const amount = Number(container.querySelector("#pay-amount").value);
      if (!amount) { toastError("Enter an amount."); return; }
      const btn = container.querySelector("#pay-add"); btn.disabled=true;
      try {
        await addPayment(u.uid, client.id, { amount, description: container.querySelector("#pay-desc").value, status: container.querySelector("#pay-status").value });
        toastSuccess("Payment logged."); container.querySelector("#pay-amount").value=""; container.querySelector("#pay-desc").value="";
        await refresh();
      } catch(err) { toastError(err.message||""); }
      btn.disabled=false;
    }
    const markPaid = e.target.closest("[data-mark-paid]");
    if (markPaid) {
      await updatePayment(u.uid, client.id, markPaid.dataset.markPaid, { status:"paid", paidAt: new Date().toISOString().slice(0,10) });
      toastSuccess("Marked as paid."); await refresh();
    }
    const delPay = e.target.closest("[data-del-pay]");
    if (delPay) {
      await deletePayment(u.uid, client.id, delPay.dataset.delPay);
      toastSuccess("Payment removed."); await refresh();
    }
  });

  openD({ title: `${client.name} — Payments`, body: container, width: "md" });
  await refresh();
}

function paymentRow(p) {
  return `<div class="txn-row">
    <span class="txn-ic txn-ic--${p.status==="paid"?"income":"pending"}">${icon(p.status==="paid"?"check-circle":"clock")}</span>
    <div class="txn-text">
      <div class="txn-desc">${esc(p.description||"Invoice")}</div>
      <div class="txn-meta">${formatDate(p.paidAt||p.createdAt||"","short")} · <span class="badge badge--${p.status==="paid"?"primary":""}" style="${p.status==="pending"?"color:var(--c-warning)":""}">${p.status}</span></div>
    </div>
    <div class="txn-right">
      <div class="figure ${p.status==="paid"?"success":"warning"}">${fmt(p.amount)}</div>
      <div class="txn-actions">
        ${p.status==="pending" ? `<button class="icon-btn icon-btn--sm" data-mark-paid="${p.id}" title="Mark paid">${icon("check")}</button>` : ""}
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-del-pay="${p.id}" title="Delete">${icon("trash")}</button>
      </div>
    </div>
  </div>`;
}

/* =========================== DEBTS ================================ */
async function reloadDebts(outlet) {
  const u = getUser();
  const body = outlet.querySelector("#cd-body");
  body.innerHTML = `<div class="skeleton skeleton--block" style="height:200px"></div>`;
  outlet.querySelector("#cd-add-btn").onclick = () => openDebtForm(outlet, u, null);

  const [borrowed, lent] = await Promise.all([getDebts(u.uid, "borrowed"), getDebts(u.uid, "lent")]);
  const owe  = borrowed.filter(d=>d.status==="active").reduce((s,d)=>s+(d.remaining??d.amount),0);
  const owedMe = lent.filter(d=>d.status==="active").reduce((s,d)=>s+(d.remaining??d.amount),0);

  body.innerHTML = `
    <div class="debt-summary-cards">
      <div class="card kpi-card" style="flex:1">
        <div class="kpi-top"><span class="kpi-ic kpi-ic--danger">${icon("arrow-down")}</span></div>
        <div class="figure kpi-val danger">${fmt(owe)}</div>
        <div class="kpi-label">Money I Owe</div>
      </div>
      <div class="card kpi-card" style="flex:1">
        <div class="kpi-top"><span class="kpi-ic kpi-ic--success">${icon("arrow-up")}</span></div>
        <div class="figure kpi-val success">${fmt(owedMe)}</div>
        <div class="kpi-label">Owed to Me</div>
      </div>
    </div>

    <div class="debt-section">
      <div class="section-head"><h3>Money I Borrowed</h3></div>
      ${borrowed.length ? borrowed.map(d=>debtCard(d,"borrowed")).join("") : emptyDebt("borrowed")}
    </div>
    <div class="debt-section">
      <div class="section-head"><h3>Money I Lent</h3></div>
      ${lent.length ? lent.map(d=>debtCard(d,"lent")).join("") : emptyDebt("lent")}
    </div>`;

  body.querySelectorAll("[data-debt-edit]").forEach(btn => btn.addEventListener("click", () => openDebtForm(outlet, u, [...borrowed,...lent].find(d=>d.id===btn.dataset.debtEdit))));
  body.querySelectorAll("[data-debt-del]").forEach(btn => btn.addEventListener("click", () => confirm({ title:"Delete this debt?", message:"This will remove it from your records.", onConfirm: async () => { await deleteDebt(u.uid, btn.dataset.debtDel); toastSuccess("Debt removed."); await reloadDebts(outlet); }})));
  body.querySelectorAll("[data-settle]").forEach(btn => btn.addEventListener("click", () => openSettleForm(outlet, u, [...borrowed,...lent].find(d=>d.id===btn.dataset.settle))));
}

function debtCard(d, type) {
  const isActive = d.status === "active";
  const remaining = d.remaining ?? d.amount;
  const pct = d.amount > 0 ? Math.min(100, ((d.amount - remaining) / d.amount) * 100) : 100;
  return `<div class="debt-card ${d.status==="settled"?"debt-card--settled":""}">
    <div class="debt-card-head">
      <span class="debt-person">${esc(d.person)}</span>
      <div class="flex gap-2">
        <span class="badge ${d.status==="settled"?"badge--primary":""}" style="${isActive?"color:var(--c-warning)":""}">
          ${d.status==="settled" ? icon("check")+" Settled" : "Active"}
        </span>
        ${isActive ? `<button class="btn btn--subtle" style="height:28px;font-size:12px" data-settle="${d.id}">${icon("coins")} Settle</button>` : ""}
        <button class="icon-btn icon-btn--sm" data-debt-edit="${d.id}">${icon("edit")}</button>
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-debt-del="${d.id}" data-debt-del="${d.id}">${icon("trash")}</button>
      </div>
    </div>
    <div class="debt-card-body">
      <div><div class="figure ${type==="borrowed"?"danger":"success"}">${fmt(remaining)}</div>
        <div class="sec-sub">remaining of ${fmt(d.amount)}</div></div>
      ${d.description ? `<div class="sec-sub" style="margin-top:4px">${esc(d.description)}</div>` : ""}
      ${d.dueDate ? `<div class="sec-sub">${icon("calendar")} Due: ${formatDate(d.dueDate)}</div>` : ""}
    </div>
    <div class="debt-progress"><div class="dp-fill" style="width:${pct}%;background:${type==="borrowed"?"var(--c-danger)":"var(--c-success)"}"></div></div>
    <div style="font-size:var(--fs-xs);color:var(--c-text-mute);text-align:right">${Math.round(pct)}% settled</div>
  </div>`;
}

function openDebtForm(outlet, u, existing) {
  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `
    <div class="seg-tabs" id="debt-type-tabs">
      <button class="seg-btn ${!existing||existing.type==="borrowed"?"is-active":""}" data-dtype="borrowed">${icon("arrow-down")} I Borrowed</button>
      <button class="seg-btn ${existing?.type==="lent"?"is-active":""}" data-dtype="lent">${icon("arrow-up")} I Lent</button>
    </div>
    <div class="field"><label class="field-label">Person / Source</label>
      <input class="input" id="dt-person" value="${esc(existing?.person||"")}" placeholder="Ali, Bank, etc." required /></div>
    <div class="field"><label class="field-label">Amount</label>
      <input class="input" id="dt-amount" type="number" min="0" value="${existing?.amount||""}" placeholder="0" required /></div>
    <div class="field"><label class="field-label">Description</label>
      <input class="input" id="dt-desc" value="${esc(existing?.description||"")}" placeholder="What for?" /></div>
    <div class="field"><label class="field-label">Due Date (optional)</label>
      <input class="input" id="dt-due" type="date" value="${existing?.dueDate||""}" /></div>
    <button class="btn btn--primary btn--block" id="dt-save">${existing?icon("save")+" Update":icon("plus")+" Add Debt"}</button>`;

  let selectedType = existing?.type || "borrowed";
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-dtype]");
    if (!b) return;
    selectedType = b.dataset.dtype;
    body.querySelectorAll("[data-dtype]").forEach(x => x.classList.toggle("is-active", x===b));
  });

  const { close } = openDrawer({ title: existing?"Edit Debt":"New Debt", body, width: "sm" });
  body.querySelector("#dt-save").addEventListener("click", async () => {
    const person = body.querySelector("#dt-person").value.trim();
    const amount = Number(body.querySelector("#dt-amount").value);
    if (!person||!amount) { toastError("Fill in person and amount."); return; }
    const btn = body.querySelector("#dt-save"); btn.disabled=true;
    try {
      const data = { type: selectedType, person, amount, description: body.querySelector("#dt-desc").value, dueDate: body.querySelector("#dt-due").value||null };
      if (existing) await updateDebt(u.uid, existing.id, { ...existing, ...data });
      else await addDebt(u.uid, data);
      toastSuccess(existing?"Debt updated.":"Debt added."); close(); await reloadDebts(outlet);
    } catch(err) { toastError(err.message||""); btn.disabled=false; }
  });
}

async function openSettleForm(outlet, u, debt) {
  const { openModal } = await import("../components/modal.js");
  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `<p style="color:var(--c-text-soft)">Remaining: <strong>${fmt(debt.remaining??debt.amount)}</strong></p>
    <div class="field"><label class="field-label">Settlement Amount</label>
      <input class="input" id="settle-amount" type="number" min="0" max="${debt.remaining??debt.amount}" value="${debt.remaining??debt.amount}" /></div>`;
  openModal({ title: `Settle debt with ${debt.person}`, body, size: "sm",
    actions: [
      { label: "Cancel", cls: "btn--ghost", onClick: c => c() },
      { label: icon("check")+" Mark Settled", cls: "btn--primary", onClick: async c => {
        const amt = Number(body.querySelector("#settle-amount").value);
        await settleDebt(u.uid, debt.id, amt);
        toastSuccess("Debt settled."); c(); await reloadDebts(outlet);
      }}
    ]
  });
}

const emptyDebt = type => `<div class="empty-inline">${icon("scale")}<div><div class="sec-title">No ${type==="borrowed"?"borrowed money":"loans"} recorded</div></div></div>`;
const esc = s => String(s||"").replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
