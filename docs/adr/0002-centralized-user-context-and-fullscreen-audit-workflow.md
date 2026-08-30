# ADR 0002: 審核中心全螢幕稽核視窗與集中式多角色權限情境架構

- **狀態**：Accepted (已採用)
- **日期**：2026-08-27
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`9d79d40` (feat: implement full-screen review audit modal and centralized user context switcher)
- **相關議題**：多角色權限切換、全螢幕審核視窗、變更理由與中繼資料審查、Monaco Diff 比對整合

---

## 1. 背景與問題陳述 (Context & Problem Statement)

在數據資產管控中，SQL Template 的變更與上線必須經過合規審批。
初期版本的審核中心存在以下瓶頸：
1. **空間侷限與資訊擁擠**：標準彈窗（Modal）在展示複雜 SQL 代碼、AST 解析欄位、變更前後 Diff 比對與審核意見時空間嚴重不足，審核人員難以全覽資訊。
2. **缺乏多角色動態切換支援**：系統需要驗證不同角色（如：`admin` 數據管理員、`reviewer` 安全審核員、`developer` 開發人員）在提交、審核、退回與覆核時的權限邊界，若無快速情境切換工具，測試與演示成本高昂。
3. **審核工作流狀態不連貫**：審核通過後需自動推進 Template 狀態至已發布，退回時需強制要求原因備註。

---

## 2. 決策考量因素 (Decision Drivers)

- **審核稽核體驗 (Audit Ergonomics)**：提供沈浸式、無干擾的滿版/全螢幕審核工作台，整合「雙欄 Diff 比對」、「變更日誌」、「中繼資料驗證」與「一鍵審批/駁回」。
- **集中式身分情境 (Centralized User Context)**：在全域導航列提供動態角色切換器（Switcher），即時影響按鈕可見性與審核動作權限。
- **審核審批原子性 (Atomic Review Actions)**：核准與駁回需同時更新審核單狀態、寫入稽核日誌 (Audit Log) 並同步連動 SQL 樣板發布狀態。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：跳轉獨立審核路由頁面 (`#review-audit?id=xxx`)
- **做法**：將審核介面做成單獨的 SPA 頁面。
- **缺點**：
  - 審核者在清單與詳細間切換時需要頻繁換頁，打斷審核清單的篩選與分頁上下文。
  - 多層路由狀態同步維護成本高。

### 方案 B：內建全螢幕稽核視窗組件 (`ReviewAuditModal`) + 全域角色狀態機 (採用)
- **做法**：
  - 實作覆蓋式全螢幕審核彈窗（`100vw × 100vh`），保留底層清單狀態。
  - 在 Store 中集中維護 `currentUser`，並在頂部導航列提供即時切換下拉選單。
  - 封裝 `SqlDiffViewer` 支援 Monaco 左右雙欄差異比對。

---

## 4. 決策結果 (Decision Outcome)

採用 **「全螢幕稽核視窗 + 集中式多角色情境切換 + Monaco Diff 整合」**：

1. **集中式身分切換架構 (`js/store.js` & `js/app.js`)**：
   - 在 `store.js` 增加 `currentUser` 狀態管理及預設角色列表（Admin, Lead Reviewer, Developer）。
   - 頂部導航列渲染角色切換選單，切換後透過 Store 發布 `userChanged` 事件，各視圖自動重新計算操作權限（如 Developer 無法審核自己的申請）。
2. **全螢幕稽核視窗 (`ReviewAuditModal` in `js/views/review.js`)**：
   - 整合三欄/雙欄大版面佈局：左側展示變更摘要、申請理由與影響範圍；右側內嵌 Monaco Diff Editor 展示代碼異動。
   - 底部提供審批動作列（核准通過、退回修正、備註填寫）。
3. **Monaco Diff Viewer 封裝 (`js/components/editor.js`)**：
   - 建立 `SqlDiffViewer` 類別，封裝 `monaco.editor.createDiffEditor`，支援原始版本與修改版本左右對照與行內 Diff。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **大幅提升審查效率**：全螢幕視野可同時比對 200+ 行 SQL 差異與中繼資料，減少誤審風險。
- **權限測試極為便捷**：開發與測試人員可隨時切換角色驗證權限規則。

### 負面影響 / 權衡 (Cons & Mitigations)
- **大模態視窗的記憶體管理**：頻繁開啟/關閉全螢幕 Diff Editor 可能造成 Monaco 實例累積。
  - *緩解措施*：關閉彈窗時嚴格執行 `diffEditor.dispose()` 釋放 WebGL 與 Worker 資源。

---

## 6. 相關模組與檔案 (Related Modules)
- `js/store.js`：使用者角色切換、審核單狀態流轉
- `js/views/review.js`：審核清單與全螢幕稽核視窗實作
- `css/review.css`：全螢幕審核彈窗佈局與 Diff 樣式
- `js/components/editor.js`：`SqlDiffViewer` Monaco 差異比對封裝
- `index.html`：頂部導航列角色切換器容器
