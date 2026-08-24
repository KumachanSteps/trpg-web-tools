/* ============================================================
   Google-authenticated Cloud Editor + Google Calendar connector

   - Firebase Authentication proves editor identity.
   - Firestore stores public editable data.
   - Google Identity Services grants Calendar read-only access.
   - The site still works with published-data.js/local fallback before setup.
   ============================================================ */
(() => {
  const FIREBASE_VERSION = "11.10.0";
  const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
  const CONFIG = window.STAR_MAP_CLOUD_CONFIG || {};
  const listeners = new Set();
  let firebaseApi = null;
  let app = null;
  let auth = null;
  let db = null;
  let cloudUnsubscribe = null;
  let calendarToken = "";
  let calendarTokenExpiresAt = 0;

  const state = {
    configured: false,
    initializing: true,
    signedIn: false,
    authorized: false,
    user: null,
    cloudReady: false,
    cloudStatus: "初期化中",
    calendarConnected: false,
    authInProgress: false,
    authError: "",
    error: ""
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function emit(extra = {}) {
    Object.assign(state, extra);
    const snapshot = clone(state);
    listeners.forEach(listener => {
      try { listener(snapshot); } catch (error) { console.error(error); }
    });
    window.dispatchEvent(new CustomEvent("star-map-cloud-state", { detail: snapshot }));
  }

  function placeholder(value) {
    return !value || /YOUR_|REPLACE_|PROJECT_ID/i.test(String(value));
  }

  function isConfigured() {
    const firebase = CONFIG.firebase || {};
    return [firebase.apiKey, firebase.authDomain, firebase.projectId, firebase.appId]
      .every(value => !placeholder(value));
  }

  function isCalendarConfigured() {
    return isConfigured() && configuredCalendars().length !== 0;
  }

  function configuredCalendars() {
    return (Array.isArray(CONFIG.googleCalendars) ? CONFIG.googleCalendars : [])
      .filter(item => item?.id)
      .map(item => ({
        id: String(item.id),
        summary: String(item.summary || item.id),
        description: String(item.description || ""),
        backgroundColor: String(item.backgroundColor || "#8a76c9"),
        accessRole: "reader",
        fixed: true
      }));
  }

  function normalizedList(value) {
    return Array.isArray(value) ? value.map(item => String(item || "").trim()).filter(Boolean) : [];
  }

  function isAuthorizedUser(user) {
    if (!user) return false;
    const uids = normalizedList(CONFIG.authorizedEditorUids);
    const emails = normalizedList(CONFIG.authorizedEditorEmails).map(value => value.toLowerCase());
    return uids.includes(user.uid) || emails.includes(String(user.email || "").toLowerCase());
  }

  function publicUser(user) {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || ""
    };
  }

  function authErrorMessage(error) {
    const code = String(error?.code || "");
    const host = location.hostname || "このドメイン";
    const messages = {
      "auth/unauthorized-domain": `Firebase AuthenticationのAuthorized domainsに ${host} を追加してください。`,
      "auth/operation-not-allowed": "Firebase AuthenticationでGoogleログインを有効にしてください。",
      "auth/popup-blocked": "ログイン用ポップアップがブロックされました。ポップアップを許可するか、「ページ移動でログイン」を使ってください。",
      "auth/popup-closed-by-user": "Googleログイン画面が完了前に閉じられました。",
      "auth/cancelled-popup-request": "別のログイン処理が進行中です。数秒待ってから再度お試しください。",
      "auth/network-request-failed": "Googleログインへの通信に失敗しました。ネットワーク接続やコンテンツブロッカーを確認してください。",
      "auth/popup-timeout": "ログイン画面を開けませんでした。ポップアップを許可するか、「ページ移動でログイン」を使ってください。",
      "auth/redirect-timeout": "ログインページへ移動できませんでした。通常のChrome・Safari・Firefoxでサイトを開いてお試しください。",
      "auth/unsupported-origin": "file:// で開いたページからはGoogleログインできません。GitHub PagesまたはlocalhostのHTTPサーバーで開いてください。"
    };
    return messages[code] || error?.message || "Googleログインに失敗しました。";
  }

  async function importFirebase() {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-firestore.js`)
    ]);
    return { ...appModule, ...authModule, ...firestoreModule };
  }

  function documentReference() {
    const path = String(CONFIG.firestoreDocumentPath || "starMapData/public")
      .split("/").map(part => part.trim()).filter(Boolean);
    if (path.length < 2 || path.length % 2 !== 0) {
      throw new Error("firestoreDocumentPath must point to a document, e.g. starMapData/public");
    }
    return firebaseApi.doc(db, ...path);
  }

  function cleanCloudData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      version: Number(source.version || 1),
      updatedAt: String(source.updatedAt || ""),
      events: Array.isArray(source.events) ? source.events.filter(Boolean) : [],
      ownedScenarios: Array.isArray(source.ownedScenarios) ? source.ownedScenarios.filter(Boolean) : [],
      scenarioOverrides: Array.isArray(source.scenarioOverrides) ? source.scenarioOverrides.filter(Boolean) : [],
      characterOverrides: Array.isArray(source.characterOverrides) ? source.characterOverrides.filter(Boolean) : []
    };
  }

  function subscribeToCloudData() {
    cloudUnsubscribe?.();
    const ref = documentReference();
    cloudUnsubscribe = firebaseApi.onSnapshot(ref, snapshot => {
      if (!snapshot.exists()) {
        emit({ cloudReady: true, cloudStatus: "Firestore接続済み（データ未作成）" });
        return;
      }
      const data = cleanCloudData(snapshot.data());
      window.applyStarMapCloudData?.(data);
      emit({ cloudReady: true, cloudStatus: "Firestoreと同期中", error: "" });
    }, error => {
      console.error("Firestore subscription failed.", error);
      emit({ cloudReady: false, cloudStatus: "Firestoreを読み込めません", error: error.message || String(error) });
    });
  }

  async function initializeFirebase() {
    state.configured = isConfigured();
    if (!state.configured) {
      emit({ initializing: false, cloudStatus: "Cloud設定前：ローカルテストモード" });
      return;
    }

    try {
      firebaseApi = await importFirebase();
      app = firebaseApi.initializeApp(CONFIG.firebase);
      auth = firebaseApi.getAuth(app);
      db = firebaseApi.getFirestore(app);
      await firebaseApi.setPersistence(auth, firebaseApi.browserLocalPersistence);
      firebaseApi.getRedirectResult(auth).catch(error => {
        const message = authErrorMessage(error);
        console.error("Redirect sign-in failed.", error);
        emit({ authInProgress: false, authError: message, cloudStatus: "Googleログインに失敗しました" });
      });
      subscribeToCloudData();
      firebaseApi.onAuthStateChanged(auth, user => {
        const authorized = isAuthorizedUser(user);
        emit({
          initializing: false,
          signedIn: Boolean(user),
          authorized,
          user: publicUser(user),
          authInProgress: false,
          authError: "",
          cloudStatus: user
            ? (authorized ? "Editorとして認証済み" : "Googleログイン済み・編集権限なし")
            : "公開データをFirestoreから読込中",
          error: ""
        });
      });
    } catch (error) {
      console.error("Cloud editor initialization failed.", error);
      emit({
        initializing: false,
        configured: false,
        cloudReady: false,
        cloudStatus: "Cloud初期化に失敗：ローカルモード",
        error: error.message || String(error)
      });
    }
  }

  async function signIn(options = {}) {
    if (!state.configured || !auth) throw new Error("Firebaseが設定されていません。");
    if (state.authInProgress) throw new Error("Googleログイン処理が進行中です。");
    if (!/^https?:$/.test(location.protocol)) {
      const error = new Error("Unsupported authentication origin.");
      error.code = "auth/unsupported-origin";
      const message = authErrorMessage(error);
      emit({ authInProgress: false, authError: message, cloudStatus: "Googleログインを開始できません" });
      throw new Error(message);
    }
    const provider = new firebaseApi.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const method = options.method === "redirect" ? "redirect" : "popup";
    emit({ authInProgress: true, authError: "", cloudStatus: "Googleログイン画面を開いています…" });
    try {
      if (method === "redirect") {
        setTimeout(() => {
          if (!state.authInProgress || state.signedIn) return;
          const error = new Error("Google sign-in redirect timed out.");
          error.code = "auth/redirect-timeout";
          emit({ authInProgress: false, authError: authErrorMessage(error), cloudStatus: "Googleログインに失敗しました" });
        }, 12000);
        await firebaseApi.signInWithRedirect(auth, provider);
        return null;
      }
      const popup = firebaseApi.signInWithPopup(auth, provider);
      const timeout = new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error("Google sign-in popup timed out.");
          error.code = "auth/popup-timeout";
          reject(error);
        }, 12000);
      });
      return await Promise.race([popup, timeout]);
    } catch (error) {
      const message = authErrorMessage(error);
      emit({ authInProgress: false, authError: message, cloudStatus: "Googleログインに失敗しました" });
      throw new Error(message);
    }
  }

  async function signOutEditor() {
    calendarToken = "";
    calendarTokenExpiresAt = 0;
    emit({ calendarConnected: false });
    if (auth) await firebaseApi.signOut(auth);
  }

  async function saveData(data) {
    if (!state.configured || !db) throw new Error("Firestoreが設定されていません。");
    if (!state.authorized) throw new Error("このGoogleアカウントには編集権限がありません。");
    const clean = cleanCloudData(data);
    clean.updatedAt = new Date().toISOString();
    await firebaseApi.setDoc(documentReference(), clean, { merge: false });
    return clean;
  }

  async function connectCalendar(options = {}) {
    if (!isCalendarConfigured()) throw new Error("Google Calendar連携設定が完了していません。");
    if (!state.authorized || !auth?.currentUser) throw new Error("EditorとしてGoogleログインしてください。");

    const ownerEmail = String(CONFIG.googleCalendarOwnerEmail || "").trim().toLowerCase();
    const signedInEmail = String(auth.currentUser.email || "").trim().toLowerCase();
    if (ownerEmail && signedInEmail !== ownerEmail) {
      throw new Error(`${CONFIG.googleCalendarOwnerEmail} でEditorログインしてください。`);
    }

    const provider = new firebaseApi.GoogleAuthProvider();
    provider.addScope(CALENDAR_SCOPE);
    provider.setCustomParameters({
      prompt: options.prompt ?? "consent",
      login_hint: CONFIG.googleCalendarOwnerEmail || auth.currentUser.email || ""
    });
    const result = await firebaseApi.reauthenticateWithPopup(auth.currentUser, provider);
    const credential = firebaseApi.GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error("Google Calendar用アクセストークンを取得できませんでした。");

    calendarToken = credential.accessToken;
    calendarTokenExpiresAt = Date.now() + 50 * 60 * 1000;
    emit({ calendarConnected: true, authError: "", error: "" });
    return { access_token: calendarToken };
  }

  async function ensureCalendarToken() {
    if (calendarToken && Date.now() < calendarTokenExpiresAt) return calendarToken;
    await connectCalendar({ prompt: "" });
    return calendarToken;
  }

  async function calendarFetch(path, params = {}) {
    const token = await ensureCalendarToken();
    const url = new URL(`https://www.googleapis.com/calendar/v3/${path.replace(/^\//, "")}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    });
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      calendarToken = "";
      calendarTokenExpiresAt = 0;
      emit({ calendarConnected: false });
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error?.message || `Google Calendar API error (${response.status})`);
    }
    return response.json();
  }

  async function listCalendars() {
    const rows = [];
    let pageToken = "";
    do {
      const data = await calendarFetch("users/me/calendarList", {
        minAccessRole: "reader",
        showDeleted: false,
        showHidden: false,
        maxResults: 250,
        pageToken
      });
      rows.push(...(data.items || []));
      pageToken = data.nextPageToken || "";
    } while (pageToken);
    return rows.map(item => ({
      id: item.id,
      summary: item.summaryOverride || item.summary || item.id,
      description: item.description || "",
      primary: Boolean(item.primary),
      selected: Boolean(item.selected),
      accessRole: item.accessRole || "reader",
      backgroundColor: item.backgroundColor || ""
    }));
  }

  async function listCalendarEvents(calendarId, options = {}) {
    const rows = [];
    let pageToken = "";
    do {
      const data = await calendarFetch(`calendars/${encodeURIComponent(calendarId)}/events`, {
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        singleEvents: true,
        orderBy: "startTime",
        showDeleted: false,
        maxResults: 2500,
        timeZone: options.timeZone || "Asia/Tokyo",
        pageToken
      });
      rows.push(...(data.items || []));
      pageToken = data.nextPageToken || "";
    } while (pageToken);
    return rows;
  }

  window.StarMapCloud = {
    getState: () => clone(state),
    getConfig: () => clone(CONFIG),
    isConfigured,
    isCalendarConfigured,
    getConfiguredCalendars: () => clone(configuredCalendars()),
    subscribe(listener) {
      listeners.add(listener);
      listener(clone(state));
      return () => listeners.delete(listener);
    },
    signIn,
    signOut: signOutEditor,
    saveData,
    connectCalendar,
    listCalendars,
    listCalendarEvents
  };

  initializeFirebase();
})();
