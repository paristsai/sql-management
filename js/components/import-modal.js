/**
 * Import Preview Workbench Modal Component (Clean Enterprise Style - No Emoji)
 * Supports 3 Display Modes: Floating Dialog / Fullscreen Overlay / Full Workbench View
 */

import { store } from '../store.js';
import { toast } from './toast.js';
import { SqlEditor } from './editor.js';

export class ImportPreviewModal {
  constructor() {
    this.items = [];
    this.currentIndex = 0;
    this.activeEditorTab = 'raw'; // 'raw' | 'template'
    this.highlightEnabled = true;
    this.editor = null;
    this.isOpen = false;
    this.displayMode = localStorage.getItem('import_preview_mode') || 'floating'; // 'floating' | 'fullscreen' | 'workbench'
    this.onCloseCallback = null;

    this.overlayElement = null;
    this.containerElement = null;
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);

    this.createDom();
  }

  createDom() {
    let existing = document.getElementById('import-preview-modal-overlay');
    if (existing) {
      this.overlayElement = existing;
      this.containerElement = existing.querySelector('.import-modal-container');
      return;
    }

    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'import-modal-overlay';
    this.overlayElement.id = 'import-preview-modal-overlay';

    this.overlayElement.innerHTML = `
      <div class="import-modal-container">
        <!-- Top Bar -->
        <div class="import-modal-header">
          <div class="import-modal-header-left">
            <span class="badge" style="background:#f1f5f9;color:#334155;font-weight:600;font-size:11px;">匯入檢閱</span>
            <div class="import-modal-title">
              SQL Template 批次匯入預覽
              <span class="import-badge-count" id="import-modal-total-badge">共 0 筆</span>
            </div>
          </div>

          <div class="import-modal-header-right">
            <div class="import-mode-switcher-group" style="white-space: nowrap; flex-shrink: 0;">
              <label for="import-view-mode-select" style="font-size: 11px; white-space: nowrap; flex-shrink: 0;">展示模式:</label>
              <select class="form-select form-select-xs" id="import-view-mode-select" style="font-size: 11px; padding: 2px 6px; width: auto;">
                <option value="floating">懸浮彈窗 (Dialog)</option>
                <option value="fullscreen">滿版全螢幕 (Overlay)</option>
                <option value="workbench">工作台整合模式 (Studio)</option>
              </select>
            </div>
            <button class="btn btn-outline btn-xs" id="btn-close-import-modal" title="關閉預覽">✕</button>
          </div>
        </div>

        <!-- Tabs & Nav Navigation Bar -->
        <div class="import-tabs-bar">
          <div class="import-nav-controls">
            <button class="import-nav-btn" id="btn-import-prev" title="切換至上一個 Template (快捷鍵 ←)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="import-counter-badge" id="import-counter-text">1 / 1</span>
            <button class="import-nav-btn" id="btn-import-next" title="切換至下一個 Template (快捷鍵 →)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="import-tabs-scroll-area" id="import-tabs-container">
            <!-- Dynamic Tabs -->
          </div>

          <div class="import-shortcut-hint">
            <span>快捷鍵:</span>
            <span class="import-shortcut-key">←</span>
            <span class="import-shortcut-key">→</span>
          </div>
        </div>

        <!-- Main Workbench Split Body -->
        <div class="import-workbench-body">
          <!-- Left Pane: Monaco Editor & Toolbar -->
          <div class="import-left-pane">
            <div class="import-editor-toolbar">
              <div class="import-editor-tabs">
                <button class="import-editor-tab active" id="import-tab-editor-raw">Raw SQL</button>
                <button class="import-editor-tab" id="import-tab-editor-template">SQL Template</button>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button class="btn btn-outline btn-xs" id="import-btn-highlight-toggle" title="切換敏感欄位與動態參數高亮">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span>高亮標記</span>
                </button>
                <button class="btn btn-outline btn-xs" id="import-btn-format-sql" title="格式化 SQL">格式化</button>
              </div>
            </div>
            <div class="import-monaco-wrapper">
              <div id="import-monaco-container"></div>
            </div>
          </div>

          <!-- Right Pane: Metadata & Form Controls -->
          <div class="import-right-pane" id="import-right-pane-content">
            <!-- Form will be populated dynamically -->
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="import-modal-footer">
          <div class="import-footer-left-info" id="import-footer-info">
            <span id="import-footer-status-desc">請逐筆檢視 SQL 與中繼資料，確認無誤後儲存或送審。</span>
          </div>
          <div class="import-footer-actions">
            <button class="btn btn-outline btn-sm" id="btn-import-modal-cancel">關閉離開</button>
            <button class="btn btn-secondary btn-sm" id="btn-import-save-draft">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              儲存草稿 (當前)
            </button>
            <button class="btn btn-primary btn-sm" id="btn-import-submit-review">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              送出審核 (當前)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlayElement);
    this.containerElement = this.overlayElement.querySelector('.import-modal-container');
    this.bindStaticEvents();
  }

  bindStaticEvents() {
    const btnClose = this.overlayElement.querySelector('#btn-close-import-modal');
    const btnCancel = this.overlayElement.querySelector('#btn-import-modal-cancel');
    if (btnClose) btnClose.onclick = () => this.close();
    if (btnCancel) btnCancel.onclick = () => this.close();

    const btnPrev = this.overlayElement.querySelector('#btn-import-prev');
    const btnNext = this.overlayElement.querySelector('#btn-import-next');
    if (btnPrev) btnPrev.onclick = () => this.prev();
    if (btnNext) btnNext.onclick = () => this.next();

    const tabRaw = this.overlayElement.querySelector('#import-tab-editor-raw');
    const tabTpl = this.overlayElement.querySelector('#import-tab-editor-template');
    if (tabRaw) tabRaw.onclick = () => this.switchEditorTab('raw');
    if (tabTpl) tabTpl.onclick = () => this.switchEditorTab('template');

    const btnHighlight = this.overlayElement.querySelector('#import-btn-highlight-toggle');
    if (btnHighlight) {
      btnHighlight.onclick = () => {
        this.highlightEnabled = !this.highlightEnabled;
        btnHighlight.classList.toggle('active', this.highlightEnabled);
        this.applyHighlights();
      };
    }

    const btnFormat = this.overlayElement.querySelector('#import-btn-format-sql');
    if (btnFormat) btnFormat.onclick = () => this.formatSql();

    const btnSave = this.overlayElement.querySelector('#btn-import-save-draft');
    const btnSubmit = this.overlayElement.querySelector('#btn-import-submit-review');
    if (btnSave) btnSave.onclick = () => this.saveCurrentItem(false);
    if (btnSubmit) btnSubmit.onclick = () => this.saveCurrentItem(true);

    // Mode Switcher
    const modeSelect = this.overlayElement.querySelector('#import-view-mode-select');
    if (modeSelect) {
      modeSelect.onchange = () => {
        this.setDisplayMode(modeSelect.value);
      };
    }
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
    localStorage.setItem('import_preview_mode', mode);

    const modeSelect = this.overlayElement.querySelector('#import-view-mode-select');
    if (modeSelect) modeSelect.value = mode;

    if (mode === 'workbench') {
      // Transition to full Studio View with batch buffer
      this.close();
      if (window.AppRouter) {
        window.AppRouter.navigate('studio', {
          mode: 'batch_import',
          items: this.items,
          currentIndex: this.currentIndex
        });
      }
    } else if (mode === 'fullscreen') {
      this.overlayElement.classList.add('mode-fullscreen');
    } else {
      // floating
      this.overlayElement.classList.remove('mode-fullscreen');
    }
  }

  async open(validatedItems, onCloseCallback = null) {
    if (!validatedItems || validatedItems.length === 0) return;
    this.items = validatedItems;
    this.currentIndex = 0;
    this.activeEditorTab = 'raw';
    this.onCloseCallback = onCloseCallback;

    // Check preferred display mode
    const preferredMode = localStorage.getItem('import_preview_mode') || 'floating';
    if (preferredMode === 'workbench') {
      if (window.AppRouter) {
        window.AppRouter.navigate('studio', {
          mode: 'batch_import',
          items: this.items,
          currentIndex: 0
        });
      }
      return;
    }

    this.isOpen = true;
    this.setDisplayMode(preferredMode);

    // Show overlay
    this.overlayElement.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Add keydown listener
    window.addEventListener('keydown', this.boundKeyDownHandler);

    // Init Monaco editor inside modal
    await this.initMonaco();

    // Render tabs & load first item
    this.renderTabs();
    this.loadCurrentItem();
  }

  close() {
    this.isOpen = false;
    this.overlayElement.classList.remove('active');
    document.body.style.overflow = '';
    window.removeEventListener('keydown', this.boundKeyDownHandler);

    if (this.editor) {
      this.editor.hidePopover();
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  handleKeyDown(e) {
    if (!this.isOpen) return;
    const targetTag = e.target.tagName.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.next();
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  async initMonaco() {
    if (this.editor) return;

    const monacoContainer = this.overlayElement.querySelector('#import-monaco-container');
    this.editor = new SqlEditor(monacoContainer, {
      onContentChanged: (content) => {
        const item = this.getCurrentItem();
        if (!item) return;
        if (this.activeEditorTab === 'raw') {
          item.rawSql = content;
        } else {
          item.templateSql = content;
        }
        this.validateCurrentItem();
      },
      onParamExtracted: (param) => {
        const item = this.getCurrentItem();
        if (!item) return;
        if (!item.parameters) item.parameters = [];
        if (!item.parameters.some(p => p.name === param.name)) {
          item.parameters.push(param);
          this.renderRightPane();
          this.applyHighlights();
          toast.success(`已加入動態參數 {{${param.name}}}`);
        }
      },
      onPiiMarked: (fieldName) => {
        const item = this.getCurrentItem();
        if (!item) return;
        if (!item.piiFields) item.piiFields = [];
        if (!item.piiFields.includes(fieldName)) {
          item.piiFields.push(fieldName);
          this.renderRightPane();
          this.applyHighlights();
          toast.info(`已標記敏感欄位：${fieldName}`);
        }
      }
    });

    await this.editor.init('');
  }

  getCurrentItem() {
    return this.items[this.currentIndex] || null;
  }

  renderTabs() {
    const tabsContainer = this.overlayElement.querySelector('#import-tabs-container');
    const totalBadge = this.overlayElement.querySelector('#import-modal-total-badge');
    const counterText = this.overlayElement.querySelector('#import-counter-text');
    const btnPrev = this.overlayElement.querySelector('#btn-import-prev');
    const btnNext = this.overlayElement.querySelector('#btn-import-next');

    totalBadge.textContent = `共 ${this.items.length} 筆`;
    counterText.textContent = `${this.currentIndex + 1} / ${this.items.length}`;

    btnPrev.disabled = this.currentIndex === 0;
    btnNext.disabled = this.currentIndex === this.items.length - 1;

    tabsContainer.innerHTML = this.items.map((item, idx) => {
      const isActive = idx === this.currentIndex;
      const hasErrors = item.validationErrors && item.validationErrors.length > 0;
      
      let statusDotClass = 'status-dot-pending';
      let statusClass = '';
      if (item.isSaved) {
        statusDotClass = 'status-dot-saved';
        statusClass = 'is-saved';
      } else if (hasErrors) {
        statusDotClass = 'status-dot-error';
        statusClass = 'has-error';
      }

      return `
        <button class="import-tab-pill ${isActive ? 'active' : ''} ${statusClass}" data-index="${idx}">
          <span class="status-dot ${statusDotClass}"></span>
          <span class="import-tab-title" title="${this.escapeHtml(item.name || item.id)}">
            ${idx + 1}. ${this.escapeHtml(item.name || item.id)}
          </span>
        </button>
      `;
    }).join('');

    tabsContainer.querySelectorAll('.import-tab-pill').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.goTo(idx);
      };
    });

    const activeTabEl = tabsContainer.querySelector('.import-tab-pill.active');
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }

  loadCurrentItem() {
    const item = this.getCurrentItem();
    if (!item) return;

    this.validateCurrentItem(false);
    this.updateEditorTabUI();

    const content = this.activeEditorTab === 'raw' ? (item.rawSql || '') : (item.templateSql || '');
    if (this.editor) {
      this.editor.setValue(content);
      this.applyHighlights();
    }

    this.renderRightPane();
    this.updateFooter();
    this.renderTabs();
  }

  switchEditorTab(tab) {
    this.activeEditorTab = tab;
    this.updateEditorTabUI();
    const item = this.getCurrentItem();
    if (!item || !this.editor) return;

    const content = tab === 'raw' ? (item.rawSql || '') : (item.templateSql || '');
    this.editor.setValue(content);
    this.applyHighlights();
  }

  updateEditorTabUI() {
    const tabRaw = this.overlayElement.querySelector('#import-tab-editor-raw');
    const tabTpl = this.overlayElement.querySelector('#import-tab-editor-template');
    if (tabRaw) tabRaw.classList.toggle('active', this.activeEditorTab === 'raw');
    if (tabTpl) tabTpl.classList.toggle('active', this.activeEditorTab === 'template');
  }

  applyHighlights() {
    if (!this.editor) return;
    const item = this.getCurrentItem();
    if (!item || !this.highlightEnabled) {
      this.editor.clearHighlights();
      return;
    }

    this.editor.updateHighlights(
      item.piiFields || [],
      item.parameters || [],
      this.activeEditorTab
    );
  }

  validateCurrentItem(triggerTabRender = true) {
    const item = this.getCurrentItem();
    if (!item) return;

    const errors = [];
    const id = (item.id || '').trim();
    if (!id) {
      errors.push('Template ID 不可為空');
    } else {
      const existingInStore = store.getById(id);
      if (existingInStore && !item.isSaved) {
        errors.push(`Template ID「${id}」與資料庫既有樣板衝突，請修改！`);
      }
    }

    if (!item.name || !item.name.trim()) {
      errors.push('樣板名稱不可為空');
    }

    if (!item.rawSql && !item.templateSql) {
      errors.push('SQL 語句不可為空');
    }

    item.validationErrors = errors;
    if (triggerTabRender) {
      this.renderTabs();
      this.updateFooter();
    }
  }

  renderRightPane() {
    const container = this.overlayElement.querySelector('#import-right-pane-content');
    const item = this.getCurrentItem();
    if (!item) return;

    const hasErrors = item.validationErrors && item.validationErrors.length > 0;
    const errorHtml = hasErrors ? `
      <div class="import-validation-banner error">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <strong>校驗提醒：</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0;">
            ${item.validationErrors.map(err => `<li>${this.escapeHtml(err)}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : (item.isSaved ? `
      <div class="import-validation-banner success">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>已成功${item.saveStatus === 'review' ? '送出審核' : '儲存為草稿'}！仍可繼續修改後再次儲存。</span>
      </div>
    ` : '');

    const depts = ['數據工程部', '營運企劃部', '財務會計部', '法務合規部', '產品研發部'];
    const dbs = ['DBName1', 'DBName2', 'DBName3', 'DBName4', 'DBName5'];

    container.innerHTML = `
      ${errorHtml}

      <!-- Basic Metadata Card -->
      <div class="import-meta-card">
        <div class="import-meta-card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          基本中繼資料 (Metadata)
        </div>

        <div class="import-form-grid">
          <div class="import-form-group">
            <label class="import-form-label required">Template ID (唯一識別碼)</label>
            <input type="text" class="form-input form-input-sm" id="import-field-id" value="${this.escapeHtml(item.id || '')}" placeholder="例如 TPL_USER_GROWTH" />
          </div>

          <div class="import-form-group">
            <label class="import-form-label required">樣板名稱</label>
            <input type="text" class="form-input form-input-sm" id="import-field-name" value="${this.escapeHtml(item.name || '')}" placeholder="輸入易懂的樣板名稱" />
          </div>

          <div class="import-form-group">
            <label class="import-form-label">資產範圍類型</label>
            <select class="form-select form-select-sm" id="import-field-type">
              <option value="dept" ${item.type === 'dept' ? 'selected' : ''}>部門專用 (Department)</option>
              <option value="company" ${item.type === 'company' ? 'selected' : ''}>全公司通用 (Enterprise)</option>
            </select>
          </div>

          <div class="import-form-group">
            <label class="import-form-label">適用資料庫</label>
            <select class="form-select form-select-sm" id="import-field-db">
              ${dbs.map(db => `
                <option value="${db}" ${(item.databases && item.databases.includes(db)) ? 'selected' : ''}>${db}</option>
              `).join('')}
            </select>
          </div>

          <div class="import-form-group col-span-2">
            <label class="import-form-label">適用部門</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
              ${depts.map(dept => {
                const checked = item.departments && item.departments.includes(dept);
                return `
                  <label style="font-size: 11px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" class="import-dept-cb" value="${dept}" ${checked ? 'checked' : ''}>
                    ${dept}
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div class="import-form-group col-span-2">
            <label class="import-form-label">業務說明與使用情境</label>
            <textarea class="form-textarea" id="import-field-desc" rows="2" style="font-size: 12px;" placeholder="說明此 SQL 查詢的目的與使用場景...">${this.escapeHtml(item.description || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Parameters & PII Card -->
      <div class="import-meta-card">
        <div class="import-meta-card-title" style="justify-content: space-between;">
          <div style="display:flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            動態參數與敏感欄位 (${(item.parameters || []).length} 個參數 / ${(item.piiFields || []).length} 個敏感欄位)
          </div>
          <button class="btn btn-outline btn-xs" id="btn-import-add-param">+ 參數</button>
        </div>

        <!-- Parameters Table -->
        ${(item.parameters && item.parameters.length > 0) ? `
          <table class="import-params-table">
            <thead>
              <tr>
                <th>參數名稱</th>
                <th>類型</th>
                <th>預設值</th>
                <th>必填</th>
                <th style="width: 40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${item.parameters.map((p, pIdx) => `
                <tr>
                  <td><code style="color:var(--primary);font-weight:600;">{{${this.escapeHtml(p.name)}}}</code></td>
                  <td>${this.escapeHtml(p.type || 'String')}</td>
                  <td>${this.escapeHtml(p.defaultVal || '-')}</td>
                  <td>${p.required ? '<span style="color:var(--danger)">是</span>' : '否'}</td>
                  <td>
                    <button class="btn btn-outline btn-xs btn-remove-param" data-index="${pIdx}" style="padding:1px 5px;color:var(--danger);">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px 0;">
            尚未設定動態參數。可在左側選取 SQL 代碼並點擊「轉為動態參數」快速設定。
          </div>
        `}

        <!-- PII Badges -->
        <div style="margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">敏感資料欄位標記:</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${(item.piiFields && item.piiFields.length > 0) ? item.piiFields.map((field, fIdx) => `
              <span class="badge" style="background:#fef2f2;color:#991b1b;border:1px solid #fee2e2;padding:3px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">
                ${this.escapeHtml(field)}
                <span class="btn-remove-pii" data-index="${fIdx}" style="cursor:pointer;font-weight:bold;margin-left:2px;">✕</span>
              </span>
            `).join('') : `
              <span style="font-size: 11px; color: var(--text-muted);">無標記之敏感欄位</span>
            `}
          </div>
        </div>
      </div>
    `;

    this.bindRightPaneEvents();
  }

  bindRightPaneEvents() {
    const item = this.getCurrentItem();
    if (!item) return;

    const inputId = this.overlayElement.querySelector('#import-field-id');
    if (inputId) {
      inputId.oninput = () => {
        item.id = inputId.value.trim();
        this.validateCurrentItem(true);
      };
    }

    const inputName = this.overlayElement.querySelector('#import-field-name');
    if (inputName) {
      inputName.oninput = () => {
        item.name = inputName.value.trim();
        this.validateCurrentItem(true);
      };
    }

    const selectType = this.overlayElement.querySelector('#import-field-type');
    if (selectType) {
      selectType.onchange = () => {
        item.type = selectType.value;
      };
    }

    const selectDb = this.overlayElement.querySelector('#import-field-db');
    if (selectDb) {
      selectDb.onchange = () => {
        item.databases = [selectDb.value];
      };
    }

    this.overlayElement.querySelectorAll('.import-dept-cb').forEach(cb => {
      cb.onchange = () => {
        const checked = Array.from(this.overlayElement.querySelectorAll('.import-dept-cb:checked')).map(el => el.value);
        item.departments = checked.length ? checked : ['數據工程部'];
      };
    });

    const inputDesc = this.overlayElement.querySelector('#import-field-desc');
    if (inputDesc) {
      inputDesc.oninput = () => {
        item.description = inputDesc.value;
      };
    }

    this.overlayElement.querySelectorAll('.btn-remove-param').forEach(btn => {
      btn.onclick = () => {
        const pIdx = parseInt(btn.dataset.index, 10);
        item.parameters.splice(pIdx, 1);
        this.renderRightPane();
        this.applyHighlights();
      };
    });

    this.overlayElement.querySelectorAll('.btn-remove-pii').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const fIdx = parseInt(btn.dataset.index, 10);
        item.piiFields.splice(fIdx, 1);
        this.renderRightPane();
        this.applyHighlights();
      };
    });

    const btnAddParam = this.overlayElement.querySelector('#btn-import-add-param');
    if (btnAddParam) {
      btnAddParam.onclick = () => {
        const paramName = prompt('請輸入新參數名稱 (例如 client_id):');
        if (!paramName) return;
        const clean = paramName.trim().replace(/[{}]/g, '');
        if (!clean) return;
        if (!item.parameters) item.parameters = [];
        if (item.parameters.some(p => p.name === clean)) {
          toast.warning(`參數 {{${clean}}} 已存在`);
          return;
        }
        item.parameters.push({
          name: clean,
          type: 'String',
          defaultVal: '',
          required: true,
          desc: ''
        });
        this.renderRightPane();
        this.applyHighlights();
      };
    }
  }

  updateFooter() {
    const item = this.getCurrentItem();
    const statusDesc = this.overlayElement.querySelector('#import-footer-status-desc');
    const btnSave = this.overlayElement.querySelector('#btn-import-save-draft');
    const btnSubmit = this.overlayElement.querySelector('#btn-import-submit-review');

    if (!item) return;

    const hasErrors = item.validationErrors && item.validationErrors.length > 0;
    if (hasErrors) {
      statusDesc.innerHTML = `<span style="color:var(--danger);font-weight:600;">當前樣板有未通過之校驗項目，請修正後儲存。</span>`;
      btnSubmit.disabled = true;
    } else if (item.isSaved) {
      statusDesc.innerHTML = `<span style="color:var(--success);font-weight:600;">當前樣板已於此工作階段儲存 (${item.saveStatus === 'review' ? '送審中' : '草稿'})</span>`;
      btnSubmit.disabled = false;
    } else {
      statusDesc.innerHTML = `<span>檢閱第 ${this.currentIndex + 1} 筆樣板：確認中繼資料與 SQL 語法正確即可執行儲存。</span>`;
      btnSubmit.disabled = false;
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.goTo(this.currentIndex - 1);
    }
  }

  next() {
    if (this.currentIndex < this.items.length - 1) {
      this.goTo(this.currentIndex + 1);
    }
  }

  goTo(index) {
    if (index < 0 || index >= this.items.length) return;
    this.currentIndex = index;
    this.loadCurrentItem();
  }

  formatSql() {
    if (!this.editor) return;
    const item = this.getCurrentItem();
    if (!item) return;

    let content = this.editor.getValue();
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE'];
    
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      content = content.replace(regex, kw);
    });

    this.editor.setValue(content);
    if (this.activeEditorTab === 'raw') {
      item.rawSql = content;
    } else {
      item.templateSql = content;
    }
    toast.success('SQL 已完成基礎美化格式化');
  }

  saveCurrentItem(submitForReview = false) {
    const item = this.getCurrentItem();
    if (!item) return;

    this.validateCurrentItem(true);
    if (item.validationErrors && item.validationErrors.length > 0) {
      toast.error(`無法儲存：${item.validationErrors[0]}`);
      this.renderRightPane();
      return;
    }

    const payload = {
      id: item.id,
      name: item.name,
      type: item.type || 'dept',
      departments: item.departments || ['數據工程部'],
      databases: item.databases || ['DBName1'],
      rawSql: item.rawSql || '',
      templateSql: item.templateSql || item.rawSql || '',
      description: item.description || '',
      columns: item.columns || [],
      parameters: item.parameters || [],
      piiFields: item.piiFields || [],
      attachments: item.attachments || [],
      reviewStatus: submitForReview ? 'In Review' : 'Draft',
      usageStatus: 'Disabled',
      author: store.currentAuthor || 'Current User (Imported)'
    };

    store.saveTemplate(payload);

    if (submitForReview) {
      store.submitForReview(item.id);
    }

    item.isSaved = true;
    item.saveStatus = submitForReview ? 'review' : 'draft';

    toast.success(`成功${submitForReview ? '送出審核' : '儲存為草稿'}：${item.name} (${item.id})`);
    
    this.renderTabs();
    this.renderRightPane();
    this.updateFooter();
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export const importPreviewModal = new ImportPreviewModal();
