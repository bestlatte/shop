#  選果及時價格電商平台專案技術文檔

## 專案概述
- 蔬果價格每日都會有變動狀況，我們希望購買者可以隨時取得最新的一筆資料，掌握蔬果價格動態，透過此平台可以掌握最新的蔬果價格資。
- 這是一個基於 Spring Boot (後端) 與 js (前端) 開發的全端電商平台專案，並整合了 Node.js 進行綠界金流串接。專案不僅包含完整的用戶管理系統，更實作了農產品批發市場價格即時同步 (Open Data)、購物車管理、動態階梯定價、收件地址管理與第三方支付功能。
- 專案已具備雲端資料庫部署配置 (Railway)。

## 主要技術棧

### 後端技術 (Java 核心)
- **Spring Boot 3.5.4** (核心框架)
- **Java 21**
- **MySQL 8.0.22** (關聯式資料庫，支援 Railway 雲端部署)
- **Spring JDBC** (資料庫操作層，手寫 SQL 提供高靈活度)
- **JWT** (無狀態身份驗證)
- **BCrypt** (密碼雜湊加密)
- **Spring Mail** (電子郵件服務，串接 Gmail SMTP)
- **Spring Scheduling** (背景排程任務)
- **Spring AOP / Validation** (切面程式設計與資料驗證)

### 前端技術
- **HTML5 / CSS3 / JavaScript**
- **Fetch API / AJAX** (非同步資料請求)
- **LocalStorage** (前端資料快取、狀態管理與降級策略)
- **CSS Media Queries** (響應式設計 RWD)

---

## 系統架構設計

本專案採用**前後端分離思想**與**微服務解耦概念**：

1. **Java Spring Boot 主應用**：負責核心業務邏輯，包含會員認證 (JWT)、商品管理、購物車操作、會員地址管理、排程同步農業部開放資料。採用經典的 `Controller -> Service -> DAO` 三層架構設計。
2. **Node.js 金流微服務 (`/ecpay` 目錄)**：專門負責與綠界金流 (ECPay) 進行互動。將支付跳轉與 Callback 邏輯從主業務邏輯解耦，展現了多語言架構整合能力。
3. **前端靜態資源 (`/src/main/resources/static`)**：主要由 HTML 與模組化的 JavaScript (`script.js`, `auth.js`, `address.js` 等) 組成，透過 RESTful API 與後端進行 JSON 交換，並在前端實作了樂觀更新 (Optimistic UI) 與快取容錯機制。

---

## 核心功能模組列表

### 1. 農產品市場價格同步 
- **自動化排程**：透過 `@Scheduled` 每小時自動拉取農業部果菜批發市場交易行情 API (`https://data.moa.gov.tw/`)。
- **資料清洗與正規化**：將不統一的市場名稱正規化為「台北一(T1)」、「台北二(T2)」，並過濾特定作物代號白名單 (`app.crop-codes`)，減少資料庫冗餘。
- **休市防呆與容錯機制**：若遇市場休市（無正常交易品項且有休市公告），系統會自動將該市場目標代號寫入 NULL 進行「休市占位」，避免前端抓取到錯誤或過期的舊價格。

### 2. 動態階梯定價與購物車系統 
- **前端動態定價演算法 (Pricing Module)**：根據使用者放入購物車的「數量」，前端即時動態推導批發市場價格 (如: 1~9 上價、10~20 中價、21以上 下價)。少中量取市場高價，大量取市場低價，大幅降低每次點擊數量都要詢問伺服器的運算壓力。
- **降級與快取策略 (Fallback)**：若後端 API 斷線或發生異常，前端 `script.js` 會自動讀取 `localStorage` 中的歷史快取價格，確保使用者介面不崩潰並可繼續瀏覽操作。
- **樂觀更新 (Optimistic UI)**：購物車增減數量時，前端立即改變畫面數值與總金額，背景再非同步發送 `PUT` 請求同步資料庫。若同步失敗則還原畫面狀態。

### 3. 用戶管理與安全系統 
- **完整生命週期**：包含註冊 (AJAX 驗證)、Email 驗證啟用、登入、密碼重置申請與一次性確認連結。
- **無狀態認證**：登入成功發放 24 小時有效 JWT Token，前端統一存於 `localStorage`，後續受保護請求 (`authFetch`) 透過自定義 `JwtFilter` 攔截驗證並將 `userId` 注入 Request 中，達成伺服器無狀態。
- **雙重安全機制**：密碼全面使用 BCrypt 加密存儲；敏感操作皆需經過 JWT 權限校驗。

### 4. 結帳與綠界金流整合 
- **購物車結帳驗證**：`CarPayController` 攔截結帳請求，確認使用者身分與購物車內容後產出摘要。
- **跨服務跳轉**：Java 後端處理完訂單前置作業後，將結帳資訊拋轉至 Node.js 端的 Express 應用 (`/routes/ecpay.js`)，利用 ECPay SDK 產生綠界付款跳轉頁面。

### 5. 商品展示與會員收件地址管理 
- **商品圖片渲染與快取**：實作優先序推導圖片來源機制 (後端回傳 > LocalStorage 快取 > 本地規則路徑 > Placeholder)，確保圖片載入穩定。
- **動態會員地址管理**：透過讀取 `/Data/TwCities.json` 實現台灣縣市/鄉鎮市區二級連動選單，支援多組收件地址的新增、修改與刪除。

---

## 專案目錄結構

### 後端架構 (Java Spring Boot)
```text
src/main/java/org/example/productshop/
├── api/             # 通用工具類 (BCrypt 密碼處理, JwtUtil Token 簽發)
├── config/          # 系統設定 (WebConfig 全局 CORS 設定)
├── controller/      # API 控制器層 (Login, Register, Cart, Product, MarketSync, CarPay, Address 等)
├── dao/             # 資料存取層 (Spring JDBC 手寫 SQL 實作)
├── entity/          # 資料實體與傳輸物件 DTO (Member, ShoppingCartItem, OpenDataMarketItem 等)
├── exception/       # 全域例外攔截與處理 (GlobalExceptionHandler)
├── filter/          # 請求過濾器 (JwtFilter 驗證身分)
├── job/             # 背景排程任務 (MarketPriceSyncJob 定期拉取行情)
├── service/         # 業務邏輯層 (Email, Login, OpenDataMarketSync, Pricing)
└── ProductShopApplication.java
```

### 綠界金流微服務 (Node.js)
```text
ecpay/
├── bin/www          # 啟動腳本
├── app.js           # Express 應用入口與中介軟體設定
├── routes/          # 路由定義 (ecpay.js 產生訂單與回傳處理)
├── package.json     # Node 依賴管理 (包含 ecpay_aio_nodejs)
└── .env.sample      # 環境變數範例檔 (HashKey, HashIV)
```

### 前端架構 (靜態資源)
```text
src/main/resources/static/
├── CSS/             # 樣式表 (style.css 核心樣式, queries.css 響應式)
├── JS/              # JavaScript 模組化腳本
│   ├── auth.js      # JWT 認證、API 請求封裝與狀態管理
│   ├── script.js    # 購物車渲染、價格動態計算演算法與 UI 互動
│   ├── account-dropdown.js # 使用者下拉選單與登出邏輯
│   └── index.js     # 首頁輪播與互動邏輯
├── Data/            # 前端靜態資料檔 (TwCities.json 縣市區資料)
├── img/             # 圖片資源
└── *.html           # 各個頁面 (index, login, register, cart, address, z*_1.html 單品頁)
```
