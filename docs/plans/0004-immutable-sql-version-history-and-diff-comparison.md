# Implementation Plan 0004: SQL 樣板版本歷程追蹤與唯讀對照實作計畫

- **對應 ADR**：[ADR 0004: SQL 樣板不可變版本歷程與三態只讀對照架構](../adr/0004-immutable-sql-version-history-and-diff-comparison.md)
- **對應 Commit**：`a3fffb5` (feat: implement SQL version history tracking and add read-only editors for review comparison)
- **日期**：2026-08-28
- **狀態**：Completed (已完成)

---

## 需求背景與目標
1. **不可變快照鏈**：樣板支援 `versions` 快照陣列，記錄每次發布時的 SQL 與參數。
2. **只讀編輯器封裝**：封裝專用的 `SqlReadOnlyEditor`，支援代碼高亮且禁止修改。
3. **版本比對器**：在審核中心可任意切換歷史版本比對。

---

## 實作步驟與模組改動

1. **Store 層擴充 (`js/store.js`)**：
   - 增加版本快照生成與歷史版本讀取邏輯。
2. **編輯器擴充 (`js/components/editor.js`)**：
   - 新增 `SqlReadOnlyEditor` 類別。
3. **審核視圖連動 (`js/views/review.js`)**：
   - 整合版本選擇器下拉選單與 Diff 刷新。
