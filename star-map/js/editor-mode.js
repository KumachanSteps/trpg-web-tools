/* ============================================================
   Editor Mode controller v1.0

   Cloud configured:
   - Google sign-in is required.
   - Only configured editor UID/email can enable editing.

   Cloud not configured:
   - Optional local fallback keeps the UI testable.
   ============================================================ */
(() => {
  const SESSION_KEY = "kuma-star-map-editor-mode";
  let cloudState = window.StarMapCloud?.getState?.() || {
    configured: false, signedIn: false, authorized: false, initializing: true, user: null
  };
  let panelOpen = false;

  function enabledFromUrl() {
    return new URLSearchParams(location.search).get("editor") === "1";
  }

  function localFallbackAllowed() {
    return window.STAR_MAP_CLOUD_CONFIG?.allowLocalEditorFallback !== false;
  }

  function canEdit() {
    if (cloudState.configured) return Boolean(cloudState.authorized);
    return localFallbackAllowed();
  }

  function isEnabled() {
    return canEdit() && (enabledFromUrl() || sessionStorage.getItem(SESSION_KEY) === "1");
  }

  function setEnabled(enabled) {
    const safeEnabled = Boolean(enabled && canEdit());
    sessionStorage.setItem(SESSION_KEY, safeEnabled ? "1" : "0");
    document.body.classList.toggle("is-editor-mode", safeEnabled);
    render();
    window.dispatchEvent(new CustomEvent("star-map-editor-mode", { detail: { enabled: safeEnabled } }));
  }

  function statusText() {
    if (cloudState.initializing) return "CONNECTING";
    if (!cloudState.configured) return document.body.classList.contains("is-editor-mode") ? "LOCAL ON" : "LOCAL EDITOR";
    if (!cloudState.signedIn) return cloudState.authInProgress ? "SIGNING IN" : "SIGN IN";
    if (!cloudState.authorized) return "NO ACCESS";
    return document.body.classList.contains("is-editor-mode") ? "EDITOR ON" : "EDITOR";
  }

  function buildUi() {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "editor-mode-trigger";
    trigger.setAttribute("aria-label", "Editor Mode / Google login");
    trigger.setAttribute("aria-pressed", "false");
    document.body.appendChild(trigger);

    const panel = document.createElement("aside");
    panel.className = "editor-account-panel panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="editor-account-head">
        <div>
          <p class="eyebrow">Editor Access</p>
          <h2>Google Editor</h2>
        </div>
        <button type="button" class="editor-panel-close" aria-label="閉じる">×</button>
      </div>
      <div class="editor-account-content"></div>`;
    document.body.appendChild(panel);

    async function attemptSignIn(method = "popup") {
      panelOpen = true;
      render();
      try { await window.StarMapCloud.signIn({ method }); }
      catch (_) { panelOpen = true; render(); }
    }

    trigger.addEventListener("click", async event => {
      if (event.shiftKey || event.altKey) {
        panelOpen = !panelOpen;
        render();
        return;
      }
      if (cloudState.initializing) return;
      if (cloudState.configured && !cloudState.signedIn) {
        await attemptSignIn("popup");
        return;
      }
      if (cloudState.configured && !cloudState.authorized) {
        panelOpen = true;
        render();
        return;
      }
      setEnabled(!document.body.classList.contains("is-editor-mode"));
    });

    trigger.addEventListener("contextmenu", event => {
      event.preventDefault();
      panelOpen = !panelOpen;
      render();
    });

    panel.querySelector(".editor-panel-close").addEventListener("click", () => {
      panelOpen = false;
      render();
    });

    panel.addEventListener("click", async event => {
      if (event.target.closest("[data-editor-signin]")) {
        await attemptSignIn(event.target.closest("[data-editor-signin]").dataset.editorSignin || "popup");
      }
      if (event.target.closest("[data-editor-signout]")) {
        setEnabled(false);
        await window.StarMapCloud?.signOut?.();
      }
      if (event.target.closest("[data-editor-toggle]")) setEnabled(!document.body.classList.contains("is-editor-mode"));
      if (event.target.closest("[data-editor-copy-uid]")) {
        await navigator.clipboard?.writeText(cloudState.user?.uid || "");
        const button = event.target.closest("[data-editor-copy-uid]");
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy UID"; }, 1200);
      }
    });

    document.addEventListener("keydown", async event => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (cloudState.configured && !cloudState.signedIn) {
          await attemptSignIn("popup");
          return;
        }
        if (!canEdit()) {
          panelOpen = true;
          render();
          return;
        }
        setEnabled(!document.body.classList.contains("is-editor-mode"));
      }
      if (event.key === "Escape" && panelOpen) {
        panelOpen = false;
        render();
      }
    });
  }

  function panelMarkup() {
    if (cloudState.initializing) return `<p class="editor-auth-message">Google / Firebase接続を確認しています…</p>`;
    if (!cloudState.configured) {
      return `
        <div class="editor-auth-state is-local"><span>LOCAL TEST MODE</span></div>
        <p class="editor-auth-message">Firebase設定前です。現在はこのブラウザだけで編集を試せます。</p>
        <button type="button" class="manager-primary" data-editor-toggle>${document.body.classList.contains("is-editor-mode") ? "Editor Modeを終了" : "Local Editor Modeを開始"}</button>
        <p class="editor-auth-hint">本番では <code>js/firebase-config.js</code> を設定し、Firestore Rulesを適用します。</p>`;
    }
    if (!cloudState.signedIn) {
      return `
        <div class="editor-auth-state"><span>SIGNED OUT</span></div>
        <p class="editor-auth-message">Googleアカウントでログインすると編集権限を確認します。</p>
        ${cloudState.authError ? `<p class="editor-auth-error" role="alert">${escapeMarkup(cloudState.authError)}</p>` : ""}
        <button type="button" class="manager-primary" data-editor-signin="popup" ${cloudState.authInProgress ? "disabled" : ""}>${cloudState.authInProgress ? "ログイン画面を待っています…" : "Sign in with Google"}</button>
        <button type="button" class="manager-secondary" data-editor-signin="redirect" ${cloudState.authInProgress ? "disabled" : ""}>ページ移動でログイン</button>
        <p class="editor-auth-hint">ポップアップが開かないブラウザでは「ページ移動でログイン」をお試しください。現在のドメイン：<code>${escapeMarkup(location.hostname || "local file")}</code></p>`;
    }
    const user = cloudState.user || {};
    return `
      <div class="editor-user-card">
        ${user.photoURL ? `<img src="${user.photoURL}" alt="">` : `<span class="editor-user-placeholder">✦</span>`}
        <div><strong>${user.displayName || "Google User"}</strong><small>${user.email || ""}</small></div>
      </div>
      <div class="editor-auth-state ${cloudState.authorized ? "is-authorized" : "is-denied"}">
        <span>${cloudState.authorized ? "AUTHORIZED EDITOR" : "READ ONLY ACCOUNT"}</span>
      </div>
      ${cloudState.authorized
        ? `<button type="button" class="manager-primary" data-editor-toggle>${document.body.classList.contains("is-editor-mode") ? "Editor Modeを終了" : "Editor Modeを開始"}</button>`
        : `<p class="editor-auth-message">このアカウントは <code>authorizedEditorUids</code> または <code>authorizedEditorEmails</code> に登録されていません。</p>`}
      <div class="editor-uid-row"><code>${user.uid || ""}</code><button type="button" data-editor-copy-uid>Copy UID</button></div>
      <p class="editor-auth-hint">${cloudState.cloudStatus || ""}</p>
      <button type="button" class="manager-secondary" data-editor-signout>Sign out</button>`;
  }

  function render() {
    const trigger = document.querySelector(".editor-mode-trigger");
    const panel = document.querySelector(".editor-account-panel");
    if (!trigger || !panel) return;
    const active = document.body.classList.contains("is-editor-mode");
    trigger.classList.toggle("is-active", active);
    trigger.classList.toggle("is-denied", cloudState.configured && cloudState.signedIn && !cloudState.authorized);
    trigger.setAttribute("aria-pressed", active ? "true" : "false");
    trigger.innerHTML = `<span>✦</span><b>${statusText()}</b>`;
    trigger.title = "Click: Editor Mode / Sign in · Shift-click or right-click: account details";
    panel.hidden = !panelOpen;
    panel.querySelector(".editor-account-content").innerHTML = panelMarkup();
  }

  function escapeMarkup(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function init() {
    buildUi();
    window.StarMapCloud?.subscribe?.(next => {
      cloudState = next;
      if (cloudState.configured && !cloudState.authorized) setEnabled(false);
      else if (enabledFromUrl() && canEdit()) setEnabled(true);
      else render();
    });
    setEnabled(isEnabled());
  }

  document.addEventListener("DOMContentLoaded", init);
  window.setStarMapEditorMode = setEnabled;
})();
