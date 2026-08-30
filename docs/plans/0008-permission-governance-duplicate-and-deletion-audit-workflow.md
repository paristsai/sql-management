# Plan 0008: SQL Template 權限機制、樣板複製 (Duplicate) 與刪除審核流程實作計畫

- **狀態**：Completed
- **日期**：2026-08-28
- **關聯 ADR**：[ADR 0008](../adr/0008-permission-governance-duplicate-and-deletion-audit-workflow.md)
- **實作模組**：`js/store.js`, `js/views/catalog.js`, `js/views/review.js`, `js/components/modal.js`, `index.html`, `css/review.css`

---

## 1. 需求與目標 (Requirements & Goals)

1. **SQL 樣板資產目錄 (Catalog) 權限控管**：
   - 建立者與 Admin 僅可針對狀態為「草稿 (Draft)」或「已核准 (Approved)」的樣板進行編輯；審核中樣板禁止直接修改。
   - 建立者與 Admin 可進行「複製樣板 (Duplicate)」，深拷貝產生新 ID（`${id}_COPY`）、重設為 Draft 狀態並自動跳轉至 Studio 工作台。
   - 建立者與 Admin 可發起「申請刪除」，強制填寫原因並走審核流程，狀態變更為「審核中 (刪除申請)」。
2. **多角色體系與 Admin 代審機制**：
   - 明確劃分四種角色登入視角：
     - `Sarah Wu (Governance Lead)` ➜ `[Admin]`：全域管理員，掌管全量資產、刪除覆核與跨指派人代審。
     - `John Doe (Data Architect)` ➜ `[Reviewer]`：專職審核人，負責指派給自己的 SQL 樣板審核。
     - `Alex Chen (Data Engineer)` / `Emily Lin (FinTech)` ➜ `[User]`：樣板建立者。
3. **審核中心 (Review Center) 狀態過濾與動態按鈕**：
   - 「待我審核」：僅包含審核中項目；Admin 可代審全平台所有待審項目；Modal 提供「關閉」、「退回」、「核准發布/核准刪除」。
   - 「我的送審紀錄」：僅列出自建項目；Modal 隱藏審核操作按鈕，依狀態動態提供「編輯」按鈕。
   - 「全部審核清單」：呈現「待我審核」與「我的送審紀錄」之不重複聯集 (Union)。
4. **企業級確認對話框 (Custom Confirm Dialog)**：
   - 全面移除原生 `window.confirm()`，改用自訂 high-z-index 的 `ModalManager.showConfirmModal()` 防止閃退。

---

## 2. 實作架構設計 (Technical Architecture)

```mermaid
flowchart TD
    User([使用者切換視角]) --> Store[DataStore 權限體系]
    Store --> RoleCheck{角色判定}
    RoleCheck -->|Admin| AdminPerm[全域審核、申請刪除、代審]
    RoleCheck -->|Reviewer| ReviewerPerm[指派審核、編輯自建]
    RoleCheck -->|User| UserPerm[自建編輯、複製、申請刪除]

    Catalog[資產目錄] -->|Duplicate| Studio[SQL Studio (Draft 狀態)]
    Catalog -->|申請刪除| DeleteModal[填寫刪除原因] --> InReviewDel[審核中 - 刪除申請]

    InReviewDel --> ReviewCenter[審核中心]
    ReviewCenter --> TabAssigned[待我審核]
    ReviewCenter --> TabMy[我的送審紀錄]
    ReviewCenter --> TabAll[全部審核清單 (Union)]
```

---

## 3. 變更檔案清單 (Modified Files)

- `js/store.js`：擴充角色判定、`canEdit`、`canDelete`、`canReview`、`duplicateTemplate`、`requestDeleteTemplate` 與審核狀態轉移。
- `js/components/modal.js`：新增 `showDeleteModal` 與 `showConfirmModal`。
- `js/views/catalog.js`：目錄表格刪除狀態標記、Modal 按鈕權限控制與複製/刪除事件。
- `js/views/review.js`：重構三頁籤過濾邏輯（聯集運算）、Modal 動作按鈕動態呈現、單例防護。
- `css/review.css`：修復 Toolbar 動作區 Flex 排版與 `.user-switcher-label` 單行設定。
- `index.html`：更新角色選單標籤與各 Modal 結構。

---

## 4. 驗證情境 (Verification Scenarios)

1. Alex Chen (User) 登入：
   - 進入「我的送審紀錄」打開審核中項目，確認無 Reject/Approve 按鈕。
   - 在目錄對自建 Approved 樣板點擊 Duplicate，確認自動跳轉 Studio 且狀態為 Draft。
   - 點擊申請刪除，確認填寫原因後狀態變為刪除審核中。
2. Sarah Wu (Admin) 登入：
   - 進入「待我審核」確認可看見全平台待審與刪除申請項目。
   - 點擊「核准刪除」，自訂確認框彈出並成功執行刪除，樣板正式下線。
