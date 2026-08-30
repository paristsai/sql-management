# Implementation Plan 0002: 審核中心 (Review Center) 企業級多 Tab 列表與全螢幕審核 Modal 實作計畫

- **對應 ADR**：[ADR 0002: 審核中心全螢幕稽核視窗與集中式多角色權限情境架構](../adr/0002-centralized-user-context-and-fullscreen-audit-workflow.md)
- **對應 Commit**：`9d79d40` (feat: implement full-screen review audit modal and centralized user context switcher)
- **日期**：2026-08-27
- **狀態**：Completed (已完成)

---

## 需求背景與目標
將原本純雙欄的審核介面升級為 **「企業級審核工作台 + 全螢幕/大彈窗稽核流程」**：
1. **多 Tab 清單分流**：`待我審核 (Pending My Review)`、`我提交的 (Submitted by Me)`、`已完成/歷史紀錄 (History)`。
2. **全螢幕稽核視窗 (Review Audit Modal)**：點擊任一審核單展開 `100vw × 100vh` 大視野稽核彈窗，包含 Monaco DiffEditor 差異比對、中繼資料、變更理由、風險指標與審核歷史。
3. **身分情境切換器 (User Context Switcher)**：頂部導航列支援即時切換身分（數據管理員 / 安全審核員 / 開發人員），動態驗證權限。

---

## 實作步驟與模組改動

1. **狀態管理層 (`js/store.js`)**：
   - 擴充 `currentUser` 及 `reviewRequests` 狀態管理。
   - 支援 `switchUser(userId)`、`approveReview(id, comment)` 與 `rejectReview(id, reason)`。
2. **審核中心介面 (`js/views/review.js` & `css/review.css`)**：
   - 實作三 Tab 清單切換與搜尋篩選。
   - 建立 `ReviewAuditModal` 獨立全螢幕渲染層。
3. **Monaco 差異比對封裝 (`js/components/editor.js`)**：
   - 封裝 `SqlDiffViewer` 支援雙側 Diff 渲染與語法著色。
