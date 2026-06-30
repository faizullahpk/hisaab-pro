/**
 * Hisaab Pro — Family & Savings (Phase 6)
 * Tab 1: Family — Father/Mother/Brother/etc + monthly expense tracking.
 * Tab 2: Savings — goals with progress bars and contributions.
 */
import { icon }         from "../components/icons.js";
import { getUser }      from "../services/firebase/auth.service.js";
import { addMember, updateMember, deleteMember, getMembers, addFamilyExpense, deleteFamilyExpense, getMemberExpenses, getFamilyMonthlySummary }
                        from "../services/firebase/family.service.js";
import { addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, contributeToGoal, getSavingsGoals }
                        from "../services/firebase/savings.service.js";
import { formatMoney, formatDate } from "../utils/formatters.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { openDrawer, openModal, confirm } from "../components/modal.js";
import { FAMILY_RELATIONS, APP }         from "../../config/app.config.js";
import { LocalStore }   from "../services/storage/local.service.js";

const currency = () => LocalStore.get("preferences", {})?.currency || APP.defaultCurrency;
const fmt = v => formatMoney(v, currency());

const GOAL_COLORS = ["#8b7cff","#ff7ac6","#5be7a9","#4f8cff","#ffcf5c","#ff6b7d","#57d9c7","#b16cff"];
const GOAL_ICONS  = ["target","piggy","home","briefcase","heart","sparkle","wallet","star"];

export default async function render(outlet) {
  outlet.innerHTML = `
  <div class="page-head">
    <div><span class="eyebrow">Life</span><h1>Family & Savings</h1></div>
    <button class="btn btn--primary" id="fs-add-btn">${icon("plus")} Add</button>
  </div>
  <div class="seg-tabs" id="fs-tabs" style="margin-bottom:24px">
    <button class="seg-btn is-active" data-tab="family">${icon("users")} Family</button>
    <button class="seg-btn" data-tab="savings">${icon("piggy")} Savings</button>
  </div>
  <div id="fs-body"></div>`;

  outlet.addEventListener("click", async e => {
    const btn = e.target.closest("[data-tab]");
    if (!btn || !btn.closest("#fs-tabs")) return;
    outlet.querySelectorAll("#fs-tabs .seg-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    if (btn.dataset.tab === "family") await renderFamily(outlet);
    else await renderSavings(outlet);
  });

  await renderFamily(outlet);
}

/* ========================= FAMILY ================================= */
async function renderFamily(outlet) {
  const u = getUser();
  const body = outlet.querySelector("#fs-body");
  body.innerHTML = `<div class="skeleton skeleton--block" style="height:200px"></div>`;
  outlet.querySelector("#fs-add-btn").onclick = () => openMemberForm(outlet, u, null);

  const members = await getFamilyMonthlySummary(u.uid).catch(() => []);
  const totalMonth = members.reduce((s, m) => s + m.monthTotal, 0);

  body.innerHTML = `
    ${totalMonth > 0 ? `<div class="info-banner">${icon("users")} Total family spend this month: <strong>${fmt(totalMonth)}</strong></div>` : ""}
    <div class="family-grid">
      ${members.map(m => memberCard(m)).join("")}
      <button class="add-member-card" id="add-member-inline">${icon("user-plus")}<span>Add Member</span></button>
    </div>`;

  body.querySelector("#add-member-inline")?.addEventListener("click", () => openMemberForm(outlet, u, null));
  body.querySelectorAll("[data-member]").forEach(card => {
    const id = card.dataset.member;
    card.querySelector("[data-edit-member]")?.addEventListener("click", () => openMemberForm(outlet, u, members.find(m=>m.id===id)));
    card.querySelector("[data-del-member]")?.addEventListener("click", () => confirm({ title:`Remove ${members.find(m=>m.id===id)?.name}?`, message:"All their expense history will be deleted.", onConfirm: async () => { await deleteMember(u.uid, id); toastSuccess("Member removed."); await renderFamily(outlet); }}));
    card.querySelector("[data-expenses]")?.addEventListener("click", () => openMemberExpenses(outlet, u, members.find(m=>m.id===id)));
  });
}

function memberCard(m) {
  const rel = FAMILY_RELATIONS.find(r => r.id === m.relation);
  return `<div class="member-card" data-member="${m.id}">
    <div class="member-head">
      <div class="member-avatar">${(m.name||"?")[0].toUpperCase()}</div>
      <div>
        <div class="member-name">${esc(m.name)}</div>
        <div class="member-rel">${rel?.label || m.relation || "Family"}</div>
      </div>
      <div class="flex gap-1 ml-auto">
        <button class="icon-btn icon-btn--sm" data-edit-member="${m.id}">${icon("edit")}</button>
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-del-member="${m.id}">${icon("trash")}</button>
      </div>
    </div>
    <div class="member-stats">
      <div class="ms-item"><div class="ms-label">This Month</div><div class="figure ms-val ${m.monthTotal > 0 ? "danger" : ""}">${fmt(m.monthTotal)}</div></div>
      ${m.monthlyBudget > 0 ? `<div class="ms-item"><div class="ms-label">Budget</div><div class="figure ms-val">${fmt(m.monthlyBudget)}</div></div>` : ""}
    </div>
    ${m.monthlyBudget > 0 ? `<div class="member-progress">
      <div class="mp-fill" style="width:${Math.min(100, (m.monthTotal/m.monthlyBudget)*100)}%;background:${m.monthTotal>m.monthlyBudget?"var(--c-danger)":"var(--c-primary)"}"></div>
    </div>` : ""}
    <button class="btn btn--ghost btn--block" data-expenses="${m.id}" style="margin-top:8px">${icon("list-check")} View Expenses (${m.expenseCount})</button>
  </div>`;
}

function openMemberForm(outlet, u, existing) {
  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `
    <div class="field"><label class="field-label">Name *</label>
      <input class="input" id="mm-name" value="${esc(existing?.name||"")}" placeholder="Name" required /></div>
    <div class="field"><label class="field-label">Relation</label>
      <div class="select-wrap">${icon("chevron-down","select-caret")}
        <select class="input" id="mm-rel">
          ${FAMILY_RELATIONS.map(r=>`<option value="${r.id}" ${r.id===existing?.relation?"selected":""}>${r.label}</option>`).join("")}
        </select></div></div>
    <div class="field"><label class="field-label">Monthly Budget (optional)</label>
      <input class="input" id="mm-budget" type="number" min="0" value="${existing?.monthlyBudget||""}" placeholder="0" /></div>
    <button class="btn btn--primary btn--block" id="mm-save">${existing?icon("save")+" Update":icon("plus")+" Add Member"}</button>`;

  const { close } = openDrawer({ title: existing?"Edit Member":"Add Family Member", body, width: "sm" });
  body.querySelector("#mm-save").addEventListener("click", async () => {
    const name = body.querySelector("#mm-name").value.trim();
    if (!name) { toastError("Name is required."); return; }
    const btn = body.querySelector("#mm-save"); btn.disabled=true;
    try {
      const data = { name, relation: body.querySelector("#mm-rel").value, monthlyBudget: Number(body.querySelector("#mm-budget").value)||0 };
      if (existing) await updateMember(u.uid, existing.id, data);
      else await addMember(u.uid, data);
      toastSuccess(existing?"Member updated.":"Member added."); close(); await renderFamily(outlet);
    } catch(err) { toastError(err.message||""); btn.disabled=false; }
  });
}

async function openMemberExpenses(outlet, u, member) {
  const container = document.createElement("div");
  container.className = "col gap-4";
  const refresh = async () => {
    const expenses = await getMemberExpenses(u.uid, member.id);
    const total = expenses.reduce((s,e)=>s+Number(e.amount),0);
    const list = container.querySelector("#exp-list");
    if (list) list.innerHTML = `<div class="sum-bar" style="margin-bottom:12px">Total: <strong>${fmt(total)}</strong> (${expenses.length} entries)</div>` +
      (expenses.length ? expenses.map(e => `
        <div class="txn-row">
          <span class="txn-ic txn-ic--expense">${icon("arrow-down")}</span>
          <div class="txn-text"><div class="txn-desc">${esc(e.description||"Expense")}</div>
            <div class="txn-meta">${formatDate(e.date,"short")}</div></div>
          <div class="txn-right"><div class="figure danger">${fmt(e.amount)}</div>
            <button class="icon-btn icon-btn--sm icon-btn--danger" data-del-exp="${e.id}">${icon("trash")}</button>
          </div></div>`).join("") : `<div class="sec-sub">No expenses logged yet.</div>`);
  };

  container.innerHTML = `
    <div id="exp-list"><div class="skeleton skeleton--block" style="height:80px"></div></div>
    <div style="border-top:1px solid var(--c-border);padding-top:16px">
      <div class="flex gap-3">
        <input class="input" id="exp-amount" type="number" min="0" placeholder="Amount" style="flex:1" />
        <input class="input" id="exp-desc" type="text" placeholder="Description" style="flex:2" />
        <input class="input" id="exp-date" type="date" value="${new Date().toISOString().slice(0,10)}" style="flex:1.2" />
        <button class="btn btn--primary" id="exp-add">${icon("plus")}</button>
      </div></div>`;

  container.addEventListener("click", async e => {
    if (e.target.closest("#exp-add")) {
      const amount = Number(container.querySelector("#exp-amount").value);
      if (!amount) { toastError("Enter an amount."); return; }
      await addFamilyExpense(u.uid, member.id, { amount, description: container.querySelector("#exp-desc").value, date: container.querySelector("#exp-date").value });
      container.querySelector("#exp-amount").value=""; container.querySelector("#exp-desc").value="";
      toastSuccess("Expense logged."); await refresh();
    }
    const del = e.target.closest("[data-del-exp]");
    if (del) { await deleteFamilyExpense(u.uid, member.id, del.dataset.delExp); toastSuccess("Removed."); await refresh(); }
  });

  openDrawer({ title: `${member.name} — Expenses`, body: container, width: "md" });
  await refresh();
}

/* ========================= SAVINGS ================================ */
async function renderSavings(outlet) {
  const u = getUser();
  const body = outlet.querySelector("#fs-body");
  body.innerHTML = `<div class="skeleton skeleton--block" style="height:200px"></div>`;
  outlet.querySelector("#fs-add-btn").onclick = () => openGoalForm(outlet, u, null);

  const goals = await getSavingsGoals(u.uid).catch(() => []);
  const totalSaved  = goals.reduce((s,g)=>s+Number(g.currentAmount),0);
  const totalTarget = goals.reduce((s,g)=>s+Number(g.targetAmount),0);

  body.innerHTML = `
    ${goals.length > 0 ? `<div class="savings-overview">
      <div class="card kpi-card" style="flex:1"><div class="kpi-top"><span class="kpi-ic kpi-ic--success">${icon("piggy")}</span></div>
        <div class="figure kpi-val success">${fmt(totalSaved)}</div><div class="kpi-label">Total Saved</div></div>
      <div class="card kpi-card" style="flex:1"><div class="kpi-top"><span class="kpi-ic kpi-ic--primary">${icon("target")}</span></div>
        <div class="figure kpi-val">${fmt(totalTarget)}</div><div class="kpi-label">Total Target</div></div>
      <div class="card kpi-card" style="flex:1"><div class="kpi-top"><span class="kpi-ic kpi-ic--warning">${icon("chart")}</span></div>
        <div class="figure kpi-val">${totalTarget > 0 ? Math.round((totalSaved/totalTarget)*100) : 0}%</div>
        <div class="kpi-label">Overall Progress</div></div>
    </div>` : ""}
    <div class="goals-grid">
      ${goals.map(g => goalCard(g)).join("")}
      <button class="add-goal-card" id="add-goal-inline">${icon("plus")}<span>New Goal</span></button>
    </div>`;

  body.querySelector("#add-goal-inline")?.addEventListener("click", () => openGoalForm(outlet, u, null));
  body.querySelectorAll("[data-goal]").forEach(card => {
    const id = card.dataset.goal;
    card.querySelector("[data-edit-goal]")?.addEventListener("click", () => openGoalForm(outlet, u, goals.find(g=>g.id===id)));
    card.querySelector("[data-del-goal]")?.addEventListener("click", () => confirm({ title:"Delete this goal?", message:"Your savings history for this goal will be lost.", onConfirm: async () => { await deleteSavingsGoal(u.uid, id); toastSuccess("Goal deleted."); await renderSavings(outlet); }}));
    card.querySelector("[data-contribute]")?.addEventListener("click", () => openContributeForm(outlet, u, goals.find(g=>g.id===id)));
  });
}

function goalCard(g) {
  const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount/g.targetAmount)*100) : 0;
  const done = g.status === "completed";
  return `<div class="goal-card" data-goal="${g.id}">
    <div class="goal-head">
      <span class="goal-icon" style="background:${g.color}22;color:${g.color}">${icon(g.icon||"target")}</span>
      <div class="goal-meta">
        <div class="goal-name">${esc(g.name)}</div>
        ${g.deadline ? `<div class="goal-deadline">${icon("calendar")} ${formatDate(g.deadline,"short")}</div>` : ""}
      </div>
      <div class="flex gap-1">
        ${done ? `<span class="badge badge--primary">${icon("check")} Done</span>` : `<button class="icon-btn icon-btn--sm" data-edit-goal="${g.id}">${icon("edit")}</button>`}
        <button class="icon-btn icon-btn--sm icon-btn--danger" data-del-goal="${g.id}">${icon("trash")}</button>
      </div>
    </div>
    <div class="goal-amounts">
      <span class="figure" style="color:${g.color}">${fmt(g.currentAmount)}</span>
      <span class="goal-of">of ${fmt(g.targetAmount)}</span>
    </div>
    <div class="goal-progress-track">
      <div class="goal-progress-fill" style="width:${pct}%;background:${g.color}"></div>
    </div>
    <div class="goal-pct-row">
      <span style="color:${g.color};font-weight:600">${Math.round(pct)}% saved</span>
      <span class="sec-sub">${fmt(g.targetAmount - g.currentAmount)} to go</span>
    </div>
    ${!done ? `<button class="btn btn--ghost btn--block" data-contribute="${g.id}" style="margin-top:8px">${icon("plus")} Add Money</button>` : ""}
    ${g.notes ? `<div class="sec-sub" style="margin-top:8px">${esc(g.notes)}</div>` : ""}
  </div>`;
}

function openGoalForm(outlet, u, existing) {
  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `
    <div class="field"><label class="field-label">Goal Name *</label>
      <input class="input" id="gl-name" value="${esc(existing?.name||"")}" placeholder="e.g. Emergency Fund" required /></div>
    <div class="flex gap-3">
      <div class="field" style="flex:1"><label class="field-label">Target Amount</label>
        <input class="input" id="gl-target" type="number" min="0" value="${existing?.targetAmount||""}" placeholder="500000" /></div>
      <div class="field" style="flex:1"><label class="field-label">Already Saved</label>
        <input class="input" id="gl-current" type="number" min="0" value="${existing?.currentAmount||""}" placeholder="0" /></div>
    </div>
    <div class="field"><label class="field-label">Deadline (optional)</label>
      <input class="input" id="gl-deadline" type="date" value="${existing?.deadline||""}" /></div>
    <div class="field"><label class="field-label">Color</label>
      <div class="color-picker">${GOAL_COLORS.map(c=>`<button type="button" class="color-swatch ${c===( existing?.color||"#8b7cff")?"is-selected":""}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join("")}</div></div>
    <div class="field"><label class="field-label">Icon</label>
      <div class="icon-picker">${GOAL_ICONS.map(i=>`<button type="button" class="icon-swatch ${i===(existing?.icon||"target")?"is-selected":""}" data-icon="${i}" title="${i}">${icon(i)}</button>`).join("")}</div></div>
    <div class="field"><label class="field-label">Notes</label>
      <input class="input" id="gl-notes" value="${esc(existing?.notes||"")}" placeholder="Optional notes" /></div>
    <button class="btn btn--primary btn--block" id="gl-save">${existing?icon("save")+" Update Goal":icon("plus")+" Create Goal"}</button>`;

  let selColor = existing?.color || "#8b7cff";
  let selIcon  = existing?.icon  || "target";
  body.addEventListener("click", e => {
    const cs = e.target.closest("[data-color]");
    const is = e.target.closest("[data-icon]");
    if (cs) { selColor = cs.dataset.color; body.querySelectorAll(".color-swatch").forEach(s=>s.classList.toggle("is-selected",s===cs)); }
    if (is) { selIcon  = is.dataset.icon;  body.querySelectorAll(".icon-swatch").forEach(s=>s.classList.toggle("is-selected",s===is)); }
  });

  const { close } = openDrawer({ title: existing?"Edit Goal":"New Savings Goal", body, width: "sm" });
  body.querySelector("#gl-save").addEventListener("click", async () => {
    const name = body.querySelector("#gl-name").value.trim();
    if (!name) { toastError("Goal name is required."); return; }
    const btn = body.querySelector("#gl-save"); btn.disabled=true;
    try {
      const data = { name, targetAmount: Number(body.querySelector("#gl-target").value)||0, currentAmount: Number(body.querySelector("#gl-current").value)||0, deadline: body.querySelector("#gl-deadline").value||null, color: selColor, icon: selIcon, notes: body.querySelector("#gl-notes").value };
      if (existing) await updateSavingsGoal(u.uid, existing.id, { ...existing, ...data });
      else await addSavingsGoal(u.uid, data);
      toastSuccess(existing?"Goal updated.":"Goal created."); close(); await renderSavings(outlet);
    } catch(err) { toastError(err.message||""); btn.disabled=false; }
  });
}

function openContributeForm(outlet, u, goal) {
  const body = document.createElement("div");
  body.className = "col gap-4";
  body.innerHTML = `
    <p>Current: <strong>${fmt(goal.currentAmount)}</strong> · Target: <strong>${fmt(goal.targetAmount)}</strong></p>
    <div class="field"><label class="field-label">Amount to Add</label>
      <input class="input" id="contrib-amount" type="number" min="1" placeholder="0" autofocus /></div>`;
  openModal({ title: `Add to "${goal.name}"`, body, size: "sm",
    actions: [
      { label: "Cancel", cls: "btn--ghost", onClick: c => c() },
      { label: icon("plus")+" Add Money", cls: "btn--primary", onClick: async c => {
        const amt = Number(body.querySelector("#contrib-amount").value);
        if (!amt) { toastError("Enter an amount."); return; }
        await contributeToGoal(u.uid, goal.id, amt);
        toastSuccess(`${fmt(amt)} added to ${goal.name}!`); c(); await renderSavings(outlet);
      }}
    ]
  });
}

const esc = s => String(s||"").replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
