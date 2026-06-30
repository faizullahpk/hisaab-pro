/** Hisaab Pro — Validators (pure, reusable) */
export const isEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isStrongEnough = (v = "") => v.length >= 6;
export const isNotEmpty = (v = "") => v.trim().length > 0;
export const matches = (a, b) => a === b;

/** Password strength score 0..4 with a label. */
export function passwordStrength(pw = "") {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score], pct: (score / 4) * 100 };
}

/** Run a field map of value->rules; returns { valid, errors }. */
export function validate(fields) {
  const errors = {};
  for (const [name, { value, rules }] of Object.entries(fields)) {
    for (const rule of rules) {
      const msg = rule(value);
      if (msg) { errors[name] = msg; break; }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/* Rule factories returning an error string or "" */
export const required = (msg = "This field is required") => (v) => (isNotEmpty(v) ? "" : msg);
export const email = (msg = "Enter a valid email") => (v) => (isEmail(v) ? "" : msg);
export const minLen = (n, msg) => (v) => (v?.length >= n ? "" : (msg || `Use at least ${n} characters`));
export const sameAs = (getOther, msg = "Values don't match") => (v) => (v === getOther() ? "" : msg);
