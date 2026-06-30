/**
 * Hisaab Pro — Debts Service
 * Tracks money borrowed (I owe) and money lent (others owe me).
 * Shape: { id, type:'borrowed'|'lent', person, amount, remaining,
 *           description, dueDate, status:'active'|'settled', createdAt }
 */
import { getDb, firebaseSDK } from "./firebase.js";
import { LocalDB } from "../storage/localdb.service.js";
import { COLLECTIONS } from "../../../config/app.config.js";

const C = COLLECTIONS;
const db = () => getDb();
const fs = () => firebaseSDK.firestore;
const userPath = uid => `${C.users}/${uid}`;
const docToObj = snap => ({ id: snap.id, ...snap.data(), amount: Number(snap.data().amount || 0), remaining: Number(snap.data().remaining || 0) });

export async function addDebt(uid, data) {
  const payload = sanitize(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, userPath(uid), C.debts), { ...payload, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  }
  return LocalDB.add(C.debts, payload, userPath(uid));
}

export async function updateDebt(uid, id, data) {
  const payload = sanitize(data);
  const d = db();
  if (d) {
    const { doc, updateDoc, serverTimestamp } = fs();
    await updateDoc(doc(d, userPath(uid), C.debts, id), { ...payload, updatedAt: serverTimestamp() });
    return { id, ...payload };
  }
  return LocalDB.update(C.debts, id, payload, userPath(uid));
}

export async function deleteDebt(uid, id) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, userPath(uid), C.debts, id));
  } else {
    LocalDB.delete(C.debts, id, userPath(uid));
  }
}

export async function settleDebt(uid, id, amount = null) {
  const debt = await getDebt(uid, id);
  if (!debt) return;
  const remaining = amount !== null ? Math.max(0, debt.remaining - amount) : 0;
  return updateDebt(uid, id, { ...debt, remaining, status: remaining <= 0 ? "settled" : "active" });
}

export async function getDebts(uid, type = null) {
  const d = db();
  let items;
  if (d) {
    const { collection, query, orderBy, where, getDocs } = fs();
    const constraints = [orderBy("createdAt", "desc")];
    if (type) constraints.unshift(where("type", "==", type));
    const q = query(collection(d, userPath(uid), C.debts), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(docToObj);
  } else {
    const opts = { orderBy: ["createdAt", "desc"] };
    if (type) opts.where = [["type", "==", type]];
    items = LocalDB.query(C.debts, opts, userPath(uid));
  }
  return items;
}

export async function getDebt(uid, id) {
  const d = db();
  if (d) {
    const { doc, getDoc } = fs();
    const snap = await getDoc(doc(d, userPath(uid), C.debts, id));
    return snap.exists() ? docToObj(snap) : null;
  }
  return LocalDB.get(C.debts, id, userPath(uid));
}

/** Summary for dashboard: total borrowed, total lent, totals remaining. */
export async function getDebtSummary(uid) {
  const all = await getDebts(uid);
  const active = all.filter(d => d.status === "active");
  const iOwe   = active.filter(d => d.type === "borrowed").reduce((s, d) => s + (d.remaining ?? d.amount), 0);
  const owedMe = active.filter(d => d.type === "lent").reduce((s, d)   => s + (d.remaining ?? d.amount), 0);
  return { iOwe, owedMe, activeCount: active.length };
}

function sanitize(d) {
  const amount = Number(d.amount) || 0;
  return {
    type:        d.type        || "borrowed",
    person:      (d.person     || "").trim(),
    amount,
    remaining:   d.remaining !== undefined ? Number(d.remaining) : amount,
    description: (d.description || "").trim(),
    dueDate:     d.dueDate     || null,
    status:      d.status      || "active"
  };
}
