/**
 * Hisaab Pro — Profile Page
 * View + edit profile, upload an avatar (to Cloudinary), and see
 * account statistics. Works for both cloud and guest users.
 */
import { icon } from "../components/icons.js";
import { qs } from "../core/dom.js";
import { getUser, updateUserProfile, isGuest } from "../services/firebase/auth.service.js";
import { uploadToCloudinary, isCloudinaryConfigured } from "../services/cloudinary/cloudinary.service.js";
import { initials, formatDate } from "../utils/formatters.js";
import { readAsDataURL } from "../utils/helpers.js";
import { toastSuccess, toastError } from "../components/toast.js";

export default function render(outlet) {
  const u = getUser();

  outlet.innerHTML = `
    <div class="page-head">
      <span class="eyebrow">Account</span>
      <h1>Your profile</h1>
      <p>Manage how you appear across Hisaab Pro.</p>
    </div>

    <div class="grid" style="grid-template-columns: 360px 1fr; gap:24px; align-items:start">
      <div class="card card--pad-lg profile-side" data-anim>
        <div class="avatar-edit">
          <span class="avatar avatar--xl" id="avatar">${u?.photoURL ? `<img src="${u.photoURL}" alt="">` : initials(u?.name)}</span>
          <button class="avatar-cam" id="avatar-btn" aria-label="Change photo">${icon("camera")}</button>
          <input type="file" id="avatar-input" accept="image/*" hidden />
          <div class="avatar-progress hidden" id="avatar-progress"><div class="bar"></div></div>
        </div>
        <div class="profile-name-lg" id="name-display">${u?.name || "Guest"}</div>
        <div class="text-mute" style="font-size:14px">${u?.email || "Guest session"}</div>
        <div class="profile-tags">
          <span class="badge ${u?.isGuest ? "" : "badge--primary"}">${u?.isGuest ? "Guest" : "Member"}</span>
          <span class="badge">${providerLabel(u?.provider)}</span>
          ${u?.emailVerified && !u?.isGuest ? `<span class="badge badge--dot" style="color:var(--c-success)">Verified</span>` : ""}
        </div>
      </div>

      <div class="col gap-6">
        <div class="card card--pad-lg" data-anim>
          <div class="card-header"><div class="card-title">Profile details</div></div>
          <form id="profile-form" class="col gap-4">
            <div class="field">
              <label class="field-label" for="name">Display name</label>
              <input class="input" id="name" type="text" value="${attr(u?.name)}" placeholder="Your name" />
            </div>
            <div class="field">
              <label class="field-label" for="email">Email</label>
              <input class="input" id="email" type="email" value="${attr(u?.email)}" disabled placeholder="${u?.isGuest ? "Not set for guests" : ""}" />
              <small>Email can't be changed here.</small>
            </div>
            <div class="flex gap-3">
              <button class="btn btn--primary" type="submit" id="save-btn">Save changes</button>
              ${isGuest() ? `<a class="btn btn--ghost" href="#/signup">${icon("sparkle")} Create a real account</a>` : ""}
            </div>
          </form>
        </div>

        <div class="card card--pad-lg" data-anim>
          <div class="card-header"><div class="card-title">Account</div></div>
          <div class="grid grid-2">
            ${stat("Member since", u?.createdAt ? formatDate(u.createdAt) : "—")}
            ${stat("Last sign-in", u?.lastLoginAt ? formatDate(u.lastLoginAt) : "Today")}
            ${stat("Sign-in method", providerLabel(u?.provider))}
            ${stat("Storage", isCloudinaryConfigured ? "Cloudinary linked" : "Not linked")}
          </div>
        </div>
      </div>
    </div>`;

  // ---- Avatar upload ----
  const fileInput = qs("#avatar-input", outlet);
  qs("#avatar-btn", outlet).addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!isCloudinaryConfigured) { toastError("Cloudinary isn't configured."); return; }

    // Instant local preview
    const preview = await readAsDataURL(file);
    qs("#avatar", outlet).innerHTML = `<img src="${preview}" alt="">`;
    const progress = qs("#avatar-progress", outlet);
    const bar = progress.querySelector(".bar");
    progress.classList.remove("hidden");

    try {
      const res = await uploadToCloudinary(file, {
        folder: "hisaab-pro/avatars",
        tags: ["avatar", u?.uid || "guest"],
        onProgress: (pct) => { bar.style.width = pct + "%"; }
      });
      await updateUserProfile({ photoURL: res.secureUrl });
      qs("#avatar", outlet).innerHTML = `<img src="${res.secureUrl}" alt="">`;
      toastSuccess("Profile photo updated.", "Saved");
    } catch (err) {
      toastError(err.message || "Upload failed.");
      qs("#avatar", outlet).innerHTML = initials(getUser()?.name);
    } finally {
      setTimeout(() => { progress.classList.add("hidden"); bar.style.width = "0%"; }, 500);
    }
  });

  // ---- Save name ----
  qs("#profile-form", outlet).addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = qs("#name", outlet).value.trim();
    if (!name) { toastError("Name can't be empty."); return; }
    const btn = qs("#save-btn", outlet);
    btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span> Saving…`;
    try {
      await updateUserProfile({ name });
      qs("#name-display", outlet).textContent = name;
      toastSuccess("Profile updated.", "Saved");
    } catch (err) { toastError(err.message || "Couldn't save."); }
    finally { btn.disabled = false; btn.textContent = "Save changes"; }
  });
}

function stat(label, value) {
  return `<div class="stat-block"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}
const providerLabel = (p) => ({ "google.com": "Google", password: "Email", guest: "Guest" }[p] || "Email");
const attr = (s = "") => String(s ?? "").replace(/"/g, "&quot;");
