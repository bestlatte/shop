package org.example.productshop.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.productshop.api.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class JwtFilter implements Filter {

    @Autowired
    private JwtUtil jwtUtil;


    /**
     * 只保留「真的公開」的 API；靜態頁面與資源不用列在這裡，
     * 因為非 /api/** 請求會在前面直接放行。
     */
    private static final List<String> WHITELIST = Arrays.asList(
            // 使用者公開動作
            "/users/register",
            "/users/login",
            "/users/verify",
            "/users/resend-verification",
            "/users/password/reset/request",
            "/users/password/reset/confirm",

            // 公開 API（依你的需求保留）
            "/api/products/search",
            "/api/products/markets/sync",
            "/api/pricing",
            "/api/pricing/quote",
            "/api/products/",
            "/api/addresses",
            "/api/orders",

            // 其他
            "/error"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        // ---------- CORS ----------
        String origin = req.getHeader("Origin");
        if (origin != null) { // 有跨網域請求時回傳對應的 Origin
            res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

        // OPTIONS 預檢直接結束
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            res.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        String path = req.getRequestURI();

        // ---------- 核心：非 /api/** 的請求（.html/.css/.js/圖片…）一律放行 ----------
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        // /api/** 之下的白名單 API 放行
        boolean isWhitelistedApi = WHITELIST.stream().anyMatch(whitelistPath -> {
            if (whitelistPath.endsWith("/")) {
                return path.startsWith(whitelistPath); // 目錄前綴
            } else {
                return path.equals(whitelistPath) || path.startsWith(whitelistPath + "/");
            }
        });
        if (isWhitelistedApi) {
            chain.doFilter(request, response);
            return;
        }

        // ---------- 需要 JWT 的 /api/** ----------
        String authHeader = req.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                if (jwtUtil.validateToken(token)) {
                    String email = jwtUtil.getEmailFromToken(token);
                    req.setAttribute("userEmail", email);
                    chain.doFilter(request, response);
                    return;
                }
            } catch (Exception e) {
                e.printStackTrace();
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"error\":\"Invalid token\"}");
                return;
            }
        }

        // 沒有 Token 或驗證失敗
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"error\":\"Authorization header required\"}");

    }

}
