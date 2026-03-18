document.addEventListener("DOMContentLoaded", () => {
    // 先用 token（純前端 decode）決定要顯示什麼 UI
    Auth.renderFromToken({
        welcomeSelector: "#welcome",   // 這裡要對應你 landing.html 上的 id
        logoutSelector: "#logout-btn", // 這裡也是
    });

    // 再打後端 /api/me 確認 token 真的有效，順便拿 email
    Auth.verifyWithServer({
        welcomeSelector: "#welcome",
        loginBoxSelector: null,        // landing 頁通常沒有登入表單，就不用傳
        registerBoxSelector: null,
        logoutSelector: "#logout-btn",
    });

    // 登出按鈕行為
    const logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            Auth.clearToken();           // 清掉 jwt_token
            window.location.href = "index.html"; // 回登入頁
        });
    }
});
