# ADR 0005: Studio 彈性雙欄拖曳佈局與敏感個資覆寫治理架構

- **狀態**：Accepted (已採用)
- **日期**：2026-08-28
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`4bb289f` (feat: implement resizable studio layout and enhance sensitive column management with override support) & `d1f08f9` (fix: update regex for qualified field matching and refine SQL template parameters and defaults)
- **相關議題**：工作台版面拖曳調整 (Splitter)、敏感欄位 (PII) 自動識別與手動覆寫 (Override)、個資分級治理 (Sensitivity Tiering)

---

## 1. 背景與問題陳述 (Context & Problem Statement)

SQL 工作台 (`StudioView`) 作為核心開發環境，承載了左側 Monaco 代碼編輯區與右側中繼資料（參數、敏感欄位、AST 欄位清單）面板。
在實際使用中遇到兩大架構與產品挑戰：
1. **固定欄寬限制工作體驗**：
   - 寬螢幕使用者希望能展開編輯區撰寫寬行 SQL，或展開右側檢查龐大的 Schema 欄位；而原本固定百分比（如 60% / 40%）的佈局無法適應不同螢幕與工作習慣。
2. **AI / AST 敏感欄位誤判與覆寫機制缺失**：
   - 靜態正則或 AST 語法分析自動辨識 PII 欄位（如 `phone`、`id_card`）雖然高效，但在複雜查詢或別名（Alias）下可能存在漏判或誤判。
   - 開發者與資安人員需要能夠「手動強制標記為 PII」或「手動將誤判欄位移出 PII」，並設定個資敏感等級（高/中/低）與脫敏遮罩策略。

---

## 2. 決策考量因素 (Decision Drivers)

- **流暢且無依賴的拖曳體驗 (Native Resizable Splitter)**：以純原生 DOM 事件實作拖曳分隔線，支援最小/最大寬度保護，並自動通知 Monaco Editor 重新調整尺寸 (`layout()`)。
- **佈局偏好持久化 (Layout State Persistence)**：使用者的拖曳寬度應持久化至 `localStorage`，重新整理或切換頁面後保持個人化寬度。
- **敏感欄位治理雙軌制 (Dual-Track PII Governance)**：
  - 第一軌：系統自動正則分析（支援限定表名如 `u.phone_number` 與裸欄位）。
  - 第二軌：人工覆寫清單 (`sensitive_overrides`)，人工標記擁有最高優先權。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：引入第三方 Split.js 庫
- **缺點**：增加了外部相依性，且與 Monaco Editor 的 ResizeObserver / `layout()` 觸發時序容易產生衝突。

### 方案 B：純原生 Pointer/Mouse 事件 Splitter + Store 敏感覆寫狀態機 (採用)
- **做法**：
  - 在 DOM 中插入 `.studio-splitter`，監聽 `mousedown`、`mousemove` 與 `mouseup`（搭配 `document` 層級防游標跳出監聽）。
  - 拖曳過程使用 `requestAnimationFrame` 節流更新 CSS Flex Basis 或 Width。
  - 在資料結構中擴充 `sensitive_columns` 支援自定義等級 (`tier: "L1" | "L2" | "L3"`) 與手動標記。

---

## 4. 決策結果 (Decision Outcome)

採用 **「原生可持久化 Splitter 控制器 + 敏感欄位雙軌覆寫治理機制」**：

1. **工作台彈性分欄控制器 (`js/views/studio.js` & `css/studio.css`)**：
   - 插入拖曳把手 `.studio-splitter`，支援自適應邊界限制（最小 300px，最大 `clientWidth - 300px`）。
   - 拖曳結束時自動將寬度儲存至 `localStorage.getItem('studio_layout_left_width')`。
   - 綁定 `ResizeObserver` 與拖曳回呼，即時調用 `editor.layout()` 防止 Monaco 代碼排版破裂。
2. **敏感欄位階層與覆寫架構 (`js/store.js` & `js/views/studio.js`)**：
   - 定義標準敏感度層級：
     - `L1`：核心機密（身分證號、銀行帳號、密碼雜湊）
     - `L2`：個人識別（電話號碼、電子郵件、姓名）
     - `L3`：商業敏感（交易金額、內部工號）
   - 提供「手動新增敏感欄位」與「強制覆寫/排除自動偵測」操作介面，儲存於樣板屬性 `sensitiveOverrides` 中。
3. **正則匹配演算法修正 (`js/components/editor.js` & `js/store.js`)**：
   - 增強 SQL 正則比對，正確支援 `alias.column` 格式，防止前綴表名干擾欄位判定。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **卓越的操作自由度**：分析師可隨心所欲調整寫作與中繼資料檢視空間。
- **嚴密的個資合規治理**：兼顧自動化高效率與人工覆寫的高精確度。

### 負面影響 / 權衡 (Cons & Mitigations)
- **極端視窗縮放下可能溢出**：當視窗縮小至平板或手機尺寸時，拖曳寬度可能超出可視區。
  - *緩解措施*：在 `@media (max-width: 1024px)` 自動停用拖曳並切換為垂直單欄堆疊流。

---

## 6. 相關模組與檔案 (Related Modules)
- `js/views/studio.js`：Splitter 拖曳控制器與敏感欄位管理面板
- `css/studio.css`：`.studio-splitter` 樣式與雙欄佈局響應式規範
- `js/store.js`：敏感欄位覆寫資料結構與驗證邏輯
- `js/components/editor.js`：Monaco Editor `layout()` 連動與正則解析
