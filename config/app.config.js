/**
 * Hisaab Pro — Application Configuration v2.0
 * Phases 3–7: Dashboard, Income+Expenses, Clients+Debts, Family+Savings, Reports
 */
export const APP = Object.freeze({
  name: "Hisaab Pro",
  tagline: "Your Personal Financial Operating System",
  version: "2.0.0",
  phase: "Full Financial Operating System",
  defaultTheme: "midnight",
  defaultCurrency: "PKR",
  defaultLocale: "en-PK",
  brand: {
    company: "DGTechnology.online",
    fullName: "Digital Galaxy — Where Everything Is Possible",
    url: "https://dgtechnology.online"
  }
});

export const CURRENCIES = Object.freeze([
  { code: "PKR", symbol: "₨", label: "Pakistani Rupee" },
  { code: "USD", symbol: "$",  label: "US Dollar" },
  { code: "EUR", symbol: "€",  label: "Euro" },
  { code: "GBP", symbol: "£",  label: "British Pound" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SAR", symbol: "﷼",  label: "Saudi Riyal" },
  { code: "INR", symbol: "₹",  label: "Indian Rupee" }
]);

export const LANGUAGES = Object.freeze([
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "اردو",    dir: "rtl" }
]);

/** Income categories with color and icon */
export const INCOME_CATEGORIES = Object.freeze([
  { id: "freelance",  label: "Freelance Work",    icon: "briefcase",    color: "#8b7cff" },
  { id: "salary",     label: "Salary",             icon: "trending-up",  color: "#5be7a9" },
  { id: "project",    label: "Project Payment",    icon: "receipt",      color: "#4f8cff" },
  { id: "bonus",      label: "Bonus",              icon: "sparkle",      color: "#ffcf5c" },
  { id: "investment", label: "Investment",         icon: "chart",        color: "#ff7ac6" },
  { id: "rental",     label: "Rental Income",      icon: "home",         color: "#57d9c7" },
  { id: "other-in",   label: "Other Income",       icon: "coins",        color: "#9a9ab0" }
]);

/** Expense categories with color and icon */
export const EXPENSE_CATEGORIES = Object.freeze([
  { id: "food",        label: "Food & Dining",      icon: "zap",          color: "#ff6b7d" },
  { id: "transport",   label: "Transportation",     icon: "arrow-right",  color: "#ffa94d" },
  { id: "housing",     label: "Housing & Rent",     icon: "home",         color: "#8b7cff" },
  { id: "utilities",   label: "Utilities",          icon: "zap",          color: "#4f8cff" },
  { id: "health",      label: "Health & Medical",   icon: "heart",        color: "#5be7a9" },
  { id: "education",   label: "Education",          icon: "file-text",    color: "#ffcf5c" },
  { id: "shopping",    label: "Shopping",           icon: "tag",          color: "#ff7ac6" },
  { id: "family",      label: "Family",             icon: "users",        color: "#57d9c7" },
  { id: "entertain",   label: "Entertainment",      icon: "star",         color: "#b16cff" },
  { id: "misc",        label: "Miscellaneous",      icon: "grid",         color: "#7d7799" }
]);

/** Default family relations */
export const FAMILY_RELATIONS = Object.freeze([
  { id: "father",  label: "Father",       icon: "user" },
  { id: "mother",  label: "Mother",       icon: "user" },
  { id: "brother", label: "Brother",      icon: "user" },
  { id: "sister",  label: "Sister",       icon: "user" },
  { id: "pocket",  label: "Pocket Money", icon: "wallet" },
  { id: "other",   label: "Other",        icon: "users" }
]);

export const ROUTES = Object.freeze({
  "/login":          { page: "login",          layout: "auth", auth: false,  title: "Sign in" },
  "/signup":         { page: "signup",         layout: "auth", auth: false,  title: "Create account" },
  "/reset":          { page: "reset",          layout: "auth", auth: false,  title: "Reset password" },
  "/verify":         { page: "verify",         layout: "auth", auth: "any",  title: "Verify email" },
  "/unauthorized":   { page: "unauthorized",   layout: "auth", auth: "any",  title: "Access denied" },
  "/dashboard":      { page: "dashboard",      layout: "app",  auth: true,   title: "Dashboard" },
  "/income-expenses":{ page: "income-expenses",layout: "app",  auth: true,   title: "Income & Expenses" },
  "/clients-debts":  { page: "clients-debts",  layout: "app",  auth: true,   title: "Clients & Debts" },
  "/family-savings": { page: "family-savings", layout: "app",  auth: true,   title: "Family & Savings" },
  "/reports":        { page: "reports",        layout: "app",  auth: true,   title: "Reports" },
  "/profile":        { page: "profile",        layout: "app",  auth: true,   title: "Profile" },
  "/settings":       { page: "settings",       layout: "app",  auth: true,   title: "Settings" },
  "/security":       { page: "security",       layout: "app",  auth: true,   title: "Security" }
});

export const DEFAULT_ROUTE_AUTHED = "/dashboard";
export const DEFAULT_ROUTE_GUEST  = "/login";

export const COLLECTIONS = Object.freeze({
  users:        "users",
  sessions:     "sessions",
  devices:      "devices",
  loginHistory: "login_history",
  preferences:  "preferences",
  transactions: "transactions",
  clients:      "clients",
  payments:     "payments",
  debts:        "debts",
  family:       "family",
  familyExp:    "family_expenses",
  savings:      "savings",
  receipts:     "receipts"
});

export const NAV = Object.freeze([
  { group: "Overview", items: [
    { id: "dashboard",        label: "Dashboard",        icon: "grid",         path: "/dashboard" }
  ]},
  { group: "Money", items: [
    { id: "income-expenses",  label: "Income & Expenses",icon: "trending-up",  path: "/income-expenses" },
    { id: "clients-debts",    label: "Clients & Debts",  icon: "briefcase",    path: "/clients-debts" },
    { id: "family-savings",   label: "Family & Savings", icon: "heart",        path: "/family-savings" }
  ]},
  { group: "Insight", items: [
    { id: "reports",          label: "Reports",          icon: "pie-chart",    path: "/reports" }
  ]},
  { group: "System", items: [
    { id: "profile",          label: "Profile",          icon: "user",         path: "/profile" },
    { id: "settings",         label: "Settings",         icon: "gear",         path: "/settings" },
    { id: "security",         label: "Security",         icon: "shield",       path: "/security" }
  ]}
]);
