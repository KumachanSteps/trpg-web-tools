/* ============================================================
   Cloud Editor configuration

   1. Create a Firebase web app and enable Google Authentication.
   2. Enable Cloud Firestore.
   3. Create a Google OAuth Web Client and enable Calendar API.
   4. Replace the placeholders below.

   Firebase web config values are public identifiers, not passwords.
   Authorization is enforced by Firebase Authentication + Firestore rules.
   ============================================================ */
window.STAR_MAP_CLOUD_CONFIG = {
  firebase: {
    apiKey: "AIzaSyAx5e_pUU5YZqfsB1JmZrovF8ybFtZ1g4A",
    authDomain: "trpg-web-tool.firebaseapp.com",
    projectId: "trpg-web-tool",
    storageBucket: "trpg-web-tool.firebasestorage.app",
    messagingSenderId: "1020894429473",
    appId: "1:1020894429473:web:974bd5771f567dedd43e60"
  },

  // OAuth 2.0 Client ID for a Web application.
  // Add the deployed GitHub Pages origin to Authorized JavaScript origins.
  googleOAuthClientId: "YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID.apps.googleusercontent.com",

  // Use one or both lists. UID is preferred for long-term authorization.
  authorizedEditorUids: [],
  authorizedEditorEmails: ["tkoide2021@gmail.com"],

  // Single public Firestore document used for editable site data.
  firestoreDocumentPath: "starMapData/public",

  // Keeps the site testable before cloud setup. Disable after Firebase works.
  allowLocalEditorFallback: false
};
