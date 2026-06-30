/**
 * Hisaab Pro — Local Database Service
 * Provides a Firestore-shaped API over localStorage so every financial
 * module works identically in Guest / offline mode and with Firebase.
 * Supports flat collections + nested sub-collections via compound keys.
 */
const NS = "hisaab:db:";

function uid() { return "local_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function now() { return new Date().toISOString(); }

function loadCol(key)    { try { return JSON.parse(localStorage.getItem(NS + key) || "[]"); } catch { return []; } }
function saveCol(key, v) { try { localStorage.setItem(NS + key, JSON.stringify(v)); } catch {} }

export const LocalDB = {
  /** Return all docs in a collection (optionally scoped to a parent). */
  getAll(collection, parent = null) {
    return loadCol(parent ? `${parent}/${collection}` : collection);
  },

  /** Return a single doc by id. */
  get(collection, id, parent = null) {
    return this.getAll(collection, parent).find(d => d.id === id) ?? null;
  },

  /** Add a new doc and return it. */
  add(collection, data, parent = null) {
    const key = parent ? `${parent}/${collection}` : collection;
    const items = loadCol(key);
    const doc = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    items.unshift(doc);
    saveCol(key, items);
    return doc;
  },

  /** Update a doc by id. Returns updated doc. */
  update(collection, id, data, parent = null) {
    const key = parent ? `${parent}/${collection}` : collection;
    const items = loadCol(key);
    const i = items.findIndex(d => d.id === id);
    if (i === -1) throw new Error(`[LocalDB] Not found: ${collection}/${id}`);
    items[i] = { ...items[i], ...data, updatedAt: now() };
    saveCol(key, items);
    return items[i];
  },

  /** Delete a doc by id. */
  delete(collection, id, parent = null) {
    const key = parent ? `${parent}/${collection}` : collection;
    saveCol(key, loadCol(key).filter(d => d.id !== id));
  },

  /**
   * Query a collection with simple filters.
   * opts: { where: [[field,op,value],...], orderBy: [field,dir], limit: n }
   */
  query(collection, opts = {}, parent = null) {
    let items = this.getAll(collection, parent);
    if (opts.where) {
      for (const [f, op, v] of opts.where) {
        items = items.filter(d => {
          const dv = d[f];
          if (op === "==")  return dv === v;
          if (op === "!=")  return dv !== v;
          if (op === ">")   return dv > v;
          if (op === ">=")  return dv >= v;
          if (op === "<")   return dv < v;
          if (op === "<=")  return dv <= v;
          if (op === "in")  return Array.isArray(v) && v.includes(dv);
          return true;
        });
      }
    }
    if (opts.orderBy) {
      const [f, dir = "asc"] = opts.orderBy;
      items = [...items].sort((a, b) => {
        const av = a[f] ?? "", bv = b[f] ?? "";
        return dir === "desc" ? (bv > av ? 1 : bv < av ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
      });
    }
    if (opts.limit) items = items.slice(0, opts.limit);
    return items;
  },

  /** Aggregate: sum a numeric field with optional where filters. */
  sum(collection, field, opts = {}, parent = null) {
    return this.query(collection, opts, parent).reduce((s, d) => s + (Number(d[field]) || 0), 0);
  },

  /** Delete ALL docs in a collection (for reset). */
  clearAll(collection, parent = null) {
    const key = parent ? `${parent}/${collection}` : collection;
    saveCol(key, []);
  }
};
