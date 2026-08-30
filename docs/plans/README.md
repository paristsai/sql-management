# DataStudio 實作計畫歸檔 (Implementation Plans)

本目錄歸檔 DataStudio 系統各迭代里程碑的實作設計計畫 (Implementation Plans)，與 [ADR 架構決策記錄](../adr/README.md) 及 Git Commit 保持完整的三向關聯。

---

## 實作計畫清單與對照表

| 計畫編號 | 實作計畫名稱 | 關聯 ADR | 關聯 Git Commit | 狀態 |
| :--- | :--- | :--- | :---: | :---: |
| [Plan 0001](0001-sql-template-ui-prototype-and-core-architecture.md) | SQL Template 管理平台 UI Prototype 與核心架構 | [ADR 0001](../adr/0001-vanilla-spa-and-reactive-store-architecture.md) | `00fd82f` | Completed |
| [Plan 0002](0002-review-center-audit-modal-and-user-context.md) | 審核中心企業級多 Tab 列表與全螢幕審核 Modal 實作計畫 | [ADR 0002](../adr/0002-centralized-user-context-and-fullscreen-audit-workflow.md) | `9d79d40` | Completed |
| [Plan 0003](0003-enterprise-ui-refactoring-and-catalog-redesign.md) | 企業級 UI 視覺標準化與去 Emoji 扁平化重構計畫 | [ADR 0003](../adr/0003-enterprise-ui-standardization-and-emoji-removal.md) | `7369d86`, `55c07f8` | Completed |
| [Plan 0004](0004-sql-version-history-and-read-only-diff-viewer.md) | SQL 樣板版本歷程追蹤與唯讀對照實作計畫 | [ADR 0004](../adr/0004-immutable-sql-version-history-and-diff-comparison.md) | `a3fffb5` | Completed |
| [Plan 0005](0005-resizable-studio-layout-and-sensitive-column-governance.md) | Studio 彈性拖曳佈局與敏感個資覆寫治理實作計畫 | [ADR 0005](../adr/0005-resizable-studio-layout-and-sensitive-column-governance.md) | `4bb289f`, `d1f08f9` | Completed |
| [Plan 0006](0006-monaco-editor-syntax-highlight-decorations-and-toggles.md) | Monaco Editor 跨視圖語法高亮裝飾器與動態標記切換實作計畫 | [ADR 0006](../adr/0006-monaco-editor-syntax-highlight-decorations-and-toggle-architecture.md) | `2b4efbb` | Completed |
| [Plan 0007](0007-batch-import-export-and-multi-mode-preview-workbench.md) | 匯入預覽三模式架構與批次處理實作計畫 | [ADR 0007](../adr/0007-sql-template-batch-import-export-and-multi-mode-preview.md) | `28da12a` | Completed |
| [Plan 0008](0008-permission-governance-duplicate-and-deletion-audit-workflow.md) | 權限機制、樣板複製與刪除審核流程實作計畫 | [ADR 0008](../adr/0008-permission-governance-duplicate-and-deletion-audit-workflow.md) | - | Completed |
| [Plan 0009](0009-backend-systems-and-api-inventory.md) | 後端系統架構與完整 API 盤點清單 (Java + Python + Data API) | - | - | Planned |
