/* OBS TRPGサポーター — obs-websocket v5 の最小クライアント
 * 外部ライブラリなしで、Hello → Identify（認証）→ Request / RequestResponse だけを扱う。
 * 接続先は自分のPC（127.0.0.1 / localhost / [::1]）に限る。パスワードはメモリ上でだけ使い、保存しない。 */
(function (global) {
  'use strict';

  const OP = { HELLO: 0, IDENTIFY: 1, IDENTIFIED: 2, EVENT: 5, REQUEST: 6, RESPONSE: 7 };
  const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

  function isLocalAddress(address) {
    let url;
    try { url = new URL(String(address || '').trim()); } catch (error) { return false; }
    return url.protocol === 'ws:' && LOCAL_HOSTS.includes(url.hostname) && Boolean(url.port) &&
      (url.pathname === '/' || url.pathname === '') && !url.search && !url.username && !url.password;
  }

  async function sha256Base64(text) {
    const digest = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    let binary = '';
    new Uint8Array(digest).forEach(byte => { binary += String.fromCharCode(byte); });
    return global.btoa(binary);
  }

  // base64(sha256(base64(sha256(password + salt)) + challenge))
  async function authString(password, salt, challenge) {
    const secret = await sha256Base64(password + salt);
    return sha256Base64(secret + challenge);
  }

  function obsError(code, message, extra) {
    const error = new Error(message || code);
    error.code = code;
    Object.assign(error, extra || {});
    return error;
  }

  class ObsClient {
    constructor() {
      this.ws = null;
      this.pending = new Map();
      this.seq = 0;
      this.identified = false;
      this.hello = null;
      this.onclose = null;
    }

    get connected() {
      return Boolean(this.ws && this.identified && this.ws.readyState === 1);
    }

    connect(address, password, timeoutMs = 8000) {
      if (!isLocalAddress(address)) return Promise.reject(obsError('not_local'));
      if (!global.crypto || !global.crypto.subtle) return Promise.reject(obsError('no_crypto'));
      this.disconnect();
      return new Promise((resolve, reject) => {
        let settled = false;
        let ws;
        const finish = (error, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error) {
            try { ws.close(); } catch (closeError) { /* noop */ }
            reject(error);
          } else {
            resolve(value);
          }
        };
        const timer = setTimeout(() => finish(obsError('timeout')), timeoutMs);
        try {
          ws = new WebSocket(address, 'obswebsocket.json');
        } catch (error) {
          finish(obsError('blocked', error.message));
          return;
        }
        this.ws = ws;
        ws.onmessage = async event => {
          let message;
          try { message = JSON.parse(event.data); } catch (error) { return; }
          const d = message.d || {};
          if (message.op === OP.HELLO) {
            this.hello = d;
            const identify = { rpcVersion: 1, eventSubscriptions: 0 };
            if (d.authentication) {
              if (!password) { finish(obsError('auth_required')); return; }
              try {
                identify.authentication = await authString(password, d.authentication.salt, d.authentication.challenge);
              } catch (error) {
                finish(obsError('no_crypto', error.message));
                return;
              }
            }
            ws.send(JSON.stringify({ op: OP.IDENTIFY, d: identify }));
          } else if (message.op === OP.IDENTIFIED) {
            this.identified = true;
            finish(null, { obsWebSocketVersion: this.hello && this.hello.obsWebSocketVersion, rpcVersion: d.negotiatedRpcVersion });
          } else if (message.op === OP.RESPONSE) {
            const entry = this.pending.get(d.requestId);
            if (!entry) return;
            this.pending.delete(d.requestId);
            const status = d.requestStatus || {};
            if (status.result) entry.resolve(d.responseData || {});
            else entry.reject(obsError('request_failed', status.comment || `OBS error ${status.code}`, { status: status.code, requestType: d.requestType }));
          }
        };
        ws.onerror = () => {
          // 詳しい理由はブラウザが教えてくれないので、close の後に判断する
        };
        ws.onclose = event => {
          const wasIdentified = this.identified;
          this.identified = false;
          if (this.ws === ws) this.ws = null;
          this.pending.forEach(entry => entry.reject(obsError('closed')));
          this.pending.clear();
          if (!settled) {
            // 4009 = AuthenticationFailed、4010 = UnsupportedRpcVersion
            if (event.code === 4009) finish(obsError('auth_failed'));
            else if (event.code === 4010) finish(obsError('rpc_version'));
            else finish(obsError('unreachable', `close ${event.code}`));
          } else if (wasIdentified && typeof this.onclose === 'function') {
            this.onclose(event);
          }
        };
      });
    }

    call(requestType, requestData) {
      if (!this.connected) return Promise.reject(obsError('not_connected'));
      const requestId = `trpg-${Date.now().toString(36)}-${++this.seq}`;
      return new Promise((resolve, reject) => {
        this.pending.set(requestId, { resolve, reject });
        const d = { requestType, requestId };
        if (requestData) d.requestData = requestData;
        this.ws.send(JSON.stringify({ op: OP.REQUEST, d }));
      });
    }

    disconnect() {
      const ws = this.ws;
      this.ws = null;
      this.identified = false;
      if (ws) {
        ws.onclose = null;
        try { ws.close(1000); } catch (error) { /* noop */ }
      }
      this.pending.forEach(entry => entry.reject(obsError('closed')));
      this.pending.clear();
    }
  }

  global.OTS_OBS = { ObsClient, isLocalAddress, authString };
})(typeof window !== 'undefined' ? window : globalThis);
