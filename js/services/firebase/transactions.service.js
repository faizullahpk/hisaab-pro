/**
 * Hisaab Pro — Transactions Service
 * Unified income + expense data layer.
 * Works identically with Firebase (cloud) or LocalDB (offline/guest).
 *
 * Transaction shape:
 * { id, type:'income'|'expense', amount, category, description,
 *   date(ISO), receiptUrl, receiptName, tags[], createdAt, updatedAt }
 */
import { getDb, firebaseSDK } from "./firebase.js";
import { LocalDB } from "../storage/localdb.service.js";
import { COLLECTIONS } from "../../../config/app.config.js";

const COL = COLLECTIONS.transactions;

/* ---- helpers ---- */
function db() { return getDb(); }
function fs() { return firebaseSDK.firestore; }
function userPath(uid) { return `${COLLECTIONS.users}/${uid}`; }
function isoToFirestore(iso) {
  if (!iso) return null;
  const { Timestamp } = firebaseSDK.firestore || {};
  return Timestamp ? Timestamp.fromDate(new Date(iso)) : iso;
}

/* ============================== WRITE ============================== */

export async function addTransaction(uid, data) {
  const payload = sanitize(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, userPath(uid), COL), {
      ...payload,
      date: isoToFirestore(payload.date) || serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: ref.id, ...payload };
  }
  return LocalDB.add(COL, payload, userPath(uid));
}

export async function updateTransaction(uid, id, data) {
  const payload = sanitize(data);
  const d = db();
  if (d) {
    const { doc, updateDoc, serverTimestamp } = fs();
    await updateDoc(doc(d, userPath(uid), COL, id), {
      ...payload,
      date: isoToFirestore(payload.date),
      updatedAt: serverTimestamp()
    });
    return { id, ...payload };
  }
  return LocalDB.update(COL, id, payload, userPath(uid));
}

export async function deleteTransaction(uid, id) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, userPath(uid), COL, id));
  } else {
    LocalDB.delete(COL, id, userPath(uid));
  }
}

/* ============================== READ =============================== */

export async function getTransactions(uid, opts = {}) {
  const d = db();
  if (d) {
    const { collection, query, where, orderBy, limit, getDocs } = fs();
    const constraints = [orderBy("date", "desc")];
    if (opts.type)      constraints.unshift(where("type", "==", opts.type));
    if (opts.category)  constraints.unshift(where("category", "==", opts.category));
    if (opts.limit)     constraints.push(limit(opts.limit));
    const q = query(collection(d, userPath(uid), COL), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(docToObj);
  }
  const qOpts = { orderBy: ["date", "desc"] };
  if (opts.type)     qOpts.where = (qOpts.where || []).concat([["type", "==", opts.type]]);
  if (opts.category) qOpts.where = (qOpts.where || []).concat([["category", "==", opts.category]]);
  if (opts.limit)    qOpts.limit = opts.limit;
  return LocalDB.query(COL, qOpts, userPath(uid));
}

export async function getTransaction(uid, id) {
  const d = db();
  if (d) {
    const { doc, getDoc } = fs();
    const snap = await getDoc(doc(d, userPath(uid), COL, id));
    return snap.exists() ? docToObj(snap) : null;
  }
  return LocalDB.get(COL, id, userPath(uid));
}

export async function getRecentTransactions(uid, count = 10) {
  return getTransactions(uid, { limit: count });
}

/** Get all transactions for a specific year+month (YYYY-MM). */
export async function getMonthTransactions(uid, ym) {
  const all = await getTransactions(uid);
  return all.filter(t => (t.date || "").startsWith(ym));
}

/** Summary for the current month: income total + expense total. */
export async function getMonthSummary(uid) {
  const ym = new Date().toISOString().slice(0, 7);
  const txns = await getMonthTransactions(uid, ym);
  const income   = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return { income, expenses, net: income - expenses, month: ym };
}

/** All-time balance = total income – total expenses. */
export async function getAllTimeBalance(uid) {
  const all = await getTransactions(uid);
  const income   = all.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = all.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return { income, expenses, balance: income - expenses };
}

/** Per-category totals for a given type (used in reports). */
export async function getCategoryTotals(uid, type, ym = null) {
  let txns = await getTransactions(uid, { type });
  if (ym) txns = txns.filter(t => (t.date || "").startsWith(ym));
  const map = {};
  txns.forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
  return map;
}

/** Monthly totals for the last N months (used in bar chart). */
export async function getMonthlyTotals(uid, months = 6) {
  const all = await getTransactions(uid);
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" });
    const txns = all.filter(t => (t.date || "").startsWith(ym));
    const income   = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    result.push({ ym, label, income, expenses, net: income - expenses });
  }
  return result;
}

/* ========================== SEARCH ================================= */

export async function searchTransactions(uid, q) {
  if (!q || q.length < 2) return getTransactions(uid, { limit: 40 });
  const all = await getTransactions(uid);
  const lq = q.toLowerCase();
  return all.filter(t =>
    (t.description || "").toLowerCase().includes(lq) ||
    (t.category    || "").toLowerCase().includes(lq) ||
    String(t.amount).includes(lq)
  );
}

/* ========================== HELPERS ================================ */

function sanitize(d) {
  return {
    type:        d.type        || "expense",
    amount:      Number(d.amount) || 0,
    category:    d.category    || "misc",
    description: (d.description || "").trim(),
    date:        d.date        || new Date().toISOString().slice(0, 10),
    receiptUrl:  d.receiptUrl  || null,
    receiptName: d.receiptName || null,
    tags:        Array.isArray(d.tags) ? d.tags : []
  };
}

function docToObj(snap) {
  const d = snap.data();
  return {
    id: snap.id,
    ...d,
    amount: Number(d.amount) || 0,
    date: d.date?.toDate ? d.date.toDate().toISOString().slice(0, 10) : (d.date || "")
  };
}
