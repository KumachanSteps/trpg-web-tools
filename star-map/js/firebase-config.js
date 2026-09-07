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

  // Calendar access reuses the Firebase Google provider. No separate OAuth
  // client ID is required; Google Calendar API must be enabled in this project.
  googleCalendarOwnerEmail: "tkoide2021@gmail.com",
  googleCalendars: [
    {
      id: "2ali5nrrtnovq612f5tcfc56ok@group.calendar.google.com",
      summary: "TRPG",
      backgroundColor: "#8a76c9"
    },
    {
      id: "eac44475de1afea6aaec1b7ce343341f7cf2161dbaf2fb33c47a56a6f15e425f@group.calendar.google.com",
      summary: "とこちゃん",
      backgroundColor: "#d99ab5"
    }
  ],

  // Use one or both lists. UID is preferred for long-term authorization.
  authorizedEditorUids: [],
  authorizedEditorEmails: ["tkoide2021@gmail.com"],

  // Single public Firestore document used for editable site data.
  firestoreDocumentPath: "starMapData/public",

  // Keeps the site testable before cloud setup. Disable after Firebase works.
  allowLocalEditorFallback: false
};
