/**
 * Hisaab Pro — Clients Service
 * Manages client records and their payment history.
 * Each client has: name, email, phone, company, notes.
 * Each payment has: amount, description, status(pending/paid), dueDate, invoiceUrl.
 */
import { getDb, firebaseSDK } from "./firebase.js";
import { LocalDB } from "../storage/localdb.service.js";
import { COLLECTIONS } from "../../../config/app.config.js";

const C = COLLECTIONS;
function db() { return getDb(); }
function fs() { return firebaseSDK.firestore; }
function userPath(uid) { return `${C.users}/${uid}`; }
function clientPath(uid, cid) { return `${userPath(uid)}/${C.clients}/${cid}`; }
function docToObj(snap) { return { id: snap.id, ...snap.data() }; }

/* ========================= CLIENTS ================================ */

export async function addClient(uid, data) {
  const payload = sanitizeClient(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, userPath(uid), C.clients), {
      ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    return { id: ref.id, ...payload };
  }
  return LocalDB.add(C.clients, payload, userPath(uid));
}

export async function updateClient(uid, id, data) {
  const payload = sanitizeClient(data);
  const d = db();
  if (d) {
    const { doc, updateDoc, serverTimestamp } = fs();
    await updateDoc(doc(d, userPath(uid), C.clients, id), { ...payload, updatedAt: serverTimestamp() });
    return { id, ...payload };
  }
  return LocalDB.update(C.clients, id, payload, userPath(uid));
}

export async function deleteClient(uid, id) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, userPath(uid), C.clients, id));
  } else {
    LocalDB.delete(C.clients, id, userPath(uid));
    LocalDB.clearAll(C.payments, clientPath(uid, id));
  }
}

export async function getClients(uid) {
  const d = db();
  if (d) {
    const { collection, query, orderBy, getDocs } = fs();
    const q = query(collection(d, userPath(uid), C.clients), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(docToObj);
  }
  return LocalDB.query(C.clients, { orderBy: ["name", "asc"] }, userPath(uid));
}

export async function getClient(uid, id) {
  const d = db();
  if (d) {
    const { doc, getDoc } = fs();
    const snap = await getDoc(doc(d, userPath(uid), C.clients, id));
    return snap.exists() ? docToObj(snap) : null;
  }
  return LocalDB.get(C.clients, id, userPath(uid));
}

/* ========================= PAYMENTS =============================== */

export async function addPayment(uid, clientId, data) {
  const payload = sanitizePayment(data);
  const d = db();
  if (d) {
    const { collection, addDoc, serverTimestamp } = fs();
    const ref = await addDoc(collection(d, clientPath(uid, clientId), C.payments), {
      ...payload, clientId, createdAt: serverTimestamp()
    });
    return { id: ref.id, ...payload, clientId };
  }
  return LocalDB.add(C.payments, { ...payload, clientId }, clientPath(uid, clientId));
}

export async function updatePayment(uid, clientId, paymentId, data) {
  const payload = sanitizePayment(data);
  const d = db();
  if (d) {
    const { doc, updateDoc, serverTimestamp } = fs();
    await updateDoc(doc(d, clientPath(uid, clientId), C.payments, paymentId), {
      ...payload, updatedAt: serverTimestamp()
    });
    return { id: paymentId, ...payload };
  }
  return LocalDB.update(C.payments, paymentId, payload, clientPath(uid, clientId));
}

export async function deletePayment(uid, clientId, paymentId) {
  const d = db();
  if (d) {
    const { doc, deleteDoc } = fs();
    await deleteDoc(doc(d, clientPath(uid, clientId), C.payments, paymentId));
  } else {
    LocalDB.delete(C.payments, paymentId, clientPath(uid, clientId));
  }
}

export async function getClientPayments(uid, clientId) {
  const d = db();
  if (d) {
    const { collection, query, orderBy, getDocs } = fs();
    const q = query(collection(d, clientPath(uid, clientId), C.payments), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(docToObj);
  }
  return LocalDB.query(C.payments, { orderBy: ["createdAt", "desc"] }, clientPath(uid, clientId));
}

/** All pending payments across all clients (for dashboard). */
export async function getAllPendingPayments(uid) {
  const clients = await getClients(uid);
  const pending = [];
  for (const client of clients) {
    const payments = await getClientPayments(uid, client.id);
    payments.filter(p => p.status === "pending").forEach(p => pending.push({ ...p, clientName: client.name }));
  }
  return pending.sort((a, b) => (b.amount - a.amount));
}

/** Client summary: totalBilled, totalPaid, totalPending. */
export async function getClientSummary(uid, clientId) {
  const payments = await getClientPayments(uid, clientId);
  const total   = payments.reduce((s, p) => s + Number(p.amount), 0);
  const paid    = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  return { total, paid, pending: total - paid };
}

/* ========================= HELPERS ================================ */
function sanitizeClient(d) {
  return {
    name:    (d.name    || "").trim(),
    email:   (d.email   || "").trim() || null,
    phone:   (d.phone   || "").trim() || null,
    company: (d.company || "").trim() || null,
    notes:   (d.notes   || "").trim() || null
  };
}
function sanitizePayment(d) {
  return {
    amount:      Number(d.amount) || 0,
    description: (d.description || "").trim(),
    status:      d.status || "pending",
    dueDate:     d.dueDate  || null,
    paidAt:      d.paidAt   || null,
    invoiceUrl:  d.invoiceUrl || null
  };
}
