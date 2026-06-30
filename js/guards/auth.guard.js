/**
 * Hisaab Pro — Route Guard
 * Decides whether a route may render, or where to redirect.
 * route.auth: true (must be signed in) | false (guests only) | "any"
 */
import { appStore } from "../core/store.js";
import { DEFAULT_ROUTE_AUTHED, DEFAULT_ROUTE_GUEST } from "../../config/app.config.js";

export function authGuard(route) {
  const { user } = appStore.get();
  const authed = Boolean(user);

  // Unknown route -> let router show 404 (no redirect)
  if (!route) return { allow: true };

  if (route.auth === true && !authed) {
    return { allow: false, redirect: DEFAULT_ROUTE_GUEST };
  }
  if (route.auth === false && authed) {
    return { allow: false, redirect: DEFAULT_ROUTE_AUTHED };
  }
  return { allow: true };
}
