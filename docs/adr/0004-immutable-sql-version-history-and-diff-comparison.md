# ADR 0004: SQL 樣板不可變版本歷程與三態只讀對照架構

- **狀態**：Accepted (已採用)
- **日期**：2026-08-28
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`a3fffb5` (feat: implement SQL version history tracking and add read-only editors for review comparison)
- **相關議題**：樣板版本控制、歷史快照不可變性 (Immutability)、只讀編輯器封裝、版本間差異比較

---

## 1. 背景與問題陳述 (Context & Problem Statement)

在數據分析與維運過程中，SQL Template 會隨商業邏輯調整而持續演進。
在缺乏版本追蹤機制前：
1. **歷史無從考證**：每次儲存或發布直接覆蓋舊有 SQL，發生查詢錯誤或效能回退時無法回溯先前的穩定版本。
2. **審核對象不明確**：審核人員無法直觀看到「當前待審版本」相較於「線上已發布版本」或「上一歷史版本」的具體改動內容。
3. **只讀場景缺乏輕量組件**：歷史版本僅需唯讀展示，若皆以完整工作台編輯器載入，容易造成不必要的互動事件開銷與誤編輯風險。

---

## 2. 決策考量因素 (Decision Drivers)

- **不可變快照模型 (Immutable Snapshot Chain)**：每次發布或提交審核時，需自動生成帶有語意版本號 (`v1`, `v2`, `v3`...)、時間戳記、提交人與變更理由的不可變快照。
- **靈活的版本比較器 (Arbitrary Version Diffing)**：支援任意兩個歷史版本、或是「待審版本 vs. 當前生產版本」的差異對照。
- **輕量只讀編輯器封裝 (Dedicated Read-Only Editor)**：提供專用 `SqlReadOnlyEditor`，關閉編輯游標、輸入法綁定與修改功能，專注於高效展示代碼與語法著色。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：僅紀錄 Git Commit 式的 Diff 字串
- **缺點**：前端需要自行解析 Unified Diff 補丁才能重構代碼，難以進行單獨版本的語法測試與複製。

### 方案 B：完整不可變快照陣列 (`versions: [...]`) + 只讀組件抽離 (採用)
- **做法**：
  - 在每個 Template 物件中維持 `versions` 陣列，每個元素包含完整的 SQL、參數與中繼資料快照。
  - 在審核與歷程視圖提供版本下拉選單，動態載入對比。
  - 封裝 `SqlReadOnlyEditor` 類別供非編輯情境專用。

---

## 4. 決策結果 (Decision Outcome)

採用 **「不可變版本陣列 + 版本鏈結演進 + 專用唯讀編輯器」**：

1. **資料模型演進 (`js/store.js`)**：
   - 擴充 Template 結構：
     ```javascript
     {
       id: "tpl_001",
       version: "v3",
       versions: [
         { version: "v1", sql: "...", updatedAt: "...", author: "..." },
         { version: "v2", sql: "...", updatedAt: "...", author: "..." },
         { version: "v3", sql: "...", updatedAt: "...", author: "..." }
       ]
     }
     ```
   - 提供 `createVersionSnapshot()` 與 `rollbackToVersion()` 核心 API。
2. **輕量唯讀編輯器 (`SqlReadOnlyEditor` in `js/components/editor.js`)**：
   - 設定 Monaco Editor 參數：`readOnly: true`, `domReadOnly: true`, `renderLineHighlight: "none"`, `quickSuggestions: false`。
   - 大幅降低記憶體與鍵盤監聽事件負擔。
3. **版本比對 UI 與審核視圖連動 (`js/views/review.js`)**：
   - 審核彈窗支援「版本切換器」，可自由挑選特定歷史版本與當前申請進行 Monaco Diff 比對。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **數據變更有跡可循**：建立完整的版本審計鏈（Audit Trail）。
- **降低系統誤改風險**：只讀編輯器杜絕了在審核與檢視頁面誤觸鍵盤導致的資料非預期變更。

### 負面影響 / 權衡 (Cons & Mitigations)
- **LocalStorage 儲存體積增長**：完整快照陣列在版本眾多時會佔用較多 Client 儲存空間。
  - *緩解措施*：限制單一樣板保留最多最近 20 個版本快照。

---

## 6. 相關模組與檔案 (Related Modules)
- `js/store.js`：版本快照生成、歷程存取與回滾邏輯
- `js/components/editor.js`：`SqlReadOnlyEditor` 唯讀編輯器封裝
- `js/views/review.js`：審核中心版本比較與歷史記錄展現
- `css/review.css`：版本標籤與歷程時間軸樣式
