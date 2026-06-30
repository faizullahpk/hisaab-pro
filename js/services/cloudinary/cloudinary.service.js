/**
 * Hisaab Pro — Cloudinary Service
 * Unsigned, client-side uploads for receipts, invoices, statements,
 * contracts and screenshots. Returns the secure URL + metadata only —
 * the binary lives on Cloudinary, Firestore stores the link.
 *
 * Wired to your live environment: cloud "dtpanksun", preset "upload".
 */
import { cloudinaryConfig, isCloudinaryConfigured, CLOUDINARY_ENDPOINTS } from "../../../config/cloudinary.config.js";

const RAW_TYPES = ["application/pdf", "text/csv", "application/vnd.ms-excel"];

function endpointFor(file) {
  const { cloudName } = cloudinaryConfig;
  if (file.type?.startsWith("image/")) return CLOUDINARY_ENDPOINTS.image(cloudName);
  if (RAW_TYPES.includes(file.type)) return CLOUDINARY_ENDPOINTS.raw(cloudName);
  return CLOUDINARY_ENDPOINTS.auto(cloudName);
}

/**
 * Upload a single File/Blob with progress reporting.
 * @param {File} file
 * @param {Object} opts { folder, tags[], onProgress(pct) }
 * @returns {Promise<{url, secureUrl, publicId, format, bytes, width, height, resourceType, originalName}>}
 */
export function uploadToCloudinary(file, opts = {}) {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error("Cloudinary is not configured (check config/env.js)."));
  }
  const { uploadPreset, folder } = cloudinaryConfig;
  const url = endpointFor(file);

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", opts.folder || folder || "hisaab-pro");
  if (opts.tags?.length) form.append("tags", opts.tags.join(","));
  if (opts.context) form.append("context", opts.context);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const r = JSON.parse(xhr.responseText);
        resolve({
          url: r.url,
          secureUrl: r.secure_url,
          publicId: r.public_id,
          format: r.format,
          bytes: r.bytes,
          width: r.width || null,
          height: r.height || null,
          resourceType: r.resource_type,
          originalName: file.name,
          createdAt: r.created_at,
          thumbnail: r.resource_type === "image" ? thumbUrl(r.secure_url) : null
        });
      } else {
        let msg = "Upload failed";
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/** Upload many files, reporting aggregate progress. */
export async function uploadMany(files, opts = {}) {
  const list = [...files];
  const total = list.length;
  const results = [];
  for (let i = 0; i < total; i++) {
    const res = await uploadToCloudinary(list[i], {
      ...opts,
      onProgress: (pct) => opts.onProgress?.(Math.round(((i + pct / 100) / total) * 100), i, pct)
    });
    results.push(res);
  }
  return results;
}

/** Build an on-the-fly optimised thumbnail transformation URL. */
export function thumbUrl(secureUrl, w = 320, h = 320) {
  return secureUrl.replace("/upload/", `/upload/c_fill,w_${w},h_${h},q_auto,f_auto/`);
}

export { isCloudinaryConfigured };
