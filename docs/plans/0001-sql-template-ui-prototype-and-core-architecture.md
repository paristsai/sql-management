# Implementation Plan 0001: SQL Template 管理平台 UI Prototype 與核心架構

- **對應 ADR**：[ADR 0001: 無構建純前端 SPA 架構與 Pub/Sub 響應式狀態管理](../adr/0001-vanilla-spa-and-reactive-store-architecture.md)
- **對應 Commit**：`00fd82f` (feat: implement core SQL catalog management system with filtering, batch actions, and toast notifications)
- **日期**：2026-08-23 ~ 2026-08-24
- **狀態**：Completed (已完成)

---

## 核心架構與頁面規劃

### 1. 單頁 SPA 模組化架構與狀態管理 (`app.js`, `store.js`)
- 頂部導航列支援切換：
  1. **資產目錄 (Catalog Hub)**
  2. **SQL Studio 工作台 (Create / Edit)**
  3. **審核中心 (Review & Audit Center)**
- **狀態管理與 LocalStorage 持久化**：
  - 狀態機流轉：`草稿 (Draft)` ➔ `審核中 (In Review)` ➔ `審核完畢 (Approved)` / `可使用 (Active)` ➔ `停止使用 (Disabled)`。
  - 預置多筆高擬真 SQL Template 資料（涵蓋各部門、各狀態、敏感資料標籤、變更版本等）。

---

## 頁面功能與互動規範

### 頁面 1 & 2：SQL Studio 工作台 (`views/studio.js`, `components/editor.js`)
- **頂部工具列**：
  - 模式識別（新建模式 vs 編輯模式 `[TPL-001] User Retention Query`）
  - 狀態 Badge（草稿、審核中、可使用）
  - 操作群組：【放棄變更】、【儲存草稿】、【送出審核】（觸發欄位與必填附件校驗）
- **左側 60% 編輯與測試終端**：
  - **View Tab 切換**：`Template SQL`（挖洞模式）/ `原始 SQL (Raw SQL)`。
  - **Monaco SQL Editor**：
    - 代碼反白選取彈出 **快捷氣泡 (Popover)**：一鍵「轉為動態參數 `{{param_name}}`」並自動同步到右側參數清單。
    - 右鍵/浮動選單快速「標記為 PII 敏感欄位」。
  - **底部抽屜面板 (Bottom Console)**：
    - **Tab 1: 語法與執行測試**：選擇測試 DB、填寫 Mock 參數、點擊【執行測試】展示模擬查詢結果 Table / 耗時 / 成功狀態。
    - **Tab 2: 相似度比對**：動態計算系統內現有 SQL 相似度，高亮展示相似度 > 80% 的項目與差異。
- **右側 40% 屬性與衝擊分析（獨立捲動面板）**：
  - **卡片 A｜基本資訊**：Template ID（即時查重校驗）、名稱、適用類型（全公司 / 部門多選）、綁定 DB（MySQL, Trino, Oracle 等）。
  - **卡片 B｜AI 輔助生成區**：
    - SQL 業務描述（附【AI 重新生成】按鈕，觸發 Skeleton/Shimmer 動畫）。
    - 輸出欄位 Table（欄位名、型態、業務描述、敏感欄位 Switch 切換）。
  - **卡片 C｜參數清單管理**：
    - 參數名稱、資料型態 (String, Number, Date, List)、預設值、必填 Checkbox、說明。
  - **卡片 D｜衝擊分析 (Impact Drawer)**：
    - 編輯模式偵測破壞性變更時高亮警示：「目前有 X 個系統/排程與 Y 位使用者調用中」，支援下載名單與確認 Checkbox。
  - **卡片 E｜附件上傳區**：
    - 支援多檔拖曳上傳與預覽，強制檢查需含至少 1 張【執行成功截圖】。

---

### 頁面 3：SQL Template 資產目錄 (`views/catalog.js`)
- **複合搜尋與過濾**：
  - 關鍵字搜尋（SQL 內容、ID、建立者）、部門篩選、綁定 DB、審核/使用狀態、敏感資料 Tags。
- **批次操作**：批次匯出 (JSON/YAML 下載)、批次匯入、批次停用。
- **資料表格 (Table View)**：
  - 欄位：Template ID、名稱、類型/部門、綁定 DB、敏感欄位 Tags、狀態 Badge、建立者、最後更新時間。
  - Action Menu：【複製 ID】、【複製建立 (Duplicate)】、【API 調用範例彈窗】(Python/cURL/Java)、【進入編輯】、【送審/停用】。

---

### 頁面 4：審核中心 (`views/review.js`)
- **左側 60% Diff 對比檢視器**：
  - 新建審核：展示 `原始 SQL (Raw)` vs `挖洞 Template SQL`。
  - 異動審核：Monaco DiffEditor 雙欄 Git-style Code Diff（淡紅刪除、淡綠新增、淡黃變更參數）。
- **右側 40% 審核檢核清單**：
  - **風險指標卡**：PII 敏感資料 Alert、相似 SQL 重複造輪子警示、衝擊分析報表。
  - **執行憑證卡**：執行成功截圖縮圖，點擊開啟 **Lightbox 放大預覽**。
  - **審核歷史時間軸**：時間軸呈現（建立 ➔ 送審 ➔ 歷次退回 Comment ➔ 重新送審）。
- **底部固定審核操作列**：
  - 【退回修正 (Reject)】：彈出 Modal 強制填寫退回原因 Comment，狀態退回至「草稿」。
  - 【核准發布 (Approve)】：彈出確認，狀態立即發布為「審核完畢 / 可使用」。

---

## 專案目錄結構

```
datastudio/
├── index.html              # 主入口 SPA HTML (乾淨企業級淺色佈局)
├── css/
│   ├── main.css            # 核心變數、Typography、Layout、Reset
│   ├── components.css      # Buttons, Badges, Modals, Popover, Shimmer, Lightbox
│   ├── studio.css          # SQL Studio 左右雙欄、Monaco 容器、Bottom Drawer
│   ├── catalog.css         # Catalog Hub 搜尋列、表格、批次操作
│   └── review.css          # 審核中心 Diff 佈局、風險卡、時間軸
└── js/
    ├── store.js            # Mock 資料庫與 State Machine 狀態管理
    ├── app.js              # SPA 路由分發與頂部導航
    ├── components/
    │   ├── editor.js       # Monaco Editor 初始化、選取 Popover 挖洞與 Diff 綁定
    │   ├── modal.js        # API 範例彈窗、退回原因彈窗、Lightbox
    │   └── toast.js        # 提示通知訊息
    └── views/
        ├── studio.js       # 工作台邏輯 (新建/編輯/AI生成/測試/衝擊分析)
        ├── catalog.js      # 目錄列表邏輯 (搜尋/篩選/批次/操作清單)
        └── review.js       # 審核中心邏輯 (Diff/檢核卡/核准/退回流轉)
```
