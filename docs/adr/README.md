# DataStudio 架構決策記錄 (Architecture Decision Records, ADR)

本目錄記錄 DataStudio 平台的各項重大架構決策、技術演進與設計權衡。

---

## ADR 總覽清單

| 編號 | 標題 | 狀態 | 決策日期 | 對應 Git Commit | 關聯實作計畫 |
| :--- | :--- | :---: | :---: | :---: | :--- |
| [ADR 0001](0001-vanilla-spa-and-reactive-store-architecture.md) | 無構建純前端 SPA 架構與 Pub/Sub 響應式狀態管理 | Accepted | 2026-08-24 | `00fd82f` | [Plan 0001](../plans/0001-sql-template-ui-prototype-and-core-architecture.md) |
| [ADR 0002](0002-centralized-user-context-and-fullscreen-audit-workflow.md) | 審核中心全螢幕稽核視窗與集中式多角色權限情境架構 | Accepted | 2026-08-27 | `9d79d40` | [Plan 0002](../plans/0002-review-center-audit-modal-and-user-context.md) |
| [ADR 0003](0003-enterprise-ui-standardization-and-emoji-removal.md) | 企業級 UI 視覺標準化與去 Emoji 扁平化狀態規範 | Accepted | 2026-08-27 | `7369d86`, `55c07f8` | [Plan 0003](../plans/0003-enterprise-ui-refactoring-and-catalog-redesign.md) |
| [ADR 0004](0004-immutable-sql-version-history-and-diff-comparison.md) | SQL 樣板不可變版本歷程與三態只讀對照架構 | Accepted | 2026-08-28 | `a3fffb5` | [Plan 0004](../plans/0004-sql-version-history-and-diff-viewer.md) |
| [ADR 0005](0005-resizable-studio-layout-and-sensitive-column-governance.md) | Studio 彈性雙欄拖曳佈局與敏感個資覆寫治理架構 | Accepted | 2026-08-28 | `4bb289f`, `d1f08f9` | [Plan 0005](../plans/0005-resizable-studio-layout-and-sensitive-column-governance.md) |
| [ADR 0006](0006-monaco-editor-syntax-highlight-decorations-and-toggle-architecture.md) | Monaco Editor 跨視圖 SQL 語法高亮裝飾器與動態標記切換架構 | Accepted | 2026-08-28 | `2b4efbb` | [Plan 0006](../plans/0006-monaco-editor-syntax-highlight-decorations-and-toggles.md) |
| [ADR 0007](0007-sql-template-batch-import-export-and-multi-mode-preview.md) | SQL Template 批次匯入匯出與預覽工作台多模式架構設計 | Accepted | 2026-08-28 | `28da12a` | [Plan 0007](../plans/0007-batch-import-export-and-multi-mode-preview-workbench.md) |
| [ADR 0008](0008-permission-governance-duplicate-and-deletion-audit-workflow.md) | SQL Template 權限治理體系、樣板複製與刪除審核流程架構設計 | Accepted | 2026-08-28 | - | [Plan 0008](../plans/0008-permission-governance-duplicate-and-deletion-audit-workflow.md) |

---

## Git Commit 歷史與架構演進對照

```
f1748e1 [first commit]
  │
00fd82f feat: implement core SQL catalog management system...
  │   └── ➔ ADR 0001: 無構建純前端 SPA 與 Pub/Sub Store
  │
9d79d40 feat: implement full-screen review audit modal and centralized user context switcher
  │   └── ➔ ADR 0002: 審核中心全螢幕稽核視窗與多角色情境切換
  │
d1f08f9 fix: update regex for qualified field matching and refine SQL template parameters
  │   └── (納入 ADR 0005: 欄位正規化解析強化)
  │
7369d86 refactor: standardize UI text by removing emojis and updating label terminology
  │   └── ➔ ADR 0003: 企業級 UI 視覺標準化與去 Emoji 扁平化
  │
a3fffb5 feat: implement SQL version history tracking and add read-only editors
  │   └── ➔ ADR 0004: SQL 樣板不可變版本歷程與三態只讀對照
  │
55c07f8 refactor: simplify UI elements and update styling across review view templates
  │   └── (納入 ADR 0003: 審核視圖簡約化)
  │
4bb289f feat: implement resizable studio layout and enhance sensitive column management
  │   └── ➔ ADR 0005: Studio 彈性雙欄拖曳佈局與敏感個資覆寫治理
  │
2b4efbb feat: add catalog read-only modal, sql highlight toggles, and cache-control headers
  │   └── ➔ ADR 0006: Monaco 跨視圖語法高亮裝飾器與動態標記切換
  │
28da12a feat: implement ImportPreviewModal component for batch SQL template processing...
      └── ➔ ADR 0007: SQL 樣板批次匯入匯出與多模式預覽工作台
```
