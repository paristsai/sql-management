# Implementation Plan 0006: Monaco Editor 跨視圖語法高亮裝飾器與動態標記切換實作計畫

- **對應 ADR**：[ADR 0006: Monaco Editor 跨視圖 SQL 語法高亮裝飾器與動態標記切換架構](../adr/0006-monaco-editor-syntax-highlight-decorations-and-toggle-architecture.md)
- **對應 Commit**：`2b4efbb` (feat: add catalog read-only modal, sql highlight toggles, and cache-control headers)
- **日期**：2026-08-28
- **狀態**：Completed (已完成)

---

## 需求背景與目標
1. **跨組件高亮一致性**：`SqlEditor`、`SqlReadOnlyEditor` 與 `SqlDiffViewer` 統一支援 PII 與動態參數裝飾。
2. **高亮動態切換按鈕與圖例**：提供工具列切換按鈕與圖例 (Legend)。
3. **AST 初始化時序修正**：確保新建模式與 AI 分析後立即生效。

---

## 實作步驟與模組改動

1. **集中裝飾器管線 (`js/components/editor.js`)**：
   - 實作 `computeSqlDecorations` 純函數與 `updateHighlights` / `clearHighlights` 方法。
2. **UI 工具列連動 (`js/views/catalog.js`, `js/views/studio.js`, `js/views/review.js`)**：
   - 增加高亮開關與圖例。
