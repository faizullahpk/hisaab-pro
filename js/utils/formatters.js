/** Hisaab Pro — Formatters */
import { CURRENCIES, APP } from "../../config/app.config.js";

export function formatMoney(amount, code = APP.defaultCurrency, opts = {}) {
  const cur = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(APP.defaultLocale, {
      style: "currency", currency: cur.code,
      maximumFractionDigits: opts.decimals ?? 0
    }).format(n);
  } catch {
    return `${cur.symbol}${n.toLocaleString()}`;
  }
}

export const formatNumber = (n) => new Intl.NumberFormat(APP.defaultLocale).format(Number(n) || 0);

export function formatDate(value, style = "medium") {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat(APP.defaultLocale, { dateStyle: style }).format(d);
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat(APP.defaultLocale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return "—";
  const diff = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(APP.defaultLocale, { numeric: "auto" });
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
  for (const [unit, s] of units) {
    if (Math.abs(diff) >= s || unit === "second") return rtf.format(Math.round(diff / s), unit);
  }
}

export function fileSize(bytes = 0) {
  if (!bytes) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "U";

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
export { toDate };
