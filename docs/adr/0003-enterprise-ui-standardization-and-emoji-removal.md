# ADR 0003: 企業級 UI 視覺標準化與去 Emoji 扁平化狀態規範

- **狀態**：Accepted (已採用)
- **日期**：2026-08-27
- **決策者**：DataStudio 前端架構團隊
- **對應 Commit**：`7369d86` (refactor: standardize UI text by removing emojis and updating label terminology across views) & `55c07f8` (refactor: simplify UI elements and update styling across review view templates)
- **相關議題**：企業級設計系統、去 Emoji 化、狀態圓點 (Status Dot)、標準化術語與可存取性 (a11y)

---

## 1. 背景與問題陳述 (Context & Problem Statement)

在系統早期開發中，為了快速表達狀態與按鈕語意，大量使用了系統原生 Emoji（例如 🚀 發布、⚠️ 待審核、💾 儲存、📊 統計、🔍 查詢等）。
隨著平台邁向企業級數據資產治理標準，出現以下視覺與維護痛點：
1. **平台相容性與視覺分裂**：不同作業系統（macOS / Windows / Linux）與瀏覽器呈現的 Emoji 樣式、顏色與尺寸差異極大，在企業後台顯得不夠嚴謹沉穩。
2. **語意模糊與無障礙性差**：純靠 Emoji 無法精確表達「草稿 (Draft)」、「審核中 (Pending)」、「已退回 (Rejected)」、「已發布 (Published)」等複雜狀態。
3. **按鈕視覺雜亂**：按鈕中混雜彩色 Emoji 會干擾使用者對主行動點 (Primary Action) 的聚焦。

---

## 2. 決策考量因素 (Decision Drivers)

- **企業級專業外觀 (Enterprise Look & Feel)**：遵循 Ant Design / Tailwind 等沉穩專業的企業後台設計語言。
- **一致的狀態識別體系 (Consistent Status Vocabulary)**：採用「幾何狀態圓點 (Status Dot) + 語意標籤 (Badge)」的雙重識別機制。
- **精準的專業術語 (Standardized Terminology)**：統一繁體中文技術術語（例如：「SQL 樣板」、「敏感欄位 PII」、「審核流程」）。

---

## 3. 備選方案評估 (Considered Options)

### 方案 A：引入重型第三方 Icon 字型庫 (FontAwesome / Material Icons)
- **優點**：圖示豐富。
- **缺點**：
  - 增加額外的網路字型請求與渲染延遲。
  - 需要維護龐大的 CSS Class 字典。

### 方案 B：純 CSS 幾何圓點 + 內嵌純量 SVG 圖示 (採用)
- **做法**：
  - 狀態指示全面改用 CSS 偽元素或 `.status-dot`，透過語意化色彩變數（`--color-success`, `--color-warning`, `--color-danger`, `--color-info`）呈現。
  - 重要操作按鈕採用內嵌極簡 SVG 或簡約純文字。
- **優點**：
  - 零外部字型依賴，加載效能極佳。
  - 顏色與動畫可精確受 CSS 變數控制。

---

## 4. 決策結果 (Decision Outcome)

全面執行 **「去 Emoji 化與企業級狀態標準化」**：

1. **狀態圓點與標籤體系 (`css/components.css` & `css/main.css`)**：
   - 建立標準狀態類別：
     - `.status-dot.status-dot-published`（綠色）：已發布
     - `.status-dot.status-dot-pending`（橘黃色）：待審核
     - `.status-dot.status-dot-draft`（灰色/藍色）：草稿
     - `.status-dot.status-dot-rejected`（紅色）：已退回
2. **文字標籤與語意化清理**：
   - 全面移除所有視圖 HTML/JS 內的 Emoji 字元。
   - 統一操作命名：例如「儲存草稿」、「提交審核」、「核准」、「駁回」、「複製 SQL」。
3. **審核視圖佈局簡約化 (`css/review.css` & `js/views/review.js`)**：
   - 簡化審核卡片結構，去除多餘裝飾框線，強化內容層次與字級階層（Typography Hierarchy）。

---

## 5. 架構影響與優缺點分析 (Pros and Cons)

### 正面影響 (Pros)
- **跨平台視覺完全一致**：不再受使用者作業系統 Emoji 字型渲染差異影響。
- **提升整體專業質感**：符合企業金融與數據治理產品的沉穩視覺需求。

### 負面影響 / 權衡 (Cons & Mitigations)
- **無負面架構副作用**，僅需在後續新增功能時確保團隊遵守無 Emoji 之前端規範。

---

## 6. 相關模組與檔案 (Related Modules)
- `css/main.css`：全域色票變數與基礎排版規範
- `css/components.css`：狀態標籤與圓點樣式
- `css/review.css`：審核中心卡片樣式標準化
- `js/views/catalog.js`、`js/views/studio.js`、`js/views/review.js`：文字語彙重構
