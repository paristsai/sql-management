# ADR 0006: Monaco Editor 跨視圖 SQL 語法高亮裝飾器與動態標記切換架構

- **狀態**：Accepted (已採用)
- **日期**：2026-08-28
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`2b4efbb` (feat: add catalog read-only modal, sql highlight toggles, and cache-control headers)
- **相關議題**：Monaco Editor 語法高亮裝飾器、敏感個資 (PII) 識別、動態參數反向匹配、跨 Modal/Studio 統一高亮切換

---

## 1. 背景與問題陳述 (Context & Problem Statement)

在 DataStudio 數據平台中，SQL 樣板核心包含兩類關鍵中繼資料：
1. **敏感個資欄位 (PII)**：如手機號碼 (`phone_number`)、身分證字號 (`id_card_num`)、銀行帳戶等，涉及隱私合規與個資治理。
2. **動態執行參數 (Dynamic Parameters)**：如 `{{start_date}}`、`{{channel}}` 等，在執行期注入即時查詢條件。

在過去系統演進中，存在以下架構痛點：
1. **高亮能力碎片化**：
   - 僅 SQL 工作台 (`SqlEditor`) 具備裝飾器，而目錄只讀彈窗 (`SqlReadOnlyEditor`) 與審核中心差異對照 (`SqlDiffViewer`) 缺乏統一的高亮能力。
2. **Raw SQL 與 Template 雙向比對缺失**：
   - 使用者在 Raw SQL 檢視下，無法直觀辨識哪些原始字面值（如 `'2026-08-01'`、`'google_ad'`）對應到樣板中的動態參數。
   - 早期正則比對未妥善處理單引號、雙引號及無引號邊界，導致帶引號的日期與字串無法被正確認出。
3. **缺乏使用者控制權**：
   - 使用者無法在閱讀或審核複雜 SQL 時自由開關高亮標記，且介面缺少明確的顏色圖例（Legend）。
4. **新建工作台初始化時序漏洞**：
   - 建立新 SQL 樣板時，因非同步 AI AST 分析完成後未觸發刷新，導致預設開啟高亮卻未呈現標記。

---

## 2. 決策考量因素 (Decision Drivers)

- **跨視圖一致性 (Cross-View Consistency)**：工作台、目錄詳情 Modal、審核中心 Modal 及版本差異 Diff 視圖皆需具備完全相同的語法解析與標記規則。
- **無閃爍極速響應 (Zero-Flicker Performance)**：切換高亮或切換 SQL 頁籤時，應直接透過 Monaco 原生 `deltaDecorations` 動態掛載與清除，嚴禁銷毀或重繪編輯器實例。
- **精確匹配與防呆 (Matching Precision & Robustness)**：
  - 支援限定表名格式（`u.phone_number`）與裸欄位名（`phone_number`）之 PII 比對。
  - 參數比對需同時滿足三態匹配（單引號、雙引號、語法邊界未包覆），並具備區間去重機制以防重複裝飾。
- **直觀視覺反饋 (Visual Feedback & Standards)**：提供符合企業風格的切換按鈕、啟用狀態（藍底微光）與精簡色塊圖例（紅底線代表 PII、黃色底線代表參數）。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：自定義 Monaco Language Tokenizer / Semantic Tokens
- **做法**：註冊自定義 Monaco Monarch Lexer，在語法分析階段將參數與 PII 當作獨立 Token 著色。
- **優點**：與編輯器原生語法高亮深度結合。
- **缺點**：
  - Tokenizer 為靜態定義，難以根據當前樣板動態變更的 `parameters` 與 `columns` 進行即時動態比對。
  - 無法輕易自定義 Rich Tooltip (Hover Message) 與特定邊框底線樣式。

### 方案 B：純 HTML 替換預覽 (Non-Monaco Highlighting)
- **做法**：只讀模式下採用 Prism/Highlight.js 或以正則替換 `<span>` 渲染。
- **優點**：輕量。
- **缺點**：失去 Monaco Editor 的行號、滾動同步、代碼摺疊與 Diff 對照能力，破壞整體 UI 一致性。

### 方案 C：集中式裝飾器演算法 + Monaco Delta Decorations 跨組件標準化 (採用)
- **做法**：抽取純函數 `computeSqlDecorations`，標準化 `updateHighlights()` 與 `clearHighlights()` 介面至所有 Monaco 封裝類別。
- **優點**：
  - 100% 邏輯共用（DRY 原則）。
  - 動態支援動態參數清單與 PII 欄位變更。
  - 具備 Hover 懸浮卡片說明（如顯示 `**敏感欄位 (PII)**: ...`）。

---

## 4. 決策結果 (Decision Outcome)

採用 **「集中式 Monaco 裝飾器管線與統一 UI 切換架構」**：

### 4.1. 集中化裝飾器管線 (`computeSqlDecorations`)
在 `js/components/editor.js` 導出標準計算純函數：
1. **動態參數佔位符匹配**：正則 `/\{\{([a-zA-Z0-9_]+)\}\}/g`，附加 `.monaco-highlight-param` 樣式與說明。
2. **Raw SQL 預設值反向匹配**：
   - 提取 `defaultVal` 核心字串並轉義。
   - 同時產生 `'${val}'`、`"${val}"` 與 `(?<=^|[\s,(=<>'"])${val}(?=$|[\s,);<>'"]|$)` 三組正則。
   - 採用 `matchedRanges = new Set()` 防止跨模式重複裝飾。
   - 附加 `.monaco-highlight-raw-param` 樣式與對應參數提示。
3. **敏感欄位 (PII) 匹配**：
   - 支援限定名 `\bprefix.col\b` 與裸欄位 `(?:\b[a-zA-Z0-9_]+\.)?\bcol\b`。
   - 附加 `.monaco-highlight-pii` 樣式與隱私安全提示。

### 4.2. 編輯器類別標準化介面
`SqlEditor`、`SqlReadOnlyEditor` 與 `SqlDiffViewer` 統一實作：
- `updateHighlights(piiFields, parameters, mode)`
- `clearHighlights()`

在 `SqlDiffViewer` 中，同時為 `getOriginalEditor()` 與 `getModifiedEditor()` 獨立計算並應用裝飾，確保版本比對時雙側皆具備完整高亮。

### 4.3. 跨視圖切換按鈕與圖例 UI
在 Studio、Catalog Modal 與 Review Modal 頂部工具列統一掛載：
- `.sql-highlight-toggle-btn`：點擊切換 `modalHighlightEnabled`，即時調用裝飾更新或清除。
- `.sql-highlight-legend`：動態顯示/隱藏敏感欄位（紅點）與動態參數（黃點）圖例。

### 4.4. 工作台初始化與 AST 生命週期修復
- **新建模式 (Create Mode)**：預先載入預設 Demo 欄位與參數資料結構，於編輯器掛載時立即執行首次裝飾計算。
- **AI AST 分析完成時**：於非同步分析回呼末端明確調用 `this.refreshEditorHighlights()`，確保自動識別出的參數與 PII 立即生效。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **極高的程式碼重用與維護性**：任何高亮規則調整（如新增特定資料型別支援）僅需修改 `computeSqlDecorations` 一處。
- **一致的使用者體驗**：開發者在 Studio 寫作、維運人員在 Catalog 檢閱、主管在 Review 審核時，看見完全相同的視覺標記與懸浮說明。

### 負面影響 / 權衡 (Cons & Mitigations)
- **超大型 SQL 的正則運算開銷**：若 SQL 超過數千行，即時正則運算可能佔用主執行緒。
  - *緩解措施*：在編輯過程中採用 300ms Debounce 防抖機制計算 Decorations。

---

## 6. 相關模組與檔案 (Related Modules)
- `js/components/editor.js`：核心裝飾器演算法與編輯器方法標準化
- `css/components.css`：Monaco 高亮樣式、Tooltip 格式與切換按鈕樣式
- `js/views/studio.js`：工作台即時連動與 AST 回呼
- `js/views/catalog.js`：目錄唯讀彈窗高亮開關與圖例
- `js/views/review.js`：審核中心雙欄 Diff 裝飾器連動
