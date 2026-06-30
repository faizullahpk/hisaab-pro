/**
 * Hisaab Pro — Family Service
 * Family members (Father/Mother/Brother/etc) + their monthly expenses.
 */
import { getDb, firebaseSDK } from "./firebase.js";
import { LocalDB } from "../storage/localdb.service.js";
import { COLLECTIONS } from "../../../config/app.config.js";

const C = COLLECTIONS;
const db = () => getDb();
const fs = () => firebaseSDK.firestore;
const userPath = uid => `${C.users}/${uid}`;
const memberPath = (uid, mid) => `${userPath(uid)}/${C.family}/${mid}`;
const docToObj = snap => ({ id: snap.id, ...snap.data() });

/* -- Members -- */
export async function addMember(uid, data) {
  const payload = sanitizeMember(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, userPath(uid), C.family), { ...payload, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  }
  return LocalDB.add(C.family, payload, userPath(uid));
}

export async function updateMember(uid, id, data) {
  const payload = sanitizeMember(data);
  const d = db();
  if (d) {
    const { doc, updateDoc, serverTimestamp } = fs();
    await updateDoc(doc(d, userPath(uid), C.family, id), { ...payload, updatedAt: serverTimestamp() });
    return { id, ...payload };
  }
  return LocalDB.update(C.family, id, payload, userPath(uid));
}

export async function deleteMember(uid, id) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, userPath(uid), C.family, id));
  } else {
    LocalDB.delete(C.family, id, userPath(uid));
    LocalDB.clearAll(C.familyExp, memberPath(uid, id));
  }
}

export async function getMembers(uid) {
  const d = db();
  if (d) {
    const { collection, getDocs } = fs();
    const snap = await getDocs(collection(d, userPath(uid), C.family));
    return snap.docs.map(docToObj);
  }
  return LocalDB.getAll(C.family, userPath(uid));
}

/* -- Expenses per member -- */
export async function addFamilyExpense(uid, memberId, data) {
  const payload = sanitizeExpense(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, memberPath(uid, memberId), C.familyExp), { ...payload, memberId, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  }
  return LocalDB.add(C.familyExp, { ...payload, memberId }, memberPath(uid, memberId));
}

export async function deleteFamilyExpense(uid, memberId, id) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, memberPath(uid, memberId), C.familyExp, id));
  } else {
    LocalDB.delete(C.familyExp, id, memberPath(uid, memberId));
  }
}

export async function getMemberExpenses(uid, memberId, ym = null) {
  const d = db();
  let items;
  if (d) {
    const { collection, query, orderBy, getDocs } = fs();
    const q = query(collection(d, memberPath(uid, memberId), C.familyExp), orderBy("date", "desc"));
    const snap = await getDocs(q);
    items = snap.docs.map(docToObj);
  } else {
    items = LocalDB.query(C.familyExp, { orderBy: ["date", "desc"] }, memberPath(uid, memberId));
  }
  if (ym) items = items.filter(e => (e.date || "").startsWith(ym));
  return items;
}

/** Monthly totals for all family members. */
export async function getFamilyMonthlySummary(uid) {
  const ym = new Date().toISOString().slice(0, 7);
  const members = await getMembers(uid);
  const result = [];
  for (const m of members) {
    const expenses = await getMemberExpenses(uid, m.id, ym);
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    result.push({ ...m, monthTotal: total, expenseCount: expenses.length });
  }
  return result;
}

function sanitizeMember(d) {
  return {
    name:          (d.name     || "").trim(),
    relation:      d.relation  || "other",
    monthlyBudget: Number(d.monthlyBudget) || 0,
    notes:         (d.notes    || "").trim() || null
  };
}
function sanitizeExpense(d) {
  return {
    amount:      Number(d.amount) || 0,
    description: (d.description || "").trim(),
    date:        d.date || new Date().toISOString().slice(0, 10),
    category:    d.category || "misc"
  };
}
