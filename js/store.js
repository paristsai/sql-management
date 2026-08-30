/**
 * SQL Template Platform - Global Data Store & State Machine
 */

const STORAGE_KEY = 'sql_template_platform_data_v3';

const INITIAL_TEMPLATES = [
  {
    id: 'TPL_USER_RETENTION_7D',
    name: '用戶 7 日留存率與付費轉換分析',
    type: 'company', // 'company' | 'dept'
    departments: ['數據工程部', '營運企劃部', '產品研發部'],
    databases: ['Trino', 'MySQL_Master'],
    rawSql: `SELECT 
  u.user_id,
  u.phone_number,
  u.id_card_num,
  u.register_date,
  COUNT(DISTINCT a.activity_date) AS active_days_7d,
  SUM(COALESCE(p.pay_amount, 0)) AS total_revenue
FROM users u
LEFT JOIN user_activities a 
  ON u.user_id = a.user_id 
  AND a.activity_date BETWEEN '2026-08-01' AND '2026-08-07'
LEFT JOIN orders p 
  ON u.user_id = p.user_id 
  AND p.status = 'SUCCESS'
WHERE u.channel_source = 'google_ad'
  AND u.register_date >= '2026-08-01'
GROUP BY u.user_id, u.phone_number, u.id_card_num, u.register_date
HAVING COUNT(DISTINCT a.activity_date) >= 3;`,
    templateSql: `SELECT 
  u.user_id,
  u.phone_number,
  u.id_card_num,
  u.register_date,
  COUNT(DISTINCT a.activity_date) AS active_days_7d,
  SUM(COALESCE(p.pay_amount, 0)) AS total_revenue
FROM users u
LEFT JOIN user_activities a 
  ON u.user_id = a.user_id 
  AND a.activity_date BETWEEN {{start_date}} AND {{end_date}}
LEFT JOIN orders p 
  ON u.user_id = p.user_id 
  AND p.status = 'SUCCESS'
WHERE u.channel_source = {{channel}}
  AND u.register_date >= {{start_date}}
GROUP BY u.user_id, u.phone_number, u.id_card_num, u.register_date
HAVING COUNT(DISTINCT a.activity_date) >= {{min_active_days}};`,
    description: '統計指定推廣渠道註冊之用戶，在指定 7 天區間內的登入留存天數與付費總金額，用於行銷成效 ROI 評估。',
    columns: [
      { name: 'user_id', type: 'VARCHAR(64)', desc: '用戶唯一識別編號', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'phone_number', type: 'VARCHAR(20)', desc: '用戶手機號碼', aiSensitive: true, isPii: true, overrideReason: '' },
      { name: 'id_card_num', type: 'VARCHAR(30)', desc: '身分證字號', aiSensitive: true, isPii: true, overrideReason: '' },
      { name: 'register_date', type: 'DATE', desc: '用戶註冊日期', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'active_days_7d', type: 'INTEGER', desc: '統計週期內活躍天數', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'total_revenue', type: 'DECIMAL(12,2)', desc: '累計付費訂單金額', aiSensitive: false, isPii: false, overrideReason: '' }
    ],
    parameters: [
      { name: 'start_date', type: 'Date', defaultVal: '2026-08-01', required: true, desc: '統計起始日期 (YYYY-MM-DD)' },
      { name: 'end_date', type: 'Date', defaultVal: '2026-08-07', required: true, desc: '統計結束日期 (YYYY-MM-DD)' },
      { name: 'channel', type: 'String', defaultVal: "'google_ad'", required: true, desc: '推廣獲客渠道代碼' },
      { name: 'min_active_days', type: 'Number', defaultVal: '3', required: false, desc: '最低活躍門檻天數' }
    ],
    piiFields: ['phone_number', 'id_card_num'],
    attachments: [
      { id: 'att-1', name: 'execution_proof_trino.png', size: '240 KB', type: 'image/png', isSuccessScreenshot: true, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280"><rect width="100%" height="100%" fill="#1e293b"/><text x="20" y="38" fill="#10b981" font-family="monospace" font-size="15" font-weight="bold">✓ Trino Query Executed Successfully (12.4ms, 1,280 rows)</text><rect x="20" y="55" width="560" height="205" fill="#0f172a" rx="6" stroke="#334155"/><text x="35" y="85" fill="#94a3b8" font-family="monospace" font-size="13">user_id | phone_number | active_days_7d | total_revenue</text><line x1="35" y1="95" x2="560" y2="95" stroke="#334155" /><text x="35" y="125" fill="#f8fafc" font-family="monospace" font-size="13">U982142 | 0912****88   | 5              | $1,420.00</text><text x="35" y="155" fill="#f8fafc" font-family="monospace" font-size="13">U982143 | 0988****12   | 7              | $3,890.00</text><text x="35" y="185" fill="#f8fafc" font-family="monospace" font-size="13">U982144 | 0910****55   | 4              | $850.00</text><text x="35" y="215" fill="#10b981" font-family="monospace" font-size="12">... and 1,277 more rows fetched in 0.012s</text></svg>') }
    ],
    reviewStatus: 'In Review', // 'Draft' | 'In Review' | 'Approved'
    usageStatus: 'Disabled',   // 'Active' | 'Disabled'
    author: 'Alex Chen (Data Engineer)',
    assignee: 'John Doe (Data Architect)',
    updatedAt: '2026-08-28 15:30:00',
    history: [
      { action: 'Create', user: 'Alex Chen', time: '2026-08-20 10:00:00', comment: '建立初始版本' },
      { action: 'Submit Review', user: 'Alex Chen', time: '2026-08-20 11:00:00', comment: '送出審核' },
      { action: 'Approve', user: 'John Doe', time: '2026-08-21 09:30:00', comment: '初版通過審核，准予上線' },
      { action: 'Submit Review', user: 'Alex Chen', time: '2026-08-28 15:30:00', comment: '新增 id_card_num 欄位、調整 HAVING 門檻，重新送審' }
    ],
    versions: [
      {
        version: 1,
        rawSql: `SELECT 
  u.user_id,
  u.phone_number,
  u.register_date,
  COUNT(DISTINCT a.activity_date) AS active_days_7d,
  SUM(COALESCE(p.pay_amount, 0)) AS total_revenue
FROM users u
LEFT JOIN user_activities a 
  ON u.user_id = a.user_id 
  AND a.activity_date BETWEEN '2026-08-01' AND '2026-08-07'
LEFT JOIN orders p 
  ON u.user_id = p.user_id 
  AND p.status = 'SUCCESS'
WHERE u.channel_source = 'google_ad'
  AND u.register_date >= '2026-08-01'
GROUP BY u.user_id, u.phone_number, u.register_date
HAVING COUNT(DISTINCT a.activity_date) >= 1;`,
        templateSql: `SELECT 
  u.user_id,
  u.phone_number,
  u.register_date,
  COUNT(DISTINCT a.activity_date) AS active_days_7d,
  SUM(COALESCE(p.pay_amount, 0)) AS total_revenue
FROM users u
LEFT JOIN user_activities a 
  ON u.user_id = a.user_id 
  AND a.activity_date BETWEEN {{start_date}} AND {{end_date}}
LEFT JOIN orders p 
  ON u.user_id = p.user_id 
  AND p.status = 'SUCCESS'
WHERE u.channel_source = {{channel}}
  AND u.register_date >= {{start_date}}
GROUP BY u.user_id, u.phone_number, u.register_date
HAVING COUNT(DISTINCT a.activity_date) >= {{min_active_days}};`,
        approvedAt: '2026-08-21 09:30:00',
        approvedBy: 'John Doe (Data Architect)'
      }
    ],
    impact: {
      affectedSystems: 4,
      affectedUsers: 18,
      systemsList: ['BI Dashboard - User Growth', 'Marketing Airflow DAG #12', 'CRM Segment Sync', 'Executive Weekly Report']
    }
  },
  {
    id: 'TPL_FIN_MONTHLY_LEDGER',
    name: '財務部月結對帳清冊 (敏感審計專用)',
    type: 'dept',
    departments: ['財務會計部', '法務合規部'],
    databases: ['Oracle_Fin', 'PostgreSQL_Analytics'],
    rawSql: `SELECT 
  t.tx_id,
  t.account_no,
  t.bank_code,
  t.amount,
  t.tax_amount,
  t.created_at
FROM finance_transactions t
WHERE t.period = '202607'
  AND t.audit_status = 'VERIFIED';`,
    templateSql: `SELECT 
  t.tx_id,
  t.account_no,
  t.bank_code,
  t.amount,
  t.tax_amount,
  t.created_at
FROM finance_transactions t
WHERE t.period = {{accounting_period}}
  AND t.audit_status = {{audit_status}};`,
    description: '財務部專用月結各銀行帳號出入金對帳總表，涉及高機敏銀行帳號與金流資訊。',
    columns: [
      { name: 'tx_id', type: 'VARCHAR(32)', desc: '交易唯一序號', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'account_no', type: 'VARCHAR(30)', desc: '銀行帳號', aiSensitive: true, isPii: true, overrideReason: '' },
      { name: 'bank_code', type: 'VARCHAR(10)', desc: '銀行分行代碼', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'amount', type: 'DECIMAL(16,2)', desc: '交易淨額', aiSensitive: true, isPii: true, overrideReason: '' },
      { name: 'tax_amount', type: 'DECIMAL(12,2)', desc: '應繳稅額', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'created_at', type: 'TIMESTAMP', desc: '入帳時間', aiSensitive: false, isPii: false, overrideReason: '' }
    ],
    parameters: [
      { name: 'accounting_period', type: 'String', defaultVal: "'202607'", required: true, desc: '月結會計週期 (YYYYMM)' },
      { name: 'audit_status', type: 'String', defaultVal: "'VERIFIED'", required: true, desc: '審計覆核狀態' }
    ],
    piiFields: ['account_no', 'amount'],
    attachments: [
      { id: 'att-fin', name: 'oracle_audit_pass.png', size: '310 KB', type: 'image/png', isSuccessScreenshot: true, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280"><rect width="100%" height="100%" fill="#0f172a"/><text x="20" y="38" fill="#10b981" font-family="monospace" font-size="15" font-weight="bold">✓ Oracle DB Query OK (0.8s, 4,200 rows)</text><rect x="20" y="55" width="560" height="205" fill="#1e293b" rx="6" stroke="#334155"/><text x="35" y="85" fill="#38bdf8" font-family="monospace" font-size="13">tx_id | account_no | bank_code | amount</text><line x1="35" y1="95" x2="560" y2="95" stroke="#334155" /><text x="35" y="125" fill="#f8fafc" font-family="monospace" font-size="13">TX9910 | 822-0091-*** | 012 | $892,000.00</text><text x="35" y="155" fill="#f8fafc" font-family="monospace" font-size="13">TX9911 | 004-1182-*** | 004 | $1,230,500.00</text></svg>') }
    ],
    reviewStatus: 'Approved',
    usageStatus: 'Active',
    author: 'Emily Lin (FinTech)',
    assignee: 'John Doe (Data Architect)',
    updatedAt: '2026-08-25 14:00:00',
    history: [
      { action: 'Create', user: 'Emily Lin', time: '2026-08-10 10:00:00', comment: '建立財務專用 SQL（僅含 tx_id, account_no, amount, created_at）' },
      { action: 'Submit Review', user: 'Emily Lin', time: '2026-08-10 14:00:00', comment: '送審' },
      { action: 'Approve', user: 'John Doe', time: '2026-08-11 09:00:00', comment: 'v1 審核通過' },
      { action: 'Submit Review', user: 'Emily Lin', time: '2026-08-24 16:00:00', comment: '新增 bank_code, tax_amount 欄位，送審 v2' },
      { action: 'Approve', user: 'John Doe', time: '2026-08-25 14:00:00', comment: 'v2 審核通過，新增欄位准予上線' }
    ],
    versions: [
      {
        version: 1,
        rawSql: `SELECT 
  t.tx_id,
  t.account_no,
  t.amount,
  t.created_at
FROM finance_transactions t
WHERE t.period = '202606'
  AND t.audit_status = 'VERIFIED';`,
        templateSql: `SELECT 
  t.tx_id,
  t.account_no,
  t.amount,
  t.created_at
FROM finance_transactions t
WHERE t.period = {{accounting_period}}
  AND t.audit_status = {{audit_status}};`,
        approvedAt: '2026-08-11 09:00:00',
        approvedBy: 'John Doe (Data Architect)'
      },
      {
        version: 2,
        rawSql: `SELECT 
  t.tx_id,
  t.account_no,
  t.bank_code,
  t.amount,
  t.tax_amount,
  t.created_at
FROM finance_transactions t
WHERE t.period = '202607'
  AND t.audit_status = 'VERIFIED';`,
        templateSql: `SELECT 
  t.tx_id,
  t.account_no,
  t.bank_code,
  t.amount,
  t.tax_amount,
  t.created_at
FROM finance_transactions t
WHERE t.period = {{accounting_period}}
  AND t.audit_status = {{audit_status}};`,
        approvedAt: '2026-08-25 14:00:00',
        approvedBy: 'John Doe (Data Architect)'
      }
    ],
    impact: {
      affectedSystems: 2,
      affectedUsers: 5,
      systemsList: ['SAP ERP Connector', 'Monthly Audit Reporting Bot']
    }
  },
  {
    id: 'TPL_DAILY_SALES_AGG',
    name: '每日全通路銷售營收與退貨彙總',
    type: 'company',
    departments: ['營運企劃部', '數據工程部'],
    databases: ['MySQL_Master', 'Snowflake_WH'],
    rawSql: `SELECT 
  o.order_date,
  o.store_id,
  COUNT(o.order_id) AS total_orders,
  SUM(o.payment_amount) AS gross_sales,
  SUM(CASE WHEN o.is_refund = 1 THEN o.payment_amount ELSE 0 END) AS refund_sales
FROM store_orders o
WHERE o.order_date BETWEEN '2026-08-01' AND '2026-08-07'
  AND (o.store_id IS NULL OR o.store_id = 'STORE_001')
GROUP BY o.order_date, o.store_id;`,
    templateSql: `SELECT 
  o.order_date,
  o.store_id,
  COUNT(o.order_id) AS total_orders,
  SUM(o.payment_amount) AS gross_sales,
  SUM(CASE WHEN o.is_refund = 1 THEN o.payment_amount ELSE 0 END) AS refund_sales
FROM store_orders o
WHERE o.order_date BETWEEN {{start_date}} AND {{end_date}}
  AND ({{store_id}} IS NULL OR o.store_id = {{store_id}})
GROUP BY o.order_date, o.store_id;`,
    description: '計算指定期間內各實體與電商門市之總訂單數、總營收與退貨金額統計。',
    columns: [
      { name: 'order_date', type: 'DATE', desc: '訂單日期', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'store_id', type: 'VARCHAR(20)', desc: '門市編號', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'total_orders', type: 'BIGINT', desc: '總成交訂單數', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'gross_sales', type: 'DECIMAL(14,2)', desc: '營業總額', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'refund_sales', type: 'DECIMAL(14,2)', desc: '退款折讓金額', aiSensitive: false, isPii: false, overrideReason: '' }
    ],
    parameters: [
      { name: 'start_date', type: 'Date', defaultVal: "'2026-08-01'", required: true, desc: '查詢起始日期 (YYYY-MM-DD)' },
      { name: 'end_date', type: 'Date', defaultVal: "'2026-08-07'", required: true, desc: '查詢結束日期 (YYYY-MM-DD)' },
      { name: 'store_id', type: 'String', defaultVal: "'STORE_001'", required: false, desc: '指定門市 ID (例如 STORE_001)' }
    ],
    piiFields: [],
    attachments: [],
    reviewStatus: 'Draft',
    usageStatus: 'Disabled',
    author: 'John Doe (Data Architect)',
    assignee: 'Sarah Wu (Governance Lead)',
    updatedAt: '2026-08-28 09:15:00',
    history: [
      { action: 'Create', user: 'John Doe', time: '2026-08-28 09:15:00', comment: '草稿儲存中' }
    ],
    versions: [],
    impact: {
      affectedSystems: 0,
      affectedUsers: 0,
      systemsList: []
    }
  },
  {
    id: 'TPL_RISK_CREDIT_SCORE',
    name: '用戶信用評分與風控黑名單特徵提領',
    type: 'dept',
    departments: ['風控合規部', '產品研發部'],
    databases: ['Snowflake_WH'],
    rawSql: `SELECT
  r.user_id,
  r.credit_score,
  r.overdue_count_90d,
  r.risk_level
FROM risk_feature_store r
WHERE r.risk_level IN ('HIGH', 'CRITICAL')
  AND r.updated_at >= '2026-08-01';`,
    templateSql: `SELECT
  r.user_id,
  r.credit_score,
  r.overdue_count_90d,
  r.risk_level
FROM risk_feature_store r
WHERE r.risk_level IN ({{risk_levels}})
  AND r.updated_at >= {{since_date}};`,
    description: '風控部提取高風險用戶特徵，供反詐欺模型及人工徵信覆核使用。',
    columns: [
      { name: 'user_id', type: 'VARCHAR(64)', desc: '用戶唯一識別編號', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'credit_score', type: 'INTEGER', desc: '信用評分', aiSensitive: true, isPii: true, overrideReason: '' },
      { name: 'overdue_count_90d', type: 'INTEGER', desc: '近90天逾期次數', aiSensitive: false, isPii: false, overrideReason: '' },
      { name: 'risk_level', type: 'VARCHAR(20)', desc: '風險評級', aiSensitive: false, isPii: false, overrideReason: '' }
    ],
    parameters: [
      { name: 'risk_levels', type: 'String', defaultVal: "'HIGH', 'CRITICAL'", required: true, desc: '風險等級過濾' },
      { name: 'since_date', type: 'Date', defaultVal: '2026-08-01', required: true, desc: '更新基準日' }
    ],
    piiFields: ['credit_score'],
    attachments: [
      { id: 'att-risk', name: 'snowflake_risk_run.png', size: '180 KB', type: 'image/png', isSuccessScreenshot: true, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280"><rect width="100%" height="100%" fill="#0f172a"/><text x="20" y="38" fill="#38bdf8" font-family="monospace" font-size="15" font-weight="bold">✓ Snowflake Query Success (45ms, 86 rows)</text><rect x="20" y="55" width="560" height="205" fill="#1e293b" rx="6" stroke="#334155"/><text x="35" y="85" fill="#94a3b8" font-family="monospace" font-size="13">user_id | credit_score | overdue_count_90d | risk_level</text><line x1="35" y1="95" x2="560" y2="95" stroke="#334155" /><text x="35" y="125" fill="#f8fafc" font-family="monospace" font-size="13">U100234 | 420 (High)   | 4                 | CRITICAL</text><text x="35" y="155" fill="#f8fafc" font-family="monospace" font-size="13">U100235 | 510 (Med)    | 2                 | HIGH</text></svg>') }
    ],
    reviewStatus: 'In Review',
    usageStatus: 'Disabled',
    author: 'John Doe (Data Architect)',
    assignee: 'Sarah Wu (Governance Lead)',
    updatedAt: '2026-08-29 08:30:00',
    history: [
      { action: 'Create', user: 'John Doe', time: '2026-08-29 08:00:00', comment: '新增風控特徵 SQL' },
      { action: 'Submit Review', user: 'John Doe', time: '2026-08-29 08:30:00', comment: '送審以供風控 DAG 正式排程調用' }
    ],
    versions: [],
    impact: {
      affectedSystems: 3,
      affectedUsers: 8,
      systemsList: ['Anti-Fraud Realtime Engine', 'Credit Risk Daily Batch']
    }
  }
];

class DataStore {
  constructor() {
    this.templates = [];
    this.listeners = [];
    this.currentUser = 'John Doe (Data Architect)';
    this.load();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(userName) {
    this.currentUser = userName;
    this.notify();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.templates = JSON.parse(saved);
      } else {
        this.templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
        this.save();
      }
    } catch (e) {
      console.warn('LocalStorage error, using defaults', e);
      this.templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.templates));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.templates));
  }

  getAll() {
    return this.templates;
  }

  getById(id) {
    return this.templates.find(t => t.id === id);
  }

  checkIdExists(id, excludeId = null) {
    return this.templates.some(t => t.id.toLowerCase() === id.toLowerCase() && t.id !== excludeId);
  }

  saveTemplate(tplData) {
    const existingIndex = this.templates.findIndex(t => t.id === tplData.id);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (existingIndex >= 0) {
      this.templates[existingIndex] = {
        ...this.templates[existingIndex],
        ...tplData,
        updatedAt: now
      };
    } else {
      this.templates.unshift({
        ...tplData,
        reviewStatus: tplData.reviewStatus || 'Draft',
        usageStatus: tplData.usageStatus || 'Disabled',
        updatedAt: now,
        author: tplData.author || 'Current User (Data Team)',
        history: [
          { action: 'Create', user: 'Current User', time: now, comment: '建立新 SQL Template' }
        ]
      });
    }
    this.save();
    return this.getById(tplData.id);
  }

  submitForReview(id) {
    const tpl = this.getById(id);
    if (!tpl) return false;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    tpl.reviewStatus = 'In Review';
    tpl.usageStatus = 'Disabled';
    tpl.updatedAt = now;
    tpl.history.push({
      action: 'Submit Review',
      user: 'Current User',
      time: now,
      comment: '送出審核申請'
    });
    this.save();
    return true;
  }

  approveTemplate(id, approver = 'Data Governance Admin', comment = '審核通過，正式發布上線') {
    const tpl = this.getById(id);
    if (!tpl) return false;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Snapshot current SQL into versions before status change
    if (!tpl.versions) tpl.versions = [];
    const nextVersion = tpl.versions.length + 1;
    tpl.versions.push({
      version: nextVersion,
      rawSql: tpl.rawSql || '',
      templateSql: tpl.templateSql || '',
      approvedAt: now,
      approvedBy: approver
    });

    tpl.reviewStatus = 'Approved';
    tpl.usageStatus = 'Active';
    tpl.updatedAt = now;
    tpl.history.push({
      action: 'Approve',
      user: approver,
      time: now,
      comment
    });
    this.save();
    return true;
  }

  rejectTemplate(id, reason, rejector = 'Data Governance Admin') {
    const tpl = this.getById(id);
    if (!tpl) return false;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    tpl.reviewStatus = 'Draft';
    tpl.usageStatus = 'Disabled';
    tpl.updatedAt = now;
    tpl.history.push({
      action: 'Reject',
      user: rejector,
      time: now,
      comment: `退回原因：${reason}`
    });
    this.save();
    return true;
  }

  toggleUsageStatus(id) {
    const tpl = this.getById(id);
    if (!tpl) return false;
    if (tpl.reviewStatus !== 'Approved') return false; // 只有審核完畢者可切換
    tpl.usageStatus = tpl.usageStatus === 'Active' ? 'Disabled' : 'Active';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    tpl.updatedAt = now;
    tpl.history.push({
      action: tpl.usageStatus === 'Active' ? 'Enable' : 'Disable',
      user: 'Current User',
      time: now,
      comment: `切換使用狀態為 ${tpl.usageStatus === 'Active' ? '可使用' : '停止使用'}`
    });
    this.save();
    return true;
  }

  batchDisable(ids) {
    ids.forEach(id => {
      const t = this.getById(id);
      if (t) t.usageStatus = 'Disabled';
    });
    this.save();
  }

  deleteTemplate(id) {
    this.templates = this.templates.filter(t => t.id !== id);
    this.save();
  }

  resetToDefaults() {
    this.templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
    this.save();
  }
  /**
   * Get the previous approved version of a template (for diff comparison).
   * - If 'In Review' or 'Draft': compares against the latest approved version (last entry in versions[])
   * - If 'Approved': compares against the previous approved version (second-to-last entry in versions[])
   */
  getPreviousVersion(id) {
    const tpl = this.getById(id);
    if (!tpl || !tpl.versions || tpl.versions.length === 0) return null;

    if (tpl.reviewStatus === 'In Review' || tpl.reviewStatus === 'Draft') {
      return tpl.versions[tpl.versions.length - 1];
    }

    if (tpl.versions.length < 2) return null;
    return tpl.versions[tpl.versions.length - 2];
  }

  /**
   * Get the latest approved version snapshot (last entry in versions[]).
   */
  getLatestVersion(id) {
    const tpl = this.getById(id);
    if (!tpl || !tpl.versions || tpl.versions.length === 0) return null;
    return tpl.versions[tpl.versions.length - 1];
  }
}

export const store = new DataStore();
