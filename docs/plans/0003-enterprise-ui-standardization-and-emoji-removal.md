# Implementation Plan 0003: 企業級 UI 視覺標準化與去 Emoji 扁平化重構計畫

- **對應 ADR**：[ADR 0003: 企業級 UI 視覺標準化與去 Emoji 扁平化狀態規範](../adr/0003-enterprise-ui-standardization-and-emoji-removal.md)
- **對應 Commit**：`7369d86` (refactor: standardize UI text by removing emojis and updating label terminology across views) & `55c07f8` (refactor: simplify UI elements and update styling across review view templates)
- **日期**：2026-08-27
- **狀態**：Completed (已完成)

---

## 需求背景與目標
全面提升 DataStudio 介面的企業級質感與沉穩度：
1. **去 Emoji 化**：徹底移除所有畫面與按鈕上的系統原生 Emoji。
2. **狀態圓點規範**：採用 Ant Design 風格的幾何圓點 (`.status-dot`) 與扁平 Badge。
3. **介面文字與術語標準化**：統一專業技術用語，優化審核中心卡片與工作台按鈕樣式。

---

## 實作步驟與模組改動

1. **全域樣式與色票規範 (`css/main.css`, `css/components.css`)**：
   - 增加 `.status-dot` 與各狀態修飾符 (`.status-dot-published`, `.status-dot-pending`, `.status-dot-draft`, `.status-dot-rejected`)。
2. **視圖清理 (`js/views/catalog.js`, `js/views/studio.js`, `js/views/review.js`)**：
   - 移除字串常數中的 Emoji 表情符號，替換為標準文字與 CSS 圖示。
