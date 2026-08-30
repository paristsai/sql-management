# ADR 0007: SQL Template 批次匯入匯出與預覽工作台多模式架構設計

- **狀態**：Accepted (已採用)
- **日期**：2026-08-28
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`28da12a` (feat: implement ImportPreviewModal component for batch SQL template processing and add resource cleanup to editor)
- **相關議題**：SQL Template 批次匯入/匯出、多模式視圖切換器 (Workbench / Fullscreen / Floating)、ID 衝突防呆、編輯器資源生命週期 Dispose

---

## 1. 背景與問題陳述 (Context & Problem Statement)

在 DataStudio 數據平台中，使用者需要將全量 SQL Template 資產匯出為標準 JSON，以及批次匯入（上限 10 筆）進行預覽、檢閱、修改與儲存/送審。

然而在前端架構設計上，面臨以下情境衝突：
1. **工作台體驗 vs. 批次暫存上下文**：
   - 完整的 SQL Studio（工作台）需要大面積的雙欄視窗供 Monaco Editor 代碼編寫、AST 欄位解析與語法測試。
   - 若僅採用標準 Modal 彈窗，在 94vw/90vh 視窗下容易產生壓迫感，且容易造成 Modal 程式碼與 Studio 程式碼重複維護（雙軌維護問題）。
2. **單一詳細編輯 vs. 批次快速檢閱**：
   - 使用者在匯入多個 Template 時，需要流暢地於不同 Template 間切換（左右切換、Tabs 標籤、鍵盤快捷鍵），並能單筆獨立執行儲存草稿或送審。
3. **資源釋放與記憶體管理**：
   - 批次切換不同 Template 與頻繁開啟關閉預覽 Modal 會大量重複建立 Monaco 實例，若無嚴格的資源 Dispose 生命週期，會導致記憶體與事件洩漏。

---

## 2. 決策考量因素 (Decision Drivers)

- **組件重用性 (Component Reusability)**：避免為 Modal 與 Studio 分別開發兩套編輯器與表單邏輯，達到最大程度的邏輯與 UI 復用。
- **使用者操作體驗 (UX & Workflow Continuity)**：
  - 支援單次最多 10 筆的防呆限制（超過即阻擋）。
  - 支援多頁籤 (Tabs)、左右箭頭與鍵盤（`←` / `→`）快捷鍵切換。
  - 匯入之 Template 需清空歷史執行憑證與附件（`attachments: []`），確保符合環境隔離與安全審計。
  - 支援 ID 衝突即時嚴格檢核。
- **情境適應彈性 (Contextual Flexibility)**：不同使用者在不同螢幕尺寸下對「全螢幕工作台」與「彈窗預覽」各有偏好。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：全面整合至全螢幕 SQL 工作台 (Workbench Mode)
- **做法**：匯入後直接透過 SPA Router 導覽至 `StudioView`，頂部掛載「批次暫存標籤列 (Batch Buffer Bar)」。
- **優點**：100% 重用現有 Studio 元件與視圖，無任何視窗狹窄限制。
- **缺點**：脫離了原本 Catalog 的暫存浮層 context。

### 方案 B：滿版全螢幕 Overlay (Fullscreen Overlay Mode)
- **做法**：採用 `100vw × 100vh` 滿版彈窗，去除周圍黑邊遮罩，以獨立浮層呈現。
- **優點**：兼具最大可視空間與獨立 Task 上下文。

### 方案 C：懸浮彈窗工作台 (Floating Dialog Mode)
- **做法**：採用 `94vw × 90vh` 居中 Dialog 彈窗。
- **優點**：保留背景頁面可視性，適合快速輕量檢閱。

---

## 4. 決策結果 (Decision Outcome)

**採用「三模式即時切換與 Studio 深度整合架構」**：

1. **多模式視圖切換器 (View Mode Switcher)**：
   - 在預覽介面右上角提供「展示模式」切換（工作台模式 `workbench` / 滿版全螢幕 `fullscreen` / 懸浮彈窗 `floating`）。
   - 透過 `localStorage` 持久化使用者偏好，讓使用者可隨情境自由切換。
2. **核心 StudioView 擴充支援批次暫存 (`batch_import`)**：
   - `StudioView` 內建批次暫存陣列管理、多頁籤導覽與快捷鍵切換，完全共用 Monaco Editor、語法測試與右側中繼資料表單。
3. **獨立 ImportPreviewModal 組件 (`js/components/import-modal.js`)**：
   - 負責 Floating / Fullscreen 模式的渲染，並可在切換至 `workbench` 時平滑過渡至 `StudioView`。
4. **安全與合規防呆機制**：
   - 單次匯入嚴格限制 ≤ 10 筆。
   - 新匯入樣板之 `attachments` 強制清空為 `[]`。
   - 嚴格校驗 Template ID 衝突，重複時標記錯誤並限制送審。
5. **嚴謹的資源清理生命週期 (`dispose()`)**：
   - 在 `SqlEditor` 與 `ImportPreviewModal` 中明確掛載銷毀邏輯，於關閉或切換時呼叫 `this.editor.dispose()`，解除鍵盤與 DOM 監聽。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **極高的程式碼重用率**：Studio 核心邏輯無需分叉維護。
- **彈性滿足多重情境**：單一系統同時支援專注全螢幕與輕量彈窗。
- **資源零洩漏**：嚴格的 Dispose 機制確保長時間操作下的效能穩定性。

### 負面影響 / 權衡 (Cons & Mitigations)
- **狀態同步複雜度**：在切換展示模式（從 Modal 切換到 Studio 或反之）時，需確保表單的即時暫存狀態正確傳遞。
  - *緩解措施*：在切換模式前統一透過 `saveCurrentBatchFormState()` 快照暫存資料後再透傳。

---

## 6. 相關模組與檔案 (Related Modules)
- `js/store.js`：匯出與匯入資料校驗引擎
- `js/views/studio.js`：支援批次暫存與模式切換之 SQL 工作台
- `js/components/import-modal.js`：浮層/滿版預覽彈窗組件
- `css/import-modal.css`：多模式響應式樣式與狀態圓點
- `js/views/catalog.js`：資產目錄匯出/匯入入口與拖曳上傳
- `js/components/editor.js`：編輯器資源 Dispose 機制
