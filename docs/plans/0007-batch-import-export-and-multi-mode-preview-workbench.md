# Implementation Plan 0007: 匯入預覽三模式架構與批次處理實作計畫

- **對應 ADR**：[ADR 0007: SQL Template 批次匯入匯出與預覽工作台多模式架構設計](../adr/0007-sql-template-batch-import-export-and-multi-mode-preview.md)
- **對應 Commit**：`28da12a` (feat: implement ImportPreviewModal component for batch SQL template processing and add resource cleanup to editor)
- **日期**：2026-08-28
- **狀態**：Completed (已完成)

---

## 需求背景與目標
1. **全量 JSON 匯出與批次匯入（上限 10 筆）**。
2. **多模式視圖切換器**：工作台模式 (`workbench`)、滿版全螢幕 (`fullscreen`)、懸浮彈窗 (`floating`)。
3. **安全防呆與資源清理**：ID 衝突檢驗、`attachments` 清空、Monaco `dispose()` 資源釋放。

---

## 實作步驟與模組改動

1. **匯入校驗引擎 (`js/store.js`)**：
   - 實作匯出 JSON 與批次匯入解析校驗（陣列/單一物件、防呆 10 筆）。
2. **獨立預覽彈窗組件 (`js/components/import-modal.js` & `css/import-modal.css`)**：
   - 實作 Floating / Fullscreen 模式切換、分頁 Tabs 與快速鍵切換。
3. **工作台擴充 (`js/views/studio.js`)**：
   - 支援 `batch_import` 暫存模式與模式互相過渡。
4. **編輯器 Dispose 機制 (`js/components/editor.js`)**：
   - 增加資源清理函式，防止記憶體洩漏。
