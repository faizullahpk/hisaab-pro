/**
 * Hisaab Pro — Savings Service
 * Savings goals with contributions.
 * Goal: { id, name, targetAmount, currentAmount, color, icon, deadline, status }
 */
import { getDb, firebaseSDK } from "./firebase.js";
import { LocalDB } from "../storage/localdb.service.js";
import { COLLECTIONS } from "../../../config/app.config.js";

const C = COLLECTIONS;
const db = () => getDb();
const fs = () => firebaseSDK.firestore;
const userPath = uid => `${C.users}/${uid}`;
const docToObj = snap => ({ id: snap.id, ...snap.data(), targetAmount: Number(snap.data().targetAmount || 0), currentAmount: Number(snap.data().currentAmount || 0) });

export async function addSavingsGoal(uid, data) {
  const payload = sanitize(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, userPath(uid), C.savings), { ...payload, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  }
  return LocalDB.add(C.savings, payload, userPath(uid));
}

export async function updateSavingsGoal(uid, id, data) {
  const payload = sanitize(data);
  const d = db();
  if (d) {
    const { doc, updateDoc, serverTimestamp } = fs();
    await updateDoc(doc(d, userPath(uid), C.savings, id), { ...payload, updatedAt: serverTimestamp() });
    return { id, ...payload };
  }
  return LocalDB.update(C.savings, id, payload, userPath(uid));
}

export async function deleteSavingsGoal(uid, id) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, userPath(uid), C.savings, id));
  } else {
    LocalDB.delete(C.savings, id, userPath(uid));
  }
}

export async function contributeToGoal(uid, id, amount, note = "") {
  const goal = await getSavingsGoal(uid, id);
  if (!goal) throw new Error("Goal not found");
  const newAmount = goal.currentAmount + Number(amount);
  const status = newAmount >= goal.targetAmount ? "completed" : "active";
  return updateSavingsGoal(uid, id, { ...goal, currentAmount: newAmount, status });
}

export async function getSavingsGoals(uid) {
  const d = db();
  if (d) {
    const { collection, query, orderBy, getDocs } = fs();
    const q = query(collection(d, userPath(uid), C.savings), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(docToObj);
  }
  return LocalDB.query(C.savings, { orderBy: ["createdAt", "desc"] }, userPath(uid));
}

export async function getSavingsGoal(uid, id) {
  const d = db();
  if (d) {
    const { doc, getDoc } = fs();
    const snap = await getDoc(doc(d, userPath(uid), C.savings, id));
    return snap.exists() ? docToObj(snap) : null;
  }
  return LocalDB.get(C.savings, id, userPath(uid));
}

/** Total saved across all active goals. */
export async function getTotalSaved(uid) {
  const goals = await getSavingsGoals(uid);
  return goals.reduce((s, g) => s + Number(g.currentAmount), 0);
}

function sanitize(d) {
  return {
    name:          (d.name   || "Savings Goal").trim(),
    targetAmount:  Number(d.targetAmount)  || 0,
    currentAmount: Number(d.currentAmount) || 0,
    color:         d.color   || "#8b7cff",
    icon:          d.icon    || "target",
    deadline:      d.deadline || null,
    status:        d.status  || "active",
    notes:         (d.notes  || "").trim() || null
  };
}
