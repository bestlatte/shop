// ./JS/auth.js
(() => {
  const API_BASE =
    window.API_BASE ||
    (location.hostname === "localhost"
      ? "http://localhost:8080"
      : location.origin);

  const TOKEN_KEY = "jwt_token";
  // 先創一個物件變數Auth
  const Auth = {};

  Auth.setToken = (token, remember) => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  };
  Auth.getToken = () =>
    sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  Auth.clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  };

  Auth.parseJwt = (token) => {
    try {
      const base64 = token.split(".")[1];
      const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  };
  Auth.isTokenExpired = (t) => {
    const p = Auth.parseJwt(t);
    if (!p || !p.exp) return false;
    return p.exp <= Math.floor(Date.now() / 1000);
  };

  Auth.authFetch = async (path, options = {}) => {
    const url = path.startsWith("http") ? path : API_BASE + path;
    const headers = new Headers(options.headers || {});
    const token = Auth.getToken();
    if (token) {
      if (Auth.isTokenExpired(token)) {
        Auth.clearToken();
        const err = new Error("Token expired");
        err.status = 401;
        throw err;
      }
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (
      !headers.has("Content-Type") &&
      options.body &&
      typeof options.body === "string"
    ) {
      headers.set("Content-Type", "application/json");
    }
    const resp = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
    if (resp.status === 401) Auth.clearToken();
    return resp;
  };

  // ---- UI helpers（可選）----
  function setWelcome(sel, text) {
    const el = sel && document.querySelector(sel);
    if (!el) return;
    if (text) {
      el.textContent = text;
      el.style.display = "inline-block";
    } else {
      el.style.display = "none";
    }
  }

  Auth.renderFromToken = ({
    welcomeSelector,
    logoutSelector,
    loginBoxSelector,
    registerBoxSelector,
  } = {}) => {
    const t = Auth.getToken();
    const loggedIn = t && !Auth.isTokenExpired(t);
    const loginBox =
      loginBoxSelector && document.querySelector(loginBoxSelector);
    const regBox =
      registerBoxSelector && document.querySelector(registerBoxSelector);
    const logoutBtn = logoutSelector && document.querySelector(logoutSelector);

    if (loggedIn) {
      const p = Auth.parseJwt(t);
      const who = p?.sub || p?.email || "(unknown)";
      setWelcome(welcomeSelector, `已登入：${who}（驗證中…）`);
      if (logoutBtn) logoutBtn.style.display = "inline-block";
      if (loginBox) loginBox.style.display = "none";
      if (regBox) regBox.style.display = "none";
    } else {
      setWelcome(welcomeSelector, "");
      if (logoutBtn) logoutBtn.style.display = "none";
      if (loginBox) loginBox.style.display = "block";
      if (regBox) regBox.style.display = "block";
    }
  };

  Auth.verifyWithServer = async ({
    welcomeSelector,
    loginBoxSelector,
    registerBoxSelector,
    logoutSelector,
  } = {}) => {
    const t = Auth.getToken();
    if (!t || Auth.isTokenExpired(t)) return;
    try {
      const r = await Auth.authFetch("/api/me"); // ⚠ 後端不可白名單
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      setWelcome(welcomeSelector, `已登入：${data.email || "(未知)"}`);
    } catch {
      Auth.clearToken();
      // 回未登入 UI
      setWelcome(welcomeSelector, "");
      const loginBox =
        loginBoxSelector && document.querySelector(loginBoxSelector);
      const regBox =
        registerBoxSelector && document.querySelector(registerBoxSelector);
      const logoutBtn =
        logoutSelector && document.querySelector(logoutSelector);
      if (logoutBtn) logoutBtn.style.display = "none";
      if (loginBox) loginBox.style.display = "block";
      if (regBox) regBox.style.display = "block";
    }
  };

  // 多分頁同步：另一個分頁登出/登入時，這個分頁也更新
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY) {
      // 觸發者頁面可自行在各頁呼叫 render/verify；這裡留給各頁決定是否要即時刷新。
      // 例如：location.reload();
    }
  });

  // 導出到全域
  window.Auth = Auth;
})();
