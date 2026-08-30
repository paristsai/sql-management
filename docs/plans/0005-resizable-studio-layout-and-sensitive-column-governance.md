# Implementation Plan 0005: Studio 彈性拖曳佈局與敏感個資覆寫治理實作計畫

- **對應 ADR**：[ADR 0005: Studio 彈性雙欄拖曳佈局與敏感個資覆寫治理架構](../adr/0005-resizable-studio-layout-and-sensitive-column-governance.md)
- **對應 Commit**：`4bb289f` (feat: implement resizable studio layout and enhance sensitive column management with override support) & `d1f08f9`
- **日期**：2026-08-28
- **狀態**：Completed (已完成)

---

## 需求背景與目標
1. **拖曳式 Splitter 雙欄佈局**：支援鼠標拖曳調整左右比例，並持久化至 `localStorage`。
2. **敏感欄位治理與手動覆寫**：建立 PII 分級 (L1/L2/L3) 與手動新增/覆寫機制，並修正限定名正則比對。

---

## 實作步驟與模組改動

1. **Splitter 拖曳控制器 (`js/views/studio.js`, `css/studio.css`)**：
   - 實作拖曳事件處理與 Monaco `editor.layout()` 連動。
2. **個資治理面板 (`js/views/studio.js`, `js/store.js`)**：
   - 擴充敏感欄位卡片支援自定義覆寫。
