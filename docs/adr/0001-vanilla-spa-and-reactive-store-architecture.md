# ADR 0001: 無構建純前端 SPA 架構與 Pub/Sub 響應式狀態管理

- **狀態**：Accepted (已採用)
- **日期**：2026-08-24
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`00fd82f` (feat: implement core SQL catalog management system with filtering, batch actions, and toast notifications)
- **相關議題**：系統基礎架構、零構建依賴 (No-Build)、模組化視圖生命週期、單一狀態源 (Single Source of Truth)

---

## 1. 背景與問題陳述 (Context & Problem Statement)

DataStudio 作為企業級內部數據平台的 SQL Template 管理系統，需要提供高互動性、低部署門檻且能快速交付的管理控制台。
在初期架構選型上面臨以下考量：
1. **靜態部署與極簡維運**：系統需能於任意靜態檔案伺服器或內部 CDN 直接運行，避免複雜的 Webpack/Vite 前置構建管線與 Node.js 服務端相依。
2. **多視圖路由與狀態同步**：系統包含「SQL 樣板」、「SQL 工作台 (Studio)」與「審核中心」三大主視圖，需要統一的視圖切換機制與全域狀態同步能力。
3. **第三方複雜編輯器整合**：需無縫整合 Monaco Editor（VS Code 核心編輯器）進行 SQL 撰寫與語法高亮。

---

## 2. 決策考量因素 (Decision Drivers)

- **輕量與零構建開銷 (Zero-Build Overhead)**：採用現代瀏覽器原生 ES Modules (`<script type="module">`)，實現修改即生效。
- **響應式單向資料流 (Unidirectional Data Flow)**：建立統一的 Central Store，透過訂閱/發布模式 (Pub/Sub) 達成跨視圖資料同步。
- **資料持久化防丟失 (Client-Side Persistence)**：結合 `localStorage` 保存 SQL Template、審核記錄與使用者偏好。
- **組件生命週期與記憶體防護**：各 View 需具備明確的 `render()`、`mount()` 與 `destroy()` 生命週期，防止 DOM 洩漏與事件重複綁定。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：引入 React / Vue / Angular 重型框架 + NPM 構建
- **做法**：建立 Vite + React/Vue 專案，使用 Redux/Pinia 進行狀態管理。
- **優點**：生態系成熟、組件化生態完整。
- **缺點**：
  - 引入了龐大的 `node_modules` 與構建工序，增加維護負擔。
  - 對於以 Monaco Editor 為主體的嵌入式工作台，原生 DOM 控制更直接且可控。

### 方案 B：純原生 ES Modules + 自研 Pub/Sub Store (採用)
- **做法**：
  - 採用原生 ES6 Class 與 Module 架構。
  - 設計 `DataStore` 類別封裝資料操作，提供 `subscribe(event, callback)` 機制。
  - 路由採用 Hash 路由 (`window.location.hash`) 驅動視圖切換。
- **優點**：
  - 零構建、直接以靜態檔案部署。
  - 執行期效能極佳，架構透明度高。

---

## 4. 決策結果 (Decision Outcome)

採用 **「原生 ES Modules + Pub/Sub Central Store + Hash Router」** 之基礎架構：

1. **核心 Store 設計 (`js/store.js`)**：
   - 封裝 `templates`、`reviewRequests`、`auditLogs` 等資料集。
   - 所有資料寫入操作（如 `addTemplate`、`updateTemplate`、`deleteTemplate`）自動觸發 `notify(event, data)`。
   - 自動將資料快照同步寫入 `localStorage`。
2. **應用層路由器 (`js/app.js`)**：
   - 監聽 `hashchange` 事件，依據 `#catalog`、`#studio`、`#review` 自動切換對應 View 實例。
   - 統一攔截路由參數（如 `#studio?id=tpl_001`），傳遞給目標視圖進行上下文載入。
3. **視圖契約規範 (`js/views/*`)**：
   - 規範各視圖統一實作：
     - `init(container)`：初始化 DOM 容器。
     - `render(params)`：渲染 UI 結構並載入資料。
     - `destroy()`：清理計時器、取消 Store 訂閱與銷毀編輯器。
4. **基礎 UI 反饋組件 (`js/components/*`)**：
   - `Toast`：全域非同步通知（Success / Warning / Error）。
   - `Modal`：全域對話框基底。
   - `SqlEditor`：Monaco Editor 封裝類別。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **極致輕量**：無打包步驟，啟動時間 0 秒，相容任意 Web 伺服器。
- **清晰的資料流向**：所有修改皆經由 `DataStore`，跨視圖同步即時且不易產生狀態分裂。

### 負面影響 / 權衡 (Cons & Mitigations)
- **缺乏 JSX/模板編譯**：需使用原生 Template Literals 拼接 HTML 字串。
  - *緩解措施*：採用模組化渲染函數拆分各子區塊，維持程式碼可讀性。

---

## 6. 相關模組與檔案 (Related Modules)
- `index.html`：SPA 入口點與 CDN 依賴引入（Monaco Editor）
- `js/app.js`：應用程式啟動器與 Hash Router
- `js/store.js`：核心 DataStore 狀態管理引擎
- `js/components/toast.js`：Toast 通知系統
- `js/components/modal.js`：基礎 Modal 彈窗基底
- `js/components/editor.js`：Monaco Editor 基礎封裝
- `js/views/catalog.js`、`js/views/studio.js`、`js/views/review.js`：三大主視圖
