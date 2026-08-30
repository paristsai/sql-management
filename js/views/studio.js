/**
 * SQL Studio Workbench Controller (Create & Edit Dual Mode)
 */

import { store } from '../store.js';
import { toast } from '../components/toast.js';
import { SqlEditor } from '../components/editor.js';
import { ModalManager } from '../components/modal.js';

export class StudioView {
  constructor(container) {
    this.container = container;
    this.mode = 'create'; // 'create' | 'edit'
    this.currentId = null;
    this.currentTemplate = null;
    this.sqlEditor = null;
    this.activeEditorTab = 'raw'; // 'raw' | 'template'
    this.rawSqlCache = '';
    this.templateSqlCache = '';
    this.initialSnapshot = null;
  }

  async init(params = {}) {
    this.mode = params.mode || 'create';
    this.currentId = params.id || null;
    this.renderLayout();
    await this.initEditor();
    this.loadTemplateData();
    this.bindEvents();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="studio-container">
        <!-- Top Bar -->
        <div class="studio-header">
          <div class="studio-title-area">
            <button class="btn btn-outline btn-sm" id="studio-btn-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              返回目錄
            </button>
            <span class="studio-mode-badge" id="studio-mode-badge">新建模式</span>
            <div class="studio-template-title" id="studio-header-title">
              新建 SQL Template
            </div>
            <span id="studio-status-badge" class="badge badge-draft"><span class="badge-dot"></span> 草稿</span>
          </div>

          <div class="studio-actions">
            <button class="btn btn-outline btn-sm" id="studio-btn-cancel">放棄變更</button>
            <button class="btn btn-secondary btn-sm" id="studio-btn-save-draft">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              儲存草稿
            </button>
            <button class="btn btn-primary btn-sm" id="studio-btn-submit-review">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              送出審核
            </button>
          </div>
        </div>

        <!-- Split Pane Body -->
        <div class="studio-body">
          <!-- Left Pane: Editor & Console (50% default) -->
          <div class="studio-left-pane" id="studio-left-pane">
            <div class="editor-toolbar">
              <div class="editor-tabs">
                <button class="editor-tab active" id="tab-editor-raw" data-view="raw">
                  Raw SQL
                </button>
                <button class="editor-tab" id="tab-editor-template" data-view="template">
                  SQL Template
                </button>
              </div>
              <div class="editor-tools">
                <span style="font-size: 11px; color: var(--text-muted);">選取代碼可快速挖洞或標記敏感欄位</span>
                <button class="btn btn-outline btn-xs" id="btn-format-sql" title="格式化 SQL">格式化</button>
              </div>
            </div>

            <!-- Monaco Editor Container -->
            <div class="monaco-wrapper">
              <div id="monaco-editor-container"></div>
            </div>

            <!-- Bottom Console -->
            <div class="bottom-console">
              <div class="console-header">
                <div class="console-tabs">
                  <button class="console-tab active" id="tab-console-test" data-tab="test">
                    語法與執行測試
                  </button>
                  <button class="console-tab" id="tab-console-similarity" data-tab="similarity">
                    相似度比對 (Similarity Check)
                  </button>
                </div>
                <div style="font-size: 11px; color: var(--text-muted);" id="console-status-text">
                  尚未執行測試
                </div>
              </div>

              <!-- Console Body: Test Run -->
              <div class="console-body" id="console-body-test">
                <div class="test-controls">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 600; font-size: 12px;">測試目標 DB:</span>
                    <select class="form-select form-select-sm" id="test-target-db" style="width: 140px; padding: 4px 8px;">
                      <option value="MySQL_Master">MySQL_Master</option>
                      <option value="Trino">Trino (BigData)</option>
                      <option value="Oracle_Fin">Oracle_Fin</option>
                      <option value="Snowflake_WH">Snowflake_WH</option>
                    </select>
                  </div>
                  <button class="btn btn-success btn-sm" id="btn-run-test">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    執行測試
                  </button>
                </div>

                <div style="font-weight: 600; margin-bottom: 6px; font-size: 11px; color: var(--text-secondary);">
                  參數 Mock 輸入值：
                </div>
                <div class="mock-params-grid" id="mock-params-grid">
                  <!-- Auto populated from Card C parameters -->
                </div>

                <div id="test-result-output" style="margin-top: 10px;">
                  <div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">
                    點擊「執行測試」檢驗 SQL 在目標資料庫之執行計畫與回傳結果
                  </div>
                </div>
              </div>

              <!-- Console Body: Similarity -->
              <div class="console-body" id="console-body-similarity" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 12px; color: var(--text-secondary);">
                    自動比對系統庫內現存 SQL 相似度，防止重複造輪子：
                  </span>
                  <button class="btn btn-outline btn-xs" id="btn-recheck-similarity">重新比對</button>
                </div>
                <div id="similarity-results-list">
                  <!-- Populated dynamically -->
                </div>
              </div>
            </div>
          </div>

          <!-- Splitter -->
          <div class="studio-splitter" id="studio-splitter"></div>

          <!-- Right Pane: Metadata & Governance Form (50% default) -->
          <div class="studio-right-pane" id="studio-right-pane">
            <!-- Card A: Basic Info -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">基本資訊</div>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">
                    <span>Template ID (唯一識別碼)<span class="required">*</span></span>
                    <span id="tpl-id-status" style="font-size: 11px;"></span>
                  </label>
                  <input type="text" class="form-input" id="input-tpl-id" placeholder="如 TPL_USER_GROWTH_7D" style="font-family: var(--font-mono); font-weight: 600;" />
                  <div class="form-hint">英數字與底線組合，建立後作為 API 與程式調用唯一識別碼</div>
                </div>

                <div class="form-group">
                  <label class="form-label">名稱 (Name)<span class="required">*</span></label>
                  <input type="text" class="form-input" id="input-tpl-name" placeholder="請輸入完整業務名稱 (如: 新用戶留存分析)" />
                </div>

                <div class="form-group">
                  <label class="form-label">適用類型<span class="required">*</span></label>
                  <div style="display: flex; gap: 16px; margin: 4px 0 8px 0;">
                    <label style="font-size: 13px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                      <input type="radio" name="tpl-type" value="company" checked /> 全公司通用
                    </label>
                    <label style="font-size: 13px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                      <input type="radio" name="tpl-type" value="dept" /> 特定部門專用
                    </label>
                  </div>
                </div>

                <div class="form-group" id="group-departments" style="display: none;">
                  <label class="form-label">有權限的部門 (多選)<span class="required">*</span></label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
                    <label><input type="checkbox" class="dept-checkbox" value="數據工程部" /> 數據工程部</label>
                    <label><input type="checkbox" class="dept-checkbox" value="營運企劃部" /> 營運企劃部</label>
                    <label><input type="checkbox" class="dept-checkbox" value="財務會計部" /> 財務會計部</label>
                    <label><input type="checkbox" class="dept-checkbox" value="法務合規部" /> 法務合規部</label>
                    <label><input type="checkbox" class="dept-checkbox" value="產品研發部" /> 產品研發部</label>
                    <label><input type="checkbox" class="dept-checkbox" value="風險控管部" /> 風險控管部</label>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">綁定目標資料庫<span class="required">*</span></label>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; margin-top: 4px;">
                    <label class="tag-db" style="cursor: pointer;"><input type="checkbox" class="db-checkbox" value="MySQL_Master" checked /> MySQL_Master</label>
                    <label class="tag-db" style="cursor: pointer;"><input type="checkbox" class="db-checkbox" value="Trino" checked /> Trino</label>
                    <label class="tag-db" style="cursor: pointer;"><input type="checkbox" class="db-checkbox" value="Oracle_Fin" /> Oracle_Fin</label>
                    <label class="tag-db" style="cursor: pointer;"><input type="checkbox" class="db-checkbox" value="Snowflake_WH" /> Snowflake_WH</label>
                    <label class="tag-db" style="cursor: pointer;"><input type="checkbox" class="db-checkbox" value="PostgreSQL_Analytics" /> PostgreSQL</label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card B: AI Assistant Section -->
            <div class="card ai-badge-header">
              <div class="card-header">
                <div class="card-title" style="color: var(--purple-ai-text);">
                  AI 輔助解析與描述
                </div>
                <button class="btn btn-ai btn-xs" id="btn-ai-analyze">
                  AI 重新解析與生成
                </button>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">SQL 業務描述<span class="required">*</span></label>
                  <div id="ai-desc-wrapper">
                    <textarea class="form-textarea" id="input-tpl-desc" rows="3" placeholder="點擊 AI 解析自動生成業務描述，或手動編輯..."></textarea>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>輸出欄位與敏感標籤 (AI AST 解析)</span>
                    <span style="font-size: 11px; color: var(--text-muted);">系統判定為敏感若關閉需填寫理由</span>
                  </label>
                  <div id="ai-columns-wrapper" style="overflow-x: auto;">
                    <table class="column-meta-table">
                      <thead>
                        <tr>
                          <th>欄位名稱</th>
                          <th>資料型態</th>
                          <th>業務說明</th>
                          <th style="width: 75px; text-align: center;">系統判定</th>
                          <th style="width: 75px; text-align: center;">最終敏感</th>
                        </tr>
                      </thead>
                      <tbody id="columns-table-body">
                        <!-- Dynamic column rows -->
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card C: Parameter Management -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">動態參數管理 (Parameters)</div>
                <button class="btn btn-outline btn-xs" id="btn-add-param">+ 新增參數</button>
              </div>
              <div class="card-body">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">
                  在 SQL 中使用 <code>{{參數名}}</code> 語法挖洞，在此定義型態與預設值：
                </div>
                <div id="params-list-container">
                  <!-- Dynamic param items -->
                </div>
              </div>
            </div>

            <!-- Card D: Downstream Impact Analysis -->
            <div class="card" id="card-impact-analysis" style="display: none;">
              <div class="card-header">
                <div class="card-title">下游衝擊分析 (Impact Assessment)</div>
              </div>
              <div class="card-body">
                <div class="impact-alert-box">
                  <div class="impact-alert-title">
                    <span>線上相依性警示</span>
                  </div>
                  <div style="font-size: 12px; color: #881337;">
                    本樣板已有線上排程或使用者正在調用，修改後將影響下游作業：
                  </div>
                  <div class="impact-stats">
                    <div>
                      <div class="impact-stat-number" id="impact-systems-count">3</div>
                      <div style="font-size: 11px; color: #9f1239;">個相依 DAG / 系統</div>
                    </div>
                    <div>
                      <div class="impact-stat-number" id="impact-users-count">12</div>
                      <div style="font-size: 11px; color: #9f1239;">位調用工程師</div>
                    </div>
                  </div>
                </div>

                <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                  <input type="checkbox" id="chk-impact-confirmed" />
                  <strong>我已完成下游變更影響調查，並確認向相依團隊發布公告</strong>
                </label>
              </div>
            </div>

            <!-- Card E: Attachments & Proof -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">執行憑證與附件</div>
                <span class="badge badge-review" style="font-size: 10px;">需含執行成功截圖</span>
              </div>
              <div class="card-body">
                <div class="upload-dropzone" id="upload-dropzone">
                  <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">
                    點擊或拖曳上傳執行成功截圖 / 變更證明
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    支援 PNG, JPG, PDF (上限 10MB)
                  </div>
                  <input type="file" id="file-input-hidden" style="display: none;" accept="image/*" />
                </div>

                <div class="upload-file-list" id="upload-file-list">
                  <!-- File items -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async initEditor() {
    const editorContainer = this.container.querySelector('#monaco-editor-container');
    this.sqlEditor = new SqlEditor(editorContainer, {
      onParamExtracted: (param) => {
        this.addParameter(param);
        this.renderParameters();
        this.renderMockParams();
        this.refreshEditorHighlights();
        toast.info(`已加入動態參數 {{${param.name}}}`);
      },
      onPiiMarked: (fieldName) => {
        this.markColumnPii(fieldName, true);
        this.refreshEditorHighlights();
        toast.warning(`已將欄位 [${fieldName}] 標記為 敏感個資`);
      },
      onContentChanged: () => {
        this.refreshEditorHighlights();
      }
    });

    await this.sqlEditor.init('');
  }

  refreshEditorHighlights() {
    if (!this.sqlEditor) return;
    const piiFields = (this.currentTemplate?.columns || [])
      .filter(c => c.isPii)
      .map(c => c.name)
      .concat(this.currentTemplate?.piiFields || []);

    const parameters = this.currentTemplate?.parameters || [];
    this.sqlEditor.updateHighlights(
      Array.from(new Set(piiFields)),
      parameters,
      this.activeEditorTab
    );
  }

  loadTemplateData() {
    if (this.mode === 'edit' && this.currentId) {
      const tpl = store.getById(this.currentId);
      if (!tpl) {
        toast.danger(`找不到 Template ${this.currentId}`);
        window.AppRouter.navigate('catalog');
        return;
      }
      this.currentTemplate = JSON.parse(JSON.stringify(tpl));
      this.initialSnapshot = JSON.stringify(tpl);

      this.container.querySelector('#studio-mode-badge').textContent = '編輯模式';
      this.container.querySelector('#studio-header-title').textContent = `[${tpl.id}] ${tpl.name}`;

      const badge = this.container.querySelector('#studio-status-badge');
      if (tpl.reviewStatus === 'Approved') {
        badge.className = 'badge badge-approved';
        badge.innerHTML = '<span class="badge-dot"></span> 已核准';
      } else if (tpl.reviewStatus === 'In Review') {
        badge.className = 'badge badge-review';
        badge.innerHTML = '<span class="badge-dot"></span> 審核中';
      } else {
        badge.className = 'badge badge-draft';
        badge.innerHTML = '<span class="badge-dot"></span> 草稿';
      }

      this.container.querySelector('#input-tpl-id').value = tpl.id;
      this.container.querySelector('#input-tpl-id').disabled = true;
      this.container.querySelector('#input-tpl-name').value = tpl.name;
      this.container.querySelector('#input-tpl-desc').value = tpl.description || '';

      // Raw vs Template SQL
      this.rawSqlCache = tpl.rawSql || tpl.templateSql || '';
      this.templateSqlCache = tpl.templateSql || tpl.rawSql || '';

      // Default tab is raw SQL
      this.activeEditorTab = 'raw';
      this.sqlEditor.setValue(this.rawSqlCache);

      // Type & Dept
      if (tpl.type === 'dept') {
        this.container.querySelector('input[name="tpl-type"][value="dept"]').checked = true;
        this.container.querySelector('#group-departments').style.display = 'block';
        this.container.querySelectorAll('.dept-checkbox').forEach(cb => {
          cb.checked = (tpl.departments || []).includes(cb.value);
        });
      } else {
        this.container.querySelector('input[name="tpl-type"][value="company"]').checked = true;
      }

      // DBs
      this.container.querySelectorAll('.db-checkbox').forEach(cb => {
        cb.checked = (tpl.databases || []).includes(cb.value);
      });

      // Columns & Params & Files
      this.renderColumns(tpl.columns || []);
      this.renderParameters(tpl.parameters || []);
      this.renderAttachments(tpl.attachments || []);
      this.renderMockParams();
      this.refreshEditorHighlights();

      // Card D
      this.container.querySelector('#card-impact-analysis').style.display = 'block';
      this.container.querySelector('#impact-systems-count').textContent = (tpl.impact && tpl.impact.affectedSystems) || '3';
      this.container.querySelector('#impact-users-count').textContent = (tpl.impact && tpl.impact.affectedUsers) || '12';

    } else {
      // Create mode
      this.currentTemplate = {
        id: '',
        name: '',
        type: 'company',
        departments: [],
        databases: ['MySQL_Master', 'Trino'],
        rawSql: '',
        templateSql: '',
        description: '',
        columns: [],
        parameters: [],
        piiFields: [],
        attachments: []
      };
      this.container.querySelector('#card-impact-analysis').style.display = 'none';

      const defaultDemoSql = `SELECT 
  u.user_id,
  u.phone_number,
  u.register_date,
  COUNT(o.order_id) AS total_orders,
  SUM(o.amount) AS total_spent
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.channel = 'google_ad'
  AND u.register_date >= '2026-08-01'
GROUP BY u.user_id, u.phone_number, u.register_date;`;

      this.rawSqlCache = defaultDemoSql;
      this.templateSqlCache = defaultDemoSql
        .replace(/'google_ad'/g, '{{channel}}')
        .replace(/'2026-08-01'/g, '{{start_date}}');

      this.activeEditorTab = 'raw';
      this.sqlEditor.setValue(this.rawSqlCache);

      // Auto trigger initial mock AI analysis
      this.runMockAiAnalysis(false);
      setTimeout(() => this.refreshEditorHighlights(), 300);
    }
  }

  bindEvents() {
    // Navigation Back / Cancel
    this.container.querySelector('#studio-btn-back').onclick = () => window.AppRouter.navigate('catalog');
    this.container.querySelector('#studio-btn-cancel').onclick = () => {
      if (confirm('確定要放棄當前所有未儲存的變更並返回目錄？')) {
        window.AppRouter.navigate('catalog');
      }
    };

    // Editor Tab switch (Raw SQL vs Template SQL)
    const tabRaw = this.container.querySelector('#tab-editor-raw');
    const tabTemplate = this.container.querySelector('#tab-editor-template');

    tabRaw.onclick = () => {
      if (this.activeEditorTab === 'template') {
        this.templateSqlCache = this.sqlEditor.getValue();
        // Convert template {{param}} to mock values for raw runnable view
        let convertedRaw = this.templateSqlCache;
        (this.currentTemplate.parameters || []).forEach(p => {
          const val = p.defaultVal || "'SAMPLE'";
          convertedRaw = convertedRaw.split(`{{${p.name}}}`).join(val);
        });
        this.rawSqlCache = convertedRaw;
      }
      this.activeEditorTab = 'raw';
      tabRaw.classList.add('active');
      tabTemplate.classList.remove('active');
      this.sqlEditor.setValue(this.rawSqlCache);
      this.refreshEditorHighlights();
    };

    tabTemplate.onclick = () => {
      if (this.activeEditorTab === 'raw') {
        this.rawSqlCache = this.sqlEditor.getValue();
        if (!this.templateSqlCache) {
          this.templateSqlCache = this.rawSqlCache;
        }
      }
      this.activeEditorTab = 'template';
      tabTemplate.classList.add('active');
      tabRaw.classList.remove('active');
      this.sqlEditor.setValue(this.templateSqlCache);
      this.refreshEditorHighlights();
    };

    // Format SQL button
    this.container.querySelector('#btn-format-sql').onclick = () => {
      if (this.sqlEditor.editor) {
        this.sqlEditor.editor.getAction('editor.action.formatDocument')?.run();
        toast.info('SQL 程式碼已重新排版');
      }
    };

    // Type radio toggle
    this.container.querySelectorAll('input[name="tpl-type"]').forEach(radio => {
      radio.onchange = (e) => {
        this.container.querySelector('#group-departments').style.display = e.target.value === 'dept' ? 'block' : 'none';
      };
    });

    // ID live duplicate check
    const idInput = this.container.querySelector('#input-tpl-id');
    const idStatus = this.container.querySelector('#tpl-id-status');
    idInput.oninput = () => {
      const val = idInput.value.trim();
      if (!val) {
        idStatus.textContent = '';
        return;
      }
      const exists = store.checkIdExists(val, this.mode === 'edit' ? this.currentId : null);
      if (exists) {
        idStatus.style.color = 'var(--danger)';
        idStatus.textContent = '❌ ID 已存在重複！';
        idInput.classList.add('is-invalid');
      } else {
        idStatus.style.color = 'var(--success-text)';
        idStatus.textContent = '✓ ID 可使用';
        idInput.classList.remove('is-invalid');
      }
    };

    // AI Analyze Button
    this.container.querySelector('#btn-ai-analyze').onclick = () => {
      this.runMockAiAnalysis(true);
    };

    // Add Param Button
    this.container.querySelector('#btn-add-param').onclick = () => {
      this.addParameter({
        name: `param_${(this.currentTemplate.parameters || []).length + 1}`,
        type: 'String',
        defaultVal: '',
        required: true,
        desc: ''
      });
      this.renderParameters();
      this.renderMockParams();
    };

    // Console Tabs
    const tabTest = this.container.querySelector('#tab-console-test');
    const tabSim = this.container.querySelector('#tab-console-similarity');
    const bodyTest = this.container.querySelector('#console-body-test');
    const bodySim = this.container.querySelector('#console-body-similarity');

    tabTest.onclick = () => {
      tabTest.classList.add('active');
      tabSim.classList.remove('active');
      bodyTest.style.display = 'block';
      bodySim.style.display = 'none';
    };

    tabSim.onclick = () => {
      tabSim.classList.add('active');
      tabTest.classList.remove('active');
      bodySim.style.display = 'block';
      bodyTest.style.display = 'none';
      this.runSimilarityCheck();
    };

    this.container.querySelector('#btn-recheck-similarity').onclick = () => this.runSimilarityCheck();

    // Run Test Button
    this.container.querySelector('#btn-run-test').onclick = () => this.runMockSqlExecution();

    // Attachments Dropzone
    const dropzone = this.container.querySelector('#upload-dropzone');
    const fileInput = this.container.querySelector('#file-input-hidden');
    dropzone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        this.addAttachment({
          id: `att-${Date.now()}`,
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
          type: file.type,
          isSuccessScreenshot: true,
          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="%231e293b"/><text x="20" y="40" fill="%2310b981" font-family="monospace" font-size="16">✓ Executed OK (Manual Upload Proof)</text><rect x="20" y="60" width="560" height="210" fill="%230f172a" rx="6"/><text x="40" y="90" fill="%2394a3b8" font-family="monospace" font-size="13">Execution Screenshot Uploaded</text></svg>'
        });
        toast.success(`已上傳附件: ${file.name}`);
      }
    };

    // Save Draft
    this.container.querySelector('#studio-btn-save-draft').onclick = () => this.handleSave(false);

    // Submit Review
    this.container.querySelector('#studio-btn-submit-review').onclick = () => this.handleSave(true);

    // Init Splitter
    this.initSplitter();
  }

  /**
   * Init resizable splitter between left editor/console pane and right form pane
   */
  initSplitter() {
    const splitter = this.container.querySelector('#studio-splitter');
    const leftPane = this.container.querySelector('#studio-left-pane');
    const studioBody = this.container.querySelector('.studio-body');
    if (!splitter || !leftPane || !studioBody) return;

    let isDragging = false;

    const onMouseDown = (e) => {
      isDragging = true;
      splitter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const bodyRect = studioBody.getBoundingClientRect();
      const newLeftWidth = e.clientX - bodyRect.left;
      const totalWidth = bodyRect.width;

      const minLeft = 280;
      const minRight = 320;
      const maxLeft = totalWidth - minRight;

      if (newLeftWidth >= minLeft && newLeftWidth <= maxLeft) {
        const leftPercent = (newLeftWidth / totalWidth) * 100;
        leftPane.style.width = `${leftPercent}%`;
        // Trigger Monaco layout
        this.sqlEditor?.editor?.layout?.();
      }
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      splitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.sqlEditor?.editor?.layout?.();
    };

    splitter.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  runMockAiAnalysis(showToast = true) {
    const descArea = this.container.querySelector('#input-tpl-desc');
    const columnsBody = this.container.querySelector('#columns-table-body');

    // Skeleton Shimmer effect
    descArea.classList.add('shimmer-active');
    columnsBody.innerHTML = `
      <tr><td colspan="4"><div class="skeleton-line"></div></td></tr>
      <tr><td colspan="4"><div class="skeleton-line"></div></td></tr>
      <tr><td colspan="4"><div class="skeleton-line"></div></td></tr>
    `;

    setTimeout(() => {
      descArea.classList.remove('shimmer-active');

      const currentSql = this.sqlEditor ? this.sqlEditor.getValue() : this.templateSqlCache;

      // Robust SELECT clause projection parser (Parenthesis-aware)
      const mockColumns = [];
      const selectMatch = currentSql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);

      if (selectMatch) {
        const selectBody = selectMatch[1];
        const rawProjections = [];
        let currentItem = '';
        let parenDepth = 0;

        // Split by comma only outside of parentheses
        for (let i = 0; i < selectBody.length; i++) {
          const ch = selectBody[i];
          if (ch === '(') parenDepth++;
          else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

          if (ch === ',' && parenDepth === 0) {
            rawProjections.push(currentItem.trim());
            currentItem = '';
          } else {
            currentItem += ch;
          }
        }
        if (currentItem.trim()) rawProjections.push(currentItem.trim());

        rawProjections.forEach(proj => {
          const cleanProj = proj.replace(/--.*$/gm, '').trim();
          if (!cleanProj) return;

          let colDisplayName = '';
          let colType = 'VARCHAR(32)';
          let isPii = false;
          let sourceDesc = '';

          // Case 1: Expression with explicit "AS alias" -> e.g. "COUNT(DISTINCT a.activity_date) AS active_days_7d"
          const asMatch = cleanProj.match(/([\s\S]+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
          if (asMatch) {
            const expr = asMatch[1].trim();
            const alias = asMatch[2].trim();
            colDisplayName = alias;

            // Check if expr contains table alias like "u.register_date"
            const tableMatch = expr.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
            if (tableMatch) {
              const prefix = tableMatch[1];
              const origCol = tableMatch[2];
              sourceDesc = `[來源: ${prefix}] ${origCol} ➡️ ${alias}`;
              if (prefix === 'u' && (origCol.includes('phone') || origCol.includes('id_card') || origCol.includes('register') || origCol.includes('credit'))) {
                isPii = true;
                colDisplayName = `${prefix}.${origCol}`;
              }
            } else {
              sourceDesc = `[計算欄位] ${alias}`;
            }

            if (expr.toUpperCase().includes('COUNT')) colType = 'INTEGER';
            else if (expr.toUpperCase().includes('SUM') || expr.toUpperCase().includes('COALESCE')) colType = 'DECIMAL(12,2)';
            else if (alias.includes('date')) colType = 'DATE';
          }
          // Case 2: Direct column reference with table alias -> e.g. "u.user_id", "p.register_date"
          else {
            const dotMatch = cleanProj.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/i);
            if (dotMatch) {
              const prefix = dotMatch[1];
              const col = dotMatch[2];
              colDisplayName = `${prefix}.${col}`;
              sourceDesc = `[來源: ${prefix}] ${col}`;

              if (prefix === 'u' && (col.includes('phone') || col.includes('id_card') || col.includes('register') || col.includes('credit'))) {
                isPii = true;
              } else if (col.includes('phone') || col.includes('id_card') || col.includes('account')) {
                isPii = true;
              }

              if (col.includes('date')) colType = 'DATE';
              else if (col.includes('amount') || col.includes('revenue') || col.includes('price')) colType = 'DECIMAL(12,2)';
              else if (col.includes('id')) colType = 'VARCHAR(64)';
            } else {
              // Plain column
              const simpleCol = cleanProj.replace(/[^a-zA-Z0-9_]/g, '');
              colDisplayName = simpleCol || cleanProj;
              sourceDesc = `欄位 ${colDisplayName}`;
              if (colDisplayName.includes('phone') || colDisplayName.includes('id_card') || colDisplayName.includes('account')) {
                isPii = true;
              }
            }
          }

          if (colDisplayName && colDisplayName.toUpperCase() !== 'AS') {
            mockColumns.push({
              name: colDisplayName,
              type: colType,
              desc: `${sourceDesc}${isPii ? ' (敏感資訊)' : ''}`,
              aiSensitive: isPii,
              isPii: isPii,
              overrideReason: ''
            });
          }
        });
      }

      if (mockColumns.length === 0) {
        if (currentSql.includes('user_id')) mockColumns.push({ name: 'u.user_id', type: 'VARCHAR(64)', desc: '[來源: u] 用戶唯一識別號', aiSensitive: false, isPii: false, overrideReason: '' });
        if (currentSql.includes('phone')) mockColumns.push({ name: 'u.phone_number', type: 'VARCHAR(20)', desc: '[來源: u] 用戶聯絡電話', aiSensitive: true, isPii: true, overrideReason: '' });
        if (currentSql.includes('id_card')) mockColumns.push({ name: 'u.id_card_num', type: 'VARCHAR(30)', desc: '[來源: u] 身分證字號', aiSensitive: true, isPii: true, overrideReason: '' });
        if (currentSql.includes('register_date')) mockColumns.push({ name: 'u.register_date', type: 'DATE', desc: '[來源: u] 用戶註冊時間', aiSensitive: true, isPii: true, overrideReason: '' });
        if (currentSql.includes('total_revenue')) mockColumns.push({ name: 'total_revenue', type: 'DECIMAL(12,2)', desc: '消費交易總額 (NTD)', aiSensitive: false, isPii: false, overrideReason: '' });
      }

      this.currentTemplate.columns = mockColumns;
      this.renderColumns(mockColumns);

      // Auto generate description
      const generatedDesc = `【AI 自動生成業務描述】本 SQL 查詢主要針對目標資料庫執行多維度彙總分析，解析 ${mockColumns.map(c => c.name).slice(0, 3).join(', ')} 等關鍵指標，支援營運策略與系統報表調用。`;
      descArea.value = generatedDesc;
      this.currentTemplate.description = generatedDesc;

      // Auto detect parameters from {{param}} in SQL
      const matches = currentSql.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
      if (matches) {
        const foundParams = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))));
        const existingParamNames = (this.currentTemplate.parameters || []).map(p => p.name);
        foundParams.forEach(pName => {
          if (!existingParamNames.includes(pName)) {
            this.addParameter({
              name: pName,
              type: pName.includes('date') ? 'Date' : (pName.includes('num') || pName.includes('count') ? 'Number' : 'String'),
              defaultVal: pName.includes('date') ? '2026-08-01' : "'demo_val'",
              required: true,
              desc: `由 AI 自動識別之參數: ${pName}`
            });
          }
        });
        this.renderParameters();
        this.renderMockParams();
      }

      if (showToast) {
        toast.success('✨ AI AST 欄位解析與業務描述生成完畢！');
      }
    }, 750);
  }

  renderColumns(columns = []) {
    const tbody = this.container.querySelector('#columns-table-body');
    if (!tbody) return;

    if (columns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:12px;">尚無欄位資訊，可點擊上方 AI 重新解析</td></tr>`;
      return;
    }

    tbody.innerHTML = columns.map((col, idx) => {
      // Ensure aiSensitive is initialized based on isPii or property
      if (col.aiSensitive === undefined) {
        col.aiSensitive = !!col.isPii;
      }
      const isOverridden = col.aiSensitive && !col.isPii;

      return `
        <tr data-index="${idx}">
          <td><strong style="font-family: var(--font-mono);">${col.name}</strong></td>
          <td><span class="badge" style="background:#f1f5f9; color:#475569; font-family:var(--font-mono); font-size:11px;">${col.type || 'VARCHAR'}</span></td>
          <td>
            <input type="text" class="form-input form-input-sm col-desc-input" data-index="${idx}" value="${col.desc || ''}" style="padding: 3px 6px; font-size:12px;" />
            ${isOverridden ? `
              <div class="col-override-reason-box">
                <label>⚠ 系統判定敏感已被手動關閉，請補充解除理由：<span style="color:#dc2626;">*</span></label>
                <input type="text" class="col-override-reason-input" data-index="${idx}" placeholder="例：此欄位經脫敏處理或非實際個資..." value="${col.overrideReason || ''}" />
              </div>
            ` : ''}
          </td>
          <td style="text-align: center;">
            ${col.aiSensitive ? '<span style="color:#d97706; font-size:11px; font-weight:600;">敏感</span>' : '<span style="color:#94a3b8; font-size:11px;">一般</span>'}
          </td>
          <td style="text-align: center;">
            <label class="toggle-switch">
              <input type="checkbox" class="col-pii-toggle" data-index="${idx}" ${col.isPii ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </td>
        </tr>
      `;
    }).join('');

    // Bind events for columns
    tbody.querySelectorAll('.col-desc-input').forEach(input => {
      input.onchange = (e) => {
        const idx = e.target.dataset.index;
        this.currentTemplate.columns[idx].desc = e.target.value;
      };
    });

    tbody.querySelectorAll('.col-override-reason-input').forEach(input => {
      input.oninput = (e) => {
        const idx = e.target.dataset.index;
        this.currentTemplate.columns[idx].overrideReason = e.target.value;
      };
    });

    tbody.querySelectorAll('.col-pii-toggle').forEach(toggle => {
      toggle.onchange = (e) => {
        const idx = e.target.dataset.index;
        this.currentTemplate.columns[idx].isPii = e.target.checked;
        // Re-render columns to dynamically show/hide override reason box
        this.renderColumns(this.currentTemplate.columns);
        this.syncPiiList();
      };
    });
  }

  markColumnPii(fieldName, isPii = true) {
    if (!this.currentTemplate.columns) this.currentTemplate.columns = [];
    const col = this.currentTemplate.columns.find(c => c.name === fieldName);
    if (col) {
      col.isPii = isPii;
    } else {
      this.currentTemplate.columns.push({
        name: fieldName,
        type: 'VARCHAR',
        desc: '標記為敏感資訊',
        aiSensitive: isPii,
        isPii: isPii,
        overrideReason: ''
      });
    }
    this.renderColumns(this.currentTemplate.columns);
    this.syncPiiList();
  }

  syncPiiList() {
    this.currentTemplate.piiFields = (this.currentTemplate.columns || [])
      .filter(c => c.isPii)
      .map(c => c.name);
    this.refreshEditorHighlights();
  }

  addParameter(param) {
    if (!this.currentTemplate.parameters) this.currentTemplate.parameters = [];
    if (!this.currentTemplate.parameters.some(p => p.name === param.name)) {
      this.currentTemplate.parameters.push(param);
    }
    this.refreshEditorHighlights();
  }

  renderParameters(params = this.currentTemplate.parameters || []) {
    const container = this.container.querySelector('#params-list-container');
    if (!container) return;

    if (params.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:12px;">尚未建立參數，反白選取代碼或點擊「+ 新增參數」</div>`;
      return;
    }

    container.innerHTML = params.map((p, idx) => `
      <div class="param-item-card" data-index="${idx}">
        <div class="param-item-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:var(--primary); font-weight:700; font-family:var(--font-mono);">{{${p.name}}}</span>
          </div>
          <button class="btn btn-outline btn-xs btn-remove-param" data-index="${idx}" style="color:var(--danger); border-color:var(--danger-border);" title="刪除參數">✕</button>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:6px;">
          <div>
            <label style="font-size:11px; color:var(--text-secondary);">參數名稱</label>
            <input type="text" class="form-input form-input-sm param-name-input" data-index="${idx}" value="${p.name}" />
          </div>
          <div>
            <label style="font-size:11px; color:var(--text-secondary);">型態</label>
            <select class="form-select form-select-sm param-type-select" data-index="${idx}">
              <option value="String" ${p.type === 'String' ? 'selected' : ''}>String (字串)</option>
              <option value="Number" ${p.type === 'Number' ? 'selected' : ''}>Number (數值)</option>
              <option value="Date" ${p.type === 'Date' ? 'selected' : ''}>Date (日期)</option>
              <option value="List" ${p.type === 'List' ? 'selected' : ''}>List (清單)</option>
            </select>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:flex-end;">
          <div>
            <label style="font-size:11px; color:var(--text-secondary);">預設值 (Default)</label>
            <input type="text" class="form-input form-input-sm param-default-input" data-index="${idx}" value="${p.defaultVal || ''}" placeholder="如 'google_ad'" />
          </div>
          <label style="font-size:12px; display:flex; align-items:center; gap:4px; margin-bottom:6px; cursor:pointer;">
            <input type="checkbox" class="param-req-check" data-index="${idx}" ${p.required ? 'checked' : ''} />
            必填
          </label>
        </div>
      </div>
    `).join('');

    // Bind parameter inputs
    container.querySelectorAll('.btn-remove-param').forEach(btn => {
      btn.onclick = (e) => {
        const idx = e.currentTarget.dataset.index;
        this.currentTemplate.parameters.splice(idx, 1);
        this.renderParameters();
        this.renderMockParams();
      };
    });

    container.querySelectorAll('.param-name-input').forEach(inp => {
      inp.onchange = (e) => {
        this.currentTemplate.parameters[e.target.dataset.index].name = e.target.value.trim();
        this.renderMockParams();
      };
    });

    container.querySelectorAll('.param-type-select').forEach(sel => {
      sel.onchange = (e) => {
        this.currentTemplate.parameters[e.target.dataset.index].type = e.target.value;
      };
    });

    container.querySelectorAll('.param-default-input').forEach(inp => {
      inp.onchange = (e) => {
        this.currentTemplate.parameters[e.target.dataset.index].defaultVal = e.target.value;
        this.renderMockParams();
      };
    });

    container.querySelectorAll('.param-req-check').forEach(chk => {
      chk.onchange = (e) => {
        this.currentTemplate.parameters[e.target.dataset.index].required = e.target.checked;
      };
    });
  }

  renderMockParams() {
    const grid = this.container.querySelector('#mock-params-grid');
    if (!grid) return;

    const params = this.currentTemplate.parameters || [];
    if (params.length === 0) {
      grid.innerHTML = `<span style="color:var(--text-muted); font-size:11px;">無參數，可直接執行</span>`;
      return;
    }

    grid.innerHTML = params.map(p => `
      <div>
        <label style="font-size: 11px; font-weight:600; color: var(--text-secondary);">${p.name}:</label>
        <input type="text" class="form-input form-input-sm mock-param-val" data-name="${p.name}" value="${p.defaultVal ? p.defaultVal.replace(/'/g, '') : 'SAMPLE_VAL'}" style="padding: 4px 8px; font-size: 11px;" />
      </div>
    `).join('');
  }

  runMockSqlExecution() {
    const targetDb = this.container.querySelector('#test-target-db').value;
    const statusText = this.container.querySelector('#console-status-text');
    const resultOutput = this.container.querySelector('#test-result-output');

    statusText.textContent = `⏳ 正在連線 ${targetDb} 執行測試...`;
    resultOutput.innerHTML = `<div style="text-align:center; padding:16px; color:var(--primary); font-size:12px;">⚡ 查詢編譯與執行中...</div>`;

    setTimeout(() => {
      statusText.innerHTML = `✅ 執行成功 (耗時 <strong>18.2ms</strong>, 回傳 <strong>3</strong> 筆資料)`;
      resultOutput.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 11px; color: var(--success-text); background: var(--success-light); padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--success-border);">
          ✓ SQL 語法解析通過，目標資料庫 [${targetDb}] 回傳執行成功
        </div>
        <table class="result-table">
          <thead>
            <tr>
              <th>user_id</th>
              <th>phone_number</th>
              <th>register_date</th>
              <th>total_orders</th>
              <th>total_revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>U-108291</td>
              <td>0912***882</td>
              <td>2026-08-02</td>
              <td>8</td>
              <td>$4,520.00</td>
            </tr>
            <tr>
              <td>U-108295</td>
              <td>0933***109</td>
              <td>2026-08-03</td>
              <td>12</td>
              <td>$8,990.00</td>
            </tr>
            <tr>
              <td>U-108304</td>
              <td>0988***443</td>
              <td>2026-08-05</td>
              <td>3</td>
              <td>$1,200.00</td>
            </tr>
          </tbody>
        </table>
      `;

      // If user doesn't have an attachment yet, auto attach an execution proof
      if (!this.currentTemplate.attachments || this.currentTemplate.attachments.length === 0) {
        this.addAttachment({
          id: `att-auto-${Date.now()}`,
          name: `auto_test_proof_${targetDb}.png`,
          size: '180 KB',
          type: 'image/png',
          isSuccessScreenshot: true,
          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="%230f172a"/><text x="20" y="40" fill="%2310b981" font-family="monospace" font-size="16">✓ Executed OK on ' + targetDb + ' (18.2ms)</text><rect x="20" y="60" width="560" height="210" fill="%231e293b" rx="6"/><text x="40" y="90" fill="%2338bdf8" font-family="monospace" font-size="13">user_id | phone_number | total_orders | total_revenue</text><text x="40" y="120" fill="%23f8fafc" font-family="monospace" font-size="13">U-108291 | 0912***882 | 8 | $4,520.00</text></svg>'
        });
        toast.info('已自動擷取執行成功截圖並加入附件清單！');
      }

      toast.success(`目標庫 ${targetDb} 測試執行完畢！`);
    }, 600);
  }

  runSimilarityCheck() {
    const listContainer = this.container.querySelector('#similarity-results-list');
    if (!listContainer) return;

    const all = store.getAll().filter(t => t.id !== this.currentId);
    if (all.length === 0) {
      listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:16px;">庫內尚無其他 Template 可供比對</div>`;
      return;
    }

    // High fidelity similarity calculation mock
    const currentSql = (this.sqlEditor ? this.sqlEditor.getValue() : this.templateSqlCache).toLowerCase();

    const matches = all.map(t => {
      const otherSql = (t.templateSql || '').toLowerCase();
      // Simple Jaccard mock
      const wordsA = new Set(currentSql.split(/\s+/));
      const wordsB = new Set(otherSql.split(/\s+/));
      let intersection = 0;
      wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
      const union = new Set([...wordsA, ...wordsB]).size;
      const score = Math.round((intersection / (union || 1)) * 100);

      return {
        template: t,
        score: Math.min(95, Math.max(25, score + 40)) // Boost for realistic demo display
      };
    }).sort((a, b) => b.score - a.score);

    listContainer.innerHTML = matches.map(m => `
      <div class="similarity-item ${m.score >= 80 ? 'high-match' : ''}">
        <div>
          <div style="font-weight:600; font-size:12px; color:var(--text-primary);">
            [${m.template.id}] ${m.template.name}
          </div>
          <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
            建立者: ${m.template.author} ｜ 部門: ${(m.template.departments || []).join(', ') || '全公司'}
          </div>
          ${m.score >= 80 ? `<div style="font-size:11px; color:#b45309; font-weight:600; margin-top:3px;">⚠️ 相似度高於 80%，建議評估是否直接共用現有樣板！</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div class="match-percentage">${m.score}%</div>
          <div style="font-size:10px; color:var(--text-muted);">相似度</div>
        </div>
      </div>
    `).join('');
  }

  addAttachment(att) {
    if (!this.currentTemplate.attachments) this.currentTemplate.attachments = [];
    this.currentTemplate.attachments.push(att);
    this.renderAttachments(this.currentTemplate.attachments);
  }

  renderAttachments(attachments = []) {
    const list = this.container.querySelector('#upload-file-list');
    if (!list) return;

    if (attachments.length === 0) {
      list.innerHTML = `<div style="font-size:11px; color:var(--danger); margin-top:4px;">⚠️ 尚未上傳附件，送審必須包含至少 1 張執行成功截圖</div>`;
      return;
    }

    list.innerHTML = attachments.map((att, idx) => `
      <div class="upload-file-item" data-index="${idx}">
        <div class="upload-file-name" style="cursor:pointer;" data-action="preview" data-index="${idx}">
          <span>🖼️</span>
          <span>${att.name}</span>
          <span style="font-size:10px; color:var(--text-muted);">(${att.size})</span>
          ${att.isSuccessScreenshot ? `<span class="badge badge-approved" style="font-size:10px;">執行憑證</span>` : ''}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline btn-xs" data-action="preview" data-index="${idx}">預覽</button>
          <button class="btn btn-outline btn-xs btn-remove-att" data-index="${idx}" style="color:var(--danger);">✕</button>
        </div>
      </div>
    `).join('');

    // Bind preview lightbox & remove
    list.querySelectorAll('[data-action="preview"]').forEach(el => {
      el.onclick = () => {
        const att = attachments[el.dataset.index];
        ModalManager.showLightbox(att.url, `附件預覽: ${att.name}`);
      };
    });

    list.querySelectorAll('.btn-remove-att').forEach(btn => {
      btn.onclick = () => {
        this.currentTemplate.attachments.splice(btn.dataset.index, 1);
        this.renderAttachments(this.currentTemplate.attachments);
      };
    });
  }

  handleSave(isSubmitForReview = false) {
    if (this.activeEditorTab === 'template') {
      this.templateSqlCache = this.sqlEditor.getValue();
    } else {
      this.rawSqlCache = this.sqlEditor.getValue();
    }

    const tplId = this.container.querySelector('#input-tpl-id').value.trim();
    const tplName = this.container.querySelector('#input-tpl-name').value.trim();
    const tplDesc = this.container.querySelector('#input-tpl-desc').value.trim();
    const tplType = this.container.querySelector('input[name="tpl-type"]:checked').value;

    // Depts
    const selectedDepts = [];
    this.container.querySelectorAll('.dept-checkbox:checked').forEach(cb => selectedDepts.push(cb.value));

    // DBs
    const selectedDbs = [];
    this.container.querySelectorAll('.db-checkbox:checked').forEach(cb => selectedDbs.push(cb.value));

    // Validation
    if (!tplId) {
      toast.danger('請填寫 Template ID！');
      this.container.querySelector('#input-tpl-id').focus();
      return;
    }
    if (store.checkIdExists(tplId, this.mode === 'edit' ? this.currentId : null)) {
      toast.danger('Template ID 已存在重複，請更改！');
      this.container.querySelector('#input-tpl-id').focus();
      return;
    }
    if (!tplName) {
      toast.danger('請填寫完整的業務名稱！');
      this.container.querySelector('#input-tpl-name').focus();
      return;
    }
    if (tplType === 'dept' && selectedDepts.length === 0) {
      toast.danger('選擇特定部門專用時，必須至少勾選一個部門！');
      return;
    }
    if (selectedDbs.length === 0) {
      toast.danger('請至少勾選一個綁定目標資料庫！');
      return;
    }
    if (!this.templateSqlCache.trim()) {
      toast.danger('SQL Template 內容不可為空！');
      return;
    }
    if (!tplDesc) {
      toast.danger('請填寫 SQL 業務描述（可使用 AI 重新解析生成）！');
      this.container.querySelector('#input-tpl-desc').focus();
      return;
    }

    // Check override reasons for columns where AI marked sensitive but user unchecked
    const columns = this.currentTemplate.columns || [];
    const missingReasonCols = columns.filter(c => c.aiSensitive && !c.isPii && (!c.overrideReason || !c.overrideReason.trim()));
    if (missingReasonCols.length > 0) {
      toast.danger(`欄位 [${missingReasonCols.map(c => c.name).join(', ')}] 已解除系統敏感標記，必須填寫解除理由！`);
      return;
    }

    // If submitting for review, check attachments and impact
    if (isSubmitForReview) {
      const hasProof = (this.currentTemplate.attachments || []).some(a => a.isSuccessScreenshot);
      if (!hasProof) {
        toast.danger('送出審核時，必須包含至少一張【執行成功截圖】憑證！');
        return;
      }

      if (this.mode === 'edit') {
        const impactConfirmed = this.container.querySelector('#chk-impact-confirmed')?.checked;
        if (!impactConfirmed) {
          toast.warning('請勾選下游影響確認 Checkbox！');
          return;
        }
      }
    }

    // Save Data Object
    const payload = {
      id: tplId,
      name: tplName,
      type: tplType,
      departments: tplType === 'dept' ? selectedDepts : ['全公司'],
      databases: selectedDbs,
      templateSql: this.templateSqlCache,
      rawSql: this.rawSqlCache || this.templateSqlCache,
      description: tplDesc,
      columns: this.currentTemplate.columns || [],
      parameters: this.currentTemplate.parameters || [],
      piiFields: (this.currentTemplate.columns || []).filter(c => c.isPii).map(c => c.name),
      attachments: this.currentTemplate.attachments || [],
      reviewStatus: isSubmitForReview ? 'In Review' : (this.mode === 'edit' ? this.currentTemplate.reviewStatus : 'Draft'),
      usageStatus: this.mode === 'edit' ? (isSubmitForReview ? 'Disabled' : this.currentTemplate.usageStatus) : 'Disabled'
    };

    store.saveTemplate(payload);

    if (isSubmitForReview) {
      toast.success(`Template ${tplId} 已成功送出審核！`);
      window.AppRouter.navigate('review', { id: tplId });
    } else {
      toast.success(`Template ${tplId} 草稿已儲存`);
      window.AppRouter.navigate('catalog');
    }
  }
}
