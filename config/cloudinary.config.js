/**
 * Hisaab Pro — Cloudinary Configuration Resolver
 * Unsigned uploads keep this buildless and client-safe.
 * Only resulting secure URLs are ever stored in Firestore.
 */
const env = (typeof window !== "undefined" && window.__HISAAB_ENV__) || {};

export const cloudinaryConfig = env.cloudinary || {
  cloudName: "",
  uploadPreset: "",
  folder: "hisaab-pro"
};

export const isCloudinaryConfigured = Boolean(
  cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset
);

export const CLOUDINARY_ENDPOINTS = Object.freeze({
  image: (cloud) => `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
  raw:   (cloud) => `https://api.cloudinary.com/v1_1/${cloud}/raw/upload`,
  auto:  (cloud) => `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`
});
