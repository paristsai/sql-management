# 0009 - 後端系統架構與完整 API 盤點清單 (Backend Systems & API Inventory)

## 1. 概述 (Overview)

本文件作為 **DataStudio (SQL Template 管理平台)** 正式開發之後端架構基準與 API 盤點清單。
系統採用 **契約先行 (Contract-First)** 與 **雙微服務架構**，分別處理企業級治理事務與高效能 SQL 計算引擎。

---

## 2. 服務架構與邊界劃分 (Microservices Architecture)

```
                       [ Next.js BFF / Frontend ]
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
【 Java 服務：data-studio-core 】               【 Python 服務：data-studio-engine 】
 • 企業級 CRUD / 交易一致性                       • Monaco Schema 補全字典 (Redis)
 • 審批工作流狀態機                               • SQL AST 語法樹解析 (sqlglot)
 • RBAC / 多租戶權限治理                          • PII 敏感欄位標籤與動態遮罩
 • 下游依賴與衝擊分析 (Impact Analysis)          • SQL 相似度比對 (AST + Vector)
 • Data API 服務化網關 (Token / 限流)             • 執行計畫 (Explain) 與成本估算
 • Webhook / 站內通知推播                         • 外部 DB 預覽執行沙盒 (Timeout 防禦)
```

---

## 3. API 完整盤點矩陣 (API Matrix)

### 3.1 Java 服務 (`data-studio-core`)：企業治理與業務中台

#### A. 認證與用戶上下文 (Auth & User Context)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | 取得當前使用者角色（Admin / Editor / Viewer）、部門與權限清單 |
| `GET` | `/api/v1/users/switchable` | *(開發/測試環境)* 取得可切換的測試角色列表 |

#### B. SQL 樣板目錄與 CRUD (Template Catalog)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/templates` | 樣板分頁清單（支援關鍵字、分類、標籤、狀態、建立者過濾） |
| `GET` | `/api/v1/templates/{id}` | 取得單一樣板詳細資訊（含最新版本與參數定義） |
| `POST` | `/api/v1/templates` | 建立新樣板 |
| `PUT` | `/api/v1/templates/{id}` | 更新樣板基本資訊（名稱、分類、標籤、描述） |
| `DELETE`| `/api/v1/templates/{id}` | 軟刪除樣板（記錄刪除原因與刪除審計日誌） |
| `POST` | `/api/v1/templates/{id}/duplicate` | 複製樣板（自動產生副本名稱並清空審批狀態） |

#### C. 版本歷史與變更審批流 (Version & Approval Workflow)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/templates/{id}/versions` | 取得樣板歷史版本清單（v1.0.0, v1.0.1...） |
| `GET` | `/api/v1/templates/{id}/versions/{versionId}` | 取得特定歷史版本的 SQL 與參數結構 |
| `GET` | `/api/v1/templates/{id}/diff` | 比對任意兩版本（`?from=v1&to=v2`）之 SQL 與參數差異 |
| `POST` | `/api/v1/templates/{id}/change-requests` | 提交發布/刪除申請（進入待審批狀態，需附帶變更原因） |
| `GET` | `/api/v1/reviews/pending` | 審批中心：獲取當前用戶待審核的申請清單 |
| `POST` | `/api/v1/reviews/{requestId}/decision` | 核准 (Approve) 或 退回 (Reject) 申請 |

#### D. 下游衝擊分析 (Downstream Impact Analysis)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/templates/{id}/impact-analysis` | 評估受影響之 BI 報表、Airflow DAG、外部 API 調用方與風險等級 |
| `GET` | `/api/v1/templates/{id}/downstream-dependencies` | 回傳該樣板在資料血緣圖（Lineage Graph）中的拓撲節點與邊 |

#### E. Data API 服務化網關 (Data-as-a-Service)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/data-service/{templateId}/query` | **對外查詢入口**：外部系統帶 API Token 調用 SQL 並取得資料 |
| `GET/POST` | `/api/v1/api-keys` | API Key 申請、展延與廢止管理 |
| `PUT` | `/api/v1/data-service/{templateId}/rate-limit` | 設定單一樣板的 QPS 限流與每日配額 |

#### F. 批次匯入 / 匯出 (Batch Import & Export)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/templates/batch-export` | 依 ID 列表批次匯出 SQL 樣板為 JSON / YAML / ZIP |
| `POST` | `/api/v1/templates/batch-import` | 批次上傳解析並執行匯入（支援覆蓋 / 略過 / 重新命名策略） |

#### G. 治理、稽核與通知 (Governance, Audit & Notification)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/audit-logs` | 全站操作稽核日誌（執行、審批、刪除、敏感資料存取） |
| `GET` | `/api/v1/governance/sensitive-rules` | 取得組織級敏感欄位標籤與遮罩規則定義 |
| `POST` | `/api/v1/notifications/webhook-settings` | 企業通訊軟體 Webhook 設定（Slack / Teams / Email） |
| `GET` | `/api/v1/notifications/my-alerts` | 站內個人通知清單 |
| `GET/POST` | `/api/v1/datasources` | 資料庫連線配置管理（加密儲存憑證） |

---

### 3.2 Python 服務 (`data-studio-engine`)：SQL 計算與安全引擎

#### A. SQL 語法與 AST 分析 (Syntax & AST Parsing)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sql/parse-parameters` | 解析 SQL 文本，萃取動態變數（如 `:start_date`）並推斷型別 |
| `POST` | `/api/v1/sql/validate-syntax` | SQL 語法檢查與 Dialect 驗證（PostgreSQL / Snowflake / BigQuery） |
| `POST` | `/api/v1/sql/detect-sensitive-columns` | AST 掃描 SELECT 欄位，標註命中 PII 的敏感欄位清單 |
| `POST` | `/api/v1/sql/lineage/extract` | 解析 SQL 原始 Source Tables/Columns 以供血緣建置 |

#### B. 相似度比對與防重複建置 (SQL Similarity & Deduplication)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sql/similarity/check` | 即時比對 SQL 與現有樣板庫的 AST 結構相似度與向量相似度 |
| `POST` | `/api/v1/sql/embeddings/index` | 樣板審批發布後，將 SQL 結構與語意轉為向量索引 |

#### C. 執行沙盒、成本估算與資料脫敏 (Execution Sandbox & Cost Estimation)
| 方法 | API Endpoint | 功能說明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sql/render` | 安全代入參數產生最終執行的 SQL 語句（防注入） |
| `POST` | `/api/v1/sql/explain` | 取得 SQL 執行計畫 (`EXPLAIN ANALYZE`) |
| `POST` | `/api/v1/sql/estimate-cost` | 估算預期資料掃描量 (Bytes) 與預估費用 |
| `POST` | `/api/v1/sql/execute-preview` | 執行 SQL 預覽（Limit 100 筆、超時中斷保護） |
| `POST` | `/api/v1/sql/mask-data` | 依使用者權限對結果集進行動態脫敏（Email 遮罩/Hash） |
| `GET` | `/api/v1/sql/executions/{executionId}` | 取得非同步查詢執行進度與結果集 |
| `POST` | `/api/v1/datasources/test-connection` | 測試外部資料庫連線池與只讀權限 |
| `GET` | `/api/v1/schema/{datasourceId}/metadata` | 抓取 DB/Table/Column 結構以供 Monaco Editor 自動補全 |
| `POST` | `/api/v1/schema/{datasourceId}/sync` | 同步與刷新資料庫元資料字典 |

---

## 4. Sprint 開發排程與分工建議 (Sprint Roadmap)

| 時程 | Java 負責 (BE 1) | Python 負責 (BE 2) | 前端對接 (FE 1 / FE 2) |
| :--- | :--- | :--- | :--- |
| **Sprint 1**<br>*(基礎骨幹)* | 1. `Template CRUD`<br>2. `Users/Me` (RBAC)<br>3. OpenAPI 契約產出 | 1. `parse-parameters`<br>2. `validate-syntax`<br>3. OpenAPI 契約產出 | **FE 1**: Monaco 編輯器與參數綁定<br>**FE 2**: Catalog 清單與篩選面板 |
| **Sprint 2**<br>*(核心業務)* | 1. `Version Diff`<br>2. `Change Requests`<br>3. `Reviews Approval` | 1. `execute-preview` (沙盒)<br>2. `detect-sensitive-columns`<br>3. `similarity/check` | **FE 1**: 查詢結果 Table 與敏感欄位 Masking<br>**FE 2**: 審核 Modal 與版本 Diff 檢視 |
| **Sprint 3**<br>*(進階治理)* | 1. `impact-analysis`<br>2. `Data API Gateway`<br>3. `Batch Import/Export` | 1. `lineage/extract`<br>2. `estimate-cost` / `explain`<br>3. `schema/metadata` 字典 | **FE 1**: Schema 補全與成本警告<br>**FE 2**: 衝擊分析報告與批次匯入 Modal |
| **Sprint 4**<br>*(整合優化)* | 1. `Webhook Notifications`<br>2. `Audit Logs` | 1. `mask-data` 脫敏優化<br>2. 連線池效能調校 | **全體**: 端到端整合測試與權限演練 |
