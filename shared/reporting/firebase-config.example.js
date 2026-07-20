// Copy this file to firebase-config.js and fill in your Firebase web app config.
// Firebase Web config is okay to expose.
// Do NOT put service account keys, Admin SDK secrets, or other private keys in frontend files.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Client-side UI allowlist.
// Real protection is handled by Firestore Security Rules using /admins/{uid}.
export const allowedAdminEmails = [
  "your-google-account@example.com"
];
