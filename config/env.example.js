/**
 * Hisaab Pro — Environment Template
 * ----------------------------------
 * 1. Copy this file to `config/env.js`
 * 2. Paste your real Firebase + Cloudinary credentials
 * 3. `config/env.js` is gitignored so secrets never reach your repo
 *
 * This pattern keeps the app buildless: it runs directly on
 * GitHub Pages, Cloudflare Pages, Firebase Hosting or Vercel.
 */
window.__HISAAB_ENV__ = {
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  },
  cloudinary: {
    cloudName: "YOUR_CLOUD_NAME",
    // Create an UNSIGNED upload preset in Cloudinary settings
    uploadPreset: "hisaab_unsigned",
    folder: "hisaab-pro"
  }
};
