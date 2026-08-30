/**
 * Review & Audit Center View Controller
 * Redesigned with Ant Design Enterprise Tabs & Full Review Modal
 */

import { store } from '../store.js';
import { toast } from '../components/toast.js';
import { SqlDiffViewer, SqlReadOnlyEditor } from '../components/editor.js';
import { ModalManager } from '../components/modal.js';

export class ReviewView {
  constructor(container) {
    this.container = container;
    this.activeTab = 'assigned'; // 'assigned' | 'my' | 'all'
    this.modalTemplateId = null;
    this.modalDiffViewer = null;
    this.modalReadOnlyEditor = null;
    this.modalActiveTab = 'raw'; // 'raw' | 'template'
    this.modalDiffEnabled = false;
    this.filterKeyword = '';
    this.filterStatus = 'all';
  }

  async init(params = {}) {
    this.renderLayout();
    this.bindEvents();

    store.subscribe(() => {
      this.renderStats();
      this.updateTabBadges();
      this.renderTable();
      if (this.modalTemplateId) {
        this.updateReadOnlyInfoPane(this.modalTemplateId);
        this.renderModalSteps(store.getById(this.modalTemplateId));
      }
    });

    if (params.id) {
      this.openReviewModal(params.id);
    }
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="review-container">
        <!-- Review Page Header -->
        <div class="review-page-header">
          <div class="review-page-title-group">
            <h1>審核與治理中心 (Review & Governance)</h1>
            <p>集中審核 SQL 樣板、PII 隱私安全檢查、資料庫查詢效能比對與上線發布覆核</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-outline btn-sm" id="btn-review-refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              重新整理
            </button>
            <button class="btn btn-primary btn-sm" id="btn-review-goto-studio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              提交新 SQL 審核
            </button>
          </div>
        </div>

        <!-- Stats Overview Cards -->
        <div class="review-stats-grid" id="review-stats-grid">
          <!-- Populated dynamically -->
        </div>

        <!-- Ant Design Main Card with 3 Tabs -->
        <div class="review-main-card">
          <!-- Ant Design Nav Tabs -->
          <div class="ant-tabs-nav">
            <button class="ant-tab-item active" data-tab="assigned">
              <span>待我審核 (Assigned)</span>
              <span class="ant-tab-badge highlight" id="tab-badge-assigned">0</span>
            </button>
            <button class="ant-tab-item" data-tab="my">
              <span>我的送審紀錄</span>
              <span class="ant-tab-badge" id="tab-badge-my">0</span>
            </button>
            <button class="ant-tab-item" data-tab="all">
              <span>全部審核清單</span>
              <span class="ant-tab-badge" id="tab-badge-all">0</span>
            </button>
          </div>

          <!-- Tab Content Body -->
          <div class="review-tab-content">
            <!-- Toolbar & Filters -->
            <div class="review-table-toolbar">
              <div class="review-toolbar-left">
                <div class="search-input-wrapper review-search-input">
                  <span class="search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </span>
                  <input type="text" class="form-input search-input" id="review-search-input" placeholder="搜尋 ID、名稱、SQL、申請人或部門..." />
                </div>
                <select class="form-select review-filter-select" id="review-status-filter">
                  <option value="all">所有審核狀態</option>
                  <option value="In Review">審核中 (In Review)</option>
                  <option value="Approved">已核准 (Approved)</option>
                  <option value="Draft">草稿/已退回 (Draft)</option>
                </select>
              </div>
              <div class="text-xs text-secondary" id="review-table-count-info">
                顯示共 0 筆紀錄 (點擊任一列開啟全功能審核視窗)
              </div>
            </div>

            <!-- Ant Table Wrapper -->
            <div class="ant-table-wrapper">
              <table class="ant-table">
                <thead>
                  <tr>
                    <th style="width: 140px;">Template ID</th>
                    <th style="min-width: 220px;">SQL 樣板名稱與用途</th>
                    <th style="width: 140px;">適用部門</th>
                    <th style="width: 120px;">目標資料庫</th>
                    <th style="width: 110px;">敏感資訊</th>
                    <th style="width: 150px;">申請人 / 指派審核</th>
                    <th style="width: 110px;">審核狀態</th>
                    <th style="width: 140px;">最後更新時間</th>
                  </tr>
                </thead>
                <tbody id="review-table-tbody">
                  <!-- Injected dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderStats();
    this.updateTabBadges();
    this.renderTable();
  }

  renderStats() {
    const all = store.getAll();
    const currentUser = store.getCurrentUser();

    const pendingAssigned = all.filter(t => t.reviewStatus === 'In Review' && (t.assignee === currentUser || t.assignee?.includes(currentUser.split(' ')[0]))).length;
    const totalPending = all.filter(t => t.reviewStatus === 'In Review').length;
    const totalApproved = all.filter(t => t.reviewStatus === 'Approved').length;
    const mySubmissions = all.filter(t => t.author === currentUser || t.author?.includes(currentUser.split(' ')[0])).length;

    const statsGrid = this.container.querySelector('#review-stats-grid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">待我審核 (Assign to me)</span>
          <span class="review-stat-value">${pendingAssigned}</span>
          <span class="review-stat-desc">目前指派給您的待辦</span>
        </div>
      </div>

      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">全平台審核中 (In Review)</span>
          <span class="review-stat-value">${totalPending}</span>
          <span class="review-stat-desc">等待主管覆核之樣板</span>
        </div>
      </div>

      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">已核准發布 (Approved)</span>
          <span class="review-stat-value">${totalApproved}</span>
          <span class="review-stat-desc">正式發布生效之 SQL</span>
        </div>
      </div>

      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">我的送審紀錄 (My Requests)</span>
          <span class="review-stat-value">${mySubmissions}</span>
          <span class="review-stat-desc">您建立或送審的項目</span>
        </div>
      </div>
    `;
  }

  updateTabBadges() {
    const all = store.getAll();
    const currentUser = store.getCurrentUser();
    const currentPrefix = currentUser.split(' ')[0];

    const assignedCount = all.filter(t => t.assignee === currentUser || t.assignee?.includes(currentPrefix)).length;
    const myCount = all.filter(t => t.author === currentUser || t.author?.includes(currentPrefix)).length;
    const allCount = all.length;

    const assignedBadge = this.container.querySelector('#tab-badge-assigned');
    const myBadge = this.container.querySelector('#tab-badge-my');
    const allBadge = this.container.querySelector('#tab-badge-all');

    if (assignedBadge) assignedBadge.textContent = assignedCount;
    if (myBadge) myBadge.textContent = myCount;
    if (allBadge) allBadge.textContent = allCount;
  }

  getFilteredData() {
    const all = store.getAll();
    const currentUser = store.getCurrentUser();
    const currentPrefix = currentUser.split(' ')[0];

    // Step 1: Filter by active tab
    let list = [];
    if (this.activeTab === 'assigned') {
      list = all.filter(t => t.assignee === currentUser || t.assignee?.includes(currentPrefix));
    } else if (this.activeTab === 'my') {
      list = all.filter(t => t.author === currentUser || t.author?.includes(currentPrefix));
    } else {
      list = [...all];
    }

    // Step 2: Filter by status
    if (this.filterStatus !== 'all') {
      list = list.filter(t => t.reviewStatus === this.filterStatus);
    }

    // Step 3: Filter by keyword
    if (this.filterKeyword.trim()) {
      const q = this.filterKeyword.toLowerCase();
      list = list.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.author && t.author.toLowerCase().includes(q)) ||
        (t.departments && t.departments.some(d => d.toLowerCase().includes(q))) ||
        (t.databases && t.databases.some(db => db.toLowerCase().includes(q)))
      );
    }

    return list;
  }

  renderTable() {
    const tbody = this.container.querySelector('#review-table-tbody');
    const countInfo = this.container.querySelector('#review-table-count-info');
    if (!tbody) return;

    const list = this.getFilteredData();
    if (countInfo) {
      countInfo.textContent = `顯示共 ${list.length} 筆紀錄 (點擊任一列開啟全功能審核視窗)`;
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="table-empty-box">
              <div class="table-empty-icon" style="font-size:32px; color:var(--text-muted);">—</div>
              <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px;">查無符合條件的審核項目</div>
              <div style="font-size: 12px;">您可以切換上方 Tab、變更篩選條件或切換右上角登入視角</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(t => {
      // Status
      let statusTag = '';
      if (t.reviewStatus === 'In Review') {
        statusTag = `<span style="color:#d97706; font-weight:500; font-size:12px;">審核中</span>`;
      } else if (t.reviewStatus === 'Approved') {
        statusTag = `<span style="color:#059669; font-weight:500; font-size:12px;">已核准</span>`;
      } else {
        statusTag = `<span style="color:#64748b; font-weight:500; font-size:12px;">草稿</span>`;
      }

      // PII
      let piiTag = '';
      const piiFields = t.piiFields || [];
      if (piiFields.length > 0) {
        piiTag = `<span style="color:#dc2626; font-size:12px; font-weight:500;" title="${piiFields.join(', ')}">${piiFields.length} 個 PII</span>`;
      } else {
        piiTag = `<span style="color:#94a3b8; font-size:12px;">無</span>`;
      }

      // Dept Tags
      const deptBadges = (t.departments || []).join('、 ') || '-';

      // Database
      const dbBadge = (t.databases || []).join(', ') || '-';

      return `
        <tr class="ant-table-row" data-id="${t.id}">
          <td style="font-family: var(--font-mono); font-weight: 600; color: #0f172a;">${t.id}</td>
          <td>
            <div style="font-weight: 500; color: #0f172a; margin-bottom: 2px;">${t.name}</div>
            <div class="text-xs text-secondary" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; color:#64748b;">
              ${t.description || '無描述'}
            </div>
          </td>
          <td style="color:#475569; font-size:12px;">${deptBadges}</td>
          <td style="color:#475569; font-size:12px; font-family:var(--font-mono);">${dbBadge}</td>
          <td>${piiTag}</td>
          <td>
            <div style="font-size: 12px; font-weight: 500; color: #1e293b;">${t.author || '-'}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              ${t.assignee ? `審核：${t.assignee}` : '未指定'}
            </div>
          </td>
          <td>${statusTag}</td>
          <td style="font-size: 12px; color: #94a3b8;">${t.updatedAt || '-'}</td>
        </tr>
      `;
    }).join('');

    // Row click bind to open modal
    tbody.querySelectorAll('.ant-table-row').forEach(row => {
      row.onclick = () => {
        const id = row.dataset.id;
        this.openReviewModal(id);
      };
    });
  }

  async openReviewModal(id) {
    const tpl = store.getById(id);
    if (!tpl) return;

    this.modalTemplateId = id;
    this.modalActiveTab = 'raw';
    this.modalDiffEnabled = false;

    // Dispose existing editors
    this.modalDiffViewer?.dispose?.();
    this.modalReadOnlyEditor?.dispose?.();
    this.modalDiffViewer = null;
    this.modalReadOnlyEditor = null;

    const overlay = document.getElementById('review-modal-overlay');
    const modalBody = document.getElementById('modal-review-body');
    const titleEl = document.getElementById('modal-review-title');
    const typeBadge = document.getElementById('modal-review-type-badge');
    const statusBadge = document.getElementById('modal-review-status-badge');

    if (!overlay || !modalBody) return;

    titleEl.textContent = `${tpl.name}`;
    titleEl.style.fontSize = '15px';
    titleEl.style.fontWeight = '600';
    titleEl.style.color = '#0f172a';

    typeBadge.textContent = tpl.id;
    typeBadge.className = '';
    typeBadge.style.cssText = 'font-family: var(--font-mono); font-size: 12px; color: #64748b; font-weight: 500;';

    if (tpl.reviewStatus === 'In Review') {
      statusBadge.className = '';
      statusBadge.style.cssText = 'font-size: 12px; color: #d97706; font-weight: 500; margin-left: 6px;';
      statusBadge.textContent = '• 審核中';
    } else if (tpl.reviewStatus === 'Approved') {
      statusBadge.className = '';
      statusBadge.style.cssText = 'font-size: 12px; color: #059669; font-weight: 500; margin-left: 6px;';
      statusBadge.textContent = '• 已核准上線';
    } else {
      statusBadge.className = '';
      statusBadge.style.cssText = 'font-size: 12px; color: #64748b; font-weight: 500; margin-left: 6px;';
      statusBadge.textContent = '• 草稿';
    }

    // Check if diff is available (needs at least 1 previous version)
    const hasPreviousVersion = store.getPreviousVersion(id) !== null;

    // Build fullscreen body: [sql-pane] | [splitter] | [info-pane]
    modalBody.innerHTML = `
      <!-- Left SQL Pane -->
      <div class="review-sql-pane" id="review-sql-pane" style="width: 50%;">
        <div class="review-sql-toolbar">
          <div class="review-sql-tabs">
            <button class="review-sql-tab active" id="review-tab-raw" data-tab="raw">Raw SQL</button>
            <button class="review-sql-tab" id="review-tab-template" data-tab="template">SQL Template</button>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="review-sql-tab-diff-legend" id="review-diff-legend" style="display:none;">
              <span class="review-diff-legend-item">
                <span class="review-diff-legend-dot" style="background:#fecaca;"></span>刪除
              </span>
              <span class="review-diff-legend-item">
                <span class="review-diff-legend-dot" style="background:#bbf7d0;"></span>新增
              </span>
            </div>
            <button class="review-diff-toggle-btn ${hasPreviousVersion ? '' : 'disabled'}" id="review-btn-diff-toggle"
              ${hasPreviousVersion ? '' : 'disabled'}
              title="${hasPreviousVersion ? '切換版本差異對照' : '無歷史版本可比對'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
              </svg>
              版本差異
            </button>
          </div>
        </div>
        <div class="review-editor-area" id="review-editor-area"></div>
      </div>

      <!-- Splitter -->
      <div class="review-splitter" id="review-splitter"></div>

      <!-- Right Info Pane -->
      <div class="review-info-pane" id="review-info-pane" style="flex: 1; min-width: 0;">
        ${this.buildReadOnlyInfoPaneHTML(tpl)}
      </div>
    `;

    // Init editor (default: raw SQL, diff off)
    await this._renderSqlEditor(tpl);

    // Bind SQL tab events
    const tabRaw = modalBody.querySelector('#review-tab-raw');
    const tabTemplate = modalBody.querySelector('#review-tab-template');
    const btnDiffToggle = modalBody.querySelector('#review-btn-diff-toggle');

    tabRaw.addEventListener('click', () => {
      this.modalActiveTab = 'raw';
      this._renderSqlEditor(tpl);
    });
    tabTemplate.addEventListener('click', () => {
      this.modalActiveTab = 'template';
      this._renderSqlEditor(tpl);
    });
    if (hasPreviousVersion) {
      btnDiffToggle.addEventListener('click', () => {
        this.modalDiffEnabled = !this.modalDiffEnabled;
        this._renderSqlEditor(tpl);
      });
    }

    // Init splitter drag
    this.initSplitter();

    // Populate dynamic right-pane content (proofs, timeline)
    this.updateReadOnlyInfoPane(id);

    // Render footer steps
    this.renderModalSteps(tpl);

    // Footer button bindings
    const rejectBtn = document.getElementById('btn-modal-review-reject');
    const approveBtn = document.getElementById('btn-modal-review-approve');
    const editBtn = document.getElementById('btn-modal-review-edit');

    this.closeReviewModal = () => {
      this.modalTemplateId = null;
      this.modalDiffViewer?.dispose?.();
      this.modalReadOnlyEditor?.dispose?.();
      this.modalDiffViewer = null;
      this.modalReadOnlyEditor = null;
      overlay.classList.remove('active');
    };

    // Close button bindings
    document.getElementById('btn-close-review-modal')?.addEventListener('click', this.closeReviewModal);
    document.getElementById('btn-modal-review-close')?.addEventListener('click', this.closeReviewModal);

    if (rejectBtn) {
      rejectBtn.onclick = () => {
        ModalManager.showRejectModal((reason) => {
          store.rejectTemplate(id, reason);
          toast.warning(`Template [${id}] 已退回修正！`);
          this.closeReviewModal();
        });
      };
    }

    if (approveBtn) {
      if (tpl.reviewStatus === 'Approved') {
        approveBtn.disabled = true;
        approveBtn.textContent = '✓ 已核准上線';
      } else {
        approveBtn.disabled = false;
        approveBtn.innerHTML = '✓ 核准發布 (Approve)';
        approveBtn.onclick = () => {
          if (confirm(`確定核准 Template [${id}]？\n核准後狀態將變更為「可使用 (Active)」。`)) {
            const ok = store.approveTemplate(id);
            if (ok) {
              toast.success(`Template [${id}] 審核通過，正式發布上線！`);
              this.closeReviewModal();
            }
          }
        };
      }
    }

    if (editBtn) {
      editBtn.onclick = () => {
        this.closeReviewModal();
        window.AppRouter.navigate('studio', { mode: 'edit', id });
      };
    }

    overlay.classList.add('active');
  }

  /**
   * Render the SQL editor based on current activeTab and diffEnabled state.
   * - activeTab: 'raw' | 'template' — determines which SQL form to display
   * - diffEnabled: boolean — if true, shows diff between current and previous version (same form)
   */
  async _renderSqlEditor(tpl) {
    const editorArea = document.getElementById('review-editor-area');
    if (!editorArea) return;

    // Dispose old editors
    this.modalDiffViewer?.dispose?.();
    this.modalReadOnlyEditor?.dispose?.();
    this.modalDiffViewer = null;
    this.modalReadOnlyEditor = null;
    editorArea.innerHTML = '';

    // Update toolbar UI
    const tabRaw = document.getElementById('review-tab-raw');
    const tabTemplate = document.getElementById('review-tab-template');
    const btnDiffToggle = document.getElementById('review-btn-diff-toggle');
    const diffLegend = document.getElementById('review-diff-legend');

    if (tabRaw) tabRaw.classList.toggle('active', this.modalActiveTab === 'raw');
    if (tabTemplate) tabTemplate.classList.toggle('active', this.modalActiveTab === 'template');

    // Toggle button active state
    if (btnDiffToggle) {
      btnDiffToggle.classList.toggle('active', this.modalDiffEnabled);
    }

    // Determine current SQL content
    const currentSql = this.modalActiveTab === 'raw'
      ? (tpl.rawSql || tpl.templateSql || '')
      : (tpl.templateSql || tpl.rawSql || '');

    if (this.modalDiffEnabled) {
      // Diff mode: compare previous version vs current (same SQL form)
      const prevVersion = store.getPreviousVersion(tpl.id);
      if (!prevVersion) {
        // Shouldn't happen (button should be disabled), but handle gracefully
        this.modalDiffEnabled = false;
        return this._renderSqlEditor(tpl);
      }

      const previousSql = this.modalActiveTab === 'raw'
        ? (prevVersion.rawSql || '')
        : (prevVersion.templateSql || '');

      if (diffLegend) diffLegend.style.display = 'flex';

      this.modalDiffViewer = new SqlDiffViewer(editorArea);
      await this.modalDiffViewer.init(previousSql, currentSql);
    } else {
      // Single read-only editor
      if (diffLegend) diffLegend.style.display = 'none';

      this.modalReadOnlyEditor = new SqlReadOnlyEditor(editorArea);
      await this.modalReadOnlyEditor.init(currentSql);
    }
  }

  /**
   * Init resizable splitter between SQL pane and info pane
   */
  initSplitter() {
    const splitter = document.getElementById('review-splitter');
    const sqlPane = document.getElementById('review-sql-pane');
    const infoPane = document.getElementById('review-info-pane');
    if (!splitter || !sqlPane || !infoPane) return;

    const container = splitter.parentElement;
    let dragging = false;

    splitter.addEventListener('mousedown', (e) => {
      dragging = true;
      splitter.classList.add('dragging');
      e.preventDefault();
    });

    const onMouseMove = (e) => {
      if (!dragging) return;
      const rect = container.getBoundingClientRect();
      const leftW = e.clientX - rect.left;
      const totalW = rect.width - splitter.offsetWidth;
      const pct = Math.max(20, Math.min(80, (leftW / totalW) * 100));
      sqlPane.style.width = `${pct}%`;
      infoPane.style.width = `${100 - pct}%`;
      infoPane.style.flex = 'none';
      // Trigger Monaco layout
      this.modalDiffViewer?.layout?.();
      this.modalReadOnlyEditor?.layout?.();
    };

    const onMouseUp = () => {
      if (dragging) {
        dragging = false;
        splitter.classList.remove('dragging');
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Store cleanup for next modal open
    this._splitterCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  /**
   * Build static HTML for the right info pane (cards A, B, C, E + Timeline stubs)
   */
  buildReadOnlyInfoPaneHTML(tpl) {
    // Basic Info status tag text
    const statusMap = {
      'In Review': '<span style="font-size:12px;color:#d97706;font-weight:500;">審核中</span>',
      'Approved': '<span style="font-size:12px;color:#059669;font-weight:500;">已核准</span>',
      'Draft': '<span style="font-size:12px;color:#64748b;font-weight:500;">草稿</span>'
    };
    const statusText = statusMap[tpl.reviewStatus] || statusMap['Draft'];

    const deptText = tpl.type === 'company'
      ? '<span style="color:#475569;">全公司</span>'
      : (tpl.departments || []).join('、 ') || '-';

    const dbText = (tpl.databases || []).join(', ') || '-';

    // Columns / Sensitive info
    const columns = tpl.columns || [];
    const colRows = columns.length > 0
      ? columns.map(col => {
          const isOverridden = col.aiSensitive && !col.isPii;
          let sensitiveStatus = '<span style="color:#94a3b8;font-size:11px;">一般</span>';
          if (col.isPii) {
            sensitiveStatus = '<span style="color:#dc2626;font-weight:600;font-size:11px;">敏感</span>';
          } else if (isOverridden) {
            sensitiveStatus = '<span style="color:#d97706;font-weight:500;font-size:11px;" title="原系統判定敏感，已手動解除">解除</span>';
          }

          return `
            <tr>
              <td><span style="font-family:var(--font-mono);font-weight:600;font-size:12px;color:#1e293b;">${col.name}</span></td>
              <td><span style="font-family:var(--font-mono);color:#64748b;font-size:11px;">${col.type || '-'}</span></td>
              <td>
                <div style="color:#475569;">${col.desc || '-'}</div>
                ${isOverridden && col.overrideReason ? `
                  <div style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:3px;padding:3px 6px;margin-top:4px;">
                    <strong>解除理由：</strong>${col.overrideReason}
                  </div>
                ` : ''}
              </td>
              <td style="text-align:right;">
                ${sensitiveStatus}
              </td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:12px;">無欄位定義</td></tr>`;

    // Parameters
    const params = tpl.parameters || [];
    const paramItems = params.length > 0
      ? params.map(p => `
        <div class="review-param-item">
          <span class="review-param-name">{{${p.name}}}</span>
          <span style="color:#64748b;font-size:11px;">${p.type || 'String'}</span>
          <span style="color:#94a3b8;font-size:11px;flex:1;">預設: ${p.defaultVal || '-'}</span>
          ${p.required ? '<span style="color:#dc2626;font-size:11px;font-weight:500;">必填</span>' : ''}
        </div>`).join('')
      : '<div style="color:#94a3b8;font-size:12px;">無動態參數</div>';

    return `
      <!-- Section 1: Basic Info -->
      <div class="review-info-section">
        <div class="review-section-heading">
          <h3>基本資訊</h3>
          ${statusText}
        </div>
        <div class="review-meta-grid">
          <div class="review-meta-row">
            <span class="review-meta-label">ID</span>
            <span class="review-meta-value" style="font-family:var(--font-mono);font-weight:600;color:#0f172a;">${tpl.id}</span>
          </div>
          <div class="review-meta-row">
            <span class="review-meta-label">名稱</span>
            <span class="review-meta-value" style="font-weight:500;">${tpl.name}</span>
          </div>
          <div class="review-meta-row">
            <span class="review-meta-label">適用範圍</span>
            <span class="review-meta-value">${deptText}</span>
          </div>
          <div class="review-meta-row">
            <span class="review-meta-label">資料庫</span>
            <span class="review-meta-value" style="font-family:var(--font-mono);">${dbText}</span>
          </div>
          <div class="review-meta-row">
            <span class="review-meta-label">建立者</span>
            <span class="review-meta-value">${tpl.author || '-'}</span>
          </div>
          <div class="review-meta-row">
            <span class="review-meta-label">說明</span>
            <span class="review-meta-value" style="color:#475569;line-height:1.5;">${tpl.description || '無描述'}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Columns & PII -->
      <div class="review-info-section">
        <div class="review-section-heading">
          <h3>輸出欄位與敏感資訊</h3>
          <span id="review-pii-count-badge" style="font-size:12px;color:#64748b;">-</span>
        </div>
        <table class="review-col-table">
          <thead>
            <tr>
              <th>欄位</th>
              <th>型態</th>
              <th>說明</th>
              <th style="text-align:right;">敏感</th>
            </tr>
          </thead>
          <tbody>${colRows}</tbody>
        </table>
      </div>

      <!-- Section 3: Parameters -->
      <div class="review-info-section">
        <div class="review-section-heading">
          <h3>動態參數</h3>
          <span style="font-size:12px;color:#94a3b8;">${params.length} 個</span>
        </div>
        <div class="review-param-list">
          ${paramItems}
        </div>
      </div>

      <!-- Section 4: Proofs -->
      <div class="review-info-section">
        <div class="review-section-heading">
          <h3>執行憑證附件</h3>
        </div>
        <div id="review-modal-proof-container">
          <!-- populated by updateReadOnlyInfoPane -->
        </div>
      </div>

      <!-- Section 5: Timeline -->
      <div class="review-info-section">
        <div class="review-section-heading">
          <h3>審核歷程</h3>
        </div>
        <div class="timeline" id="review-modal-audit-timeline"></div>
      </div>
    `;

  }

  /**
   * Populate dynamic content in right pane (proofs, timeline, PII badge)
   */
  updateReadOnlyInfoPane(id) {
    const tpl = store.getById(id);
    if (!tpl) return;

    // PII status text
    const piiBadge = document.getElementById('review-pii-count-badge');
    if (piiBadge) {
      const piiCount = (tpl.piiFields || []).length;
      if (piiCount > 0) {
        piiBadge.style.color = '#dc2626';
        piiBadge.style.fontWeight = '500';
        piiBadge.textContent = `包含 ${piiCount} 個敏感欄位`;
      } else {
        piiBadge.style.color = '#059669';
        piiBadge.style.fontWeight = '400';
        piiBadge.textContent = '無敏感欄位';
      }
    }

    // Card E: Proofs
    const proofContainer = document.getElementById('review-modal-proof-container');
    if (proofContainer) {
      proofContainer.innerHTML = '';
      const attachments = tpl.attachments || [];
      if (attachments.length > 0) {
        attachments.forEach(att => {
          const wrap = document.createElement('div');
          wrap.style.marginBottom = '8px';

          const img = document.createElement('img');
          img.className = 'proof-img-thumb';
          img.src = att.url;
          img.alt = att.name;
          img.title = '點擊放大';
          img.onclick = () => ModalManager.showLightbox(att.url, `執行憑證: ${att.name}`);

          const caption = document.createElement('div');
          caption.style.cssText = 'margin-top:4px;display:flex;justify-content:space-between;font-size:11px;color:#8c8c8c;';
          caption.innerHTML = `<span><strong>${att.name}</strong></span><span>${att.size}</span>`;

          wrap.appendChild(img);
          wrap.appendChild(caption);
          proofContainer.appendChild(wrap);
        });
      } else {
        proofContainer.innerHTML = '<span style="font-size:12px;color:#dc2626;">⚠ 建立者未上傳執行憑證截圖</span>';
      }
    }

    // Timeline
    const timeline = document.getElementById('review-modal-audit-timeline');
    if (timeline) {
      const history = tpl.history || [];
      if (history.length === 0) {
        timeline.innerHTML = '<div style="color:#bfbfbf;font-size:12px;">暫無審核記錄</div>';
        return;
      }
      timeline.innerHTML = history.map(h => `
        <div class="timeline-step">
          <div class="timeline-dot ${h.action === 'Approve' ? 'success' : (h.action === 'Reject' ? 'danger' : '')}"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-user">${h.user} <span style="font-weight:normal;color:#64748b;">(${h.action})</span></span>
              <span class="timeline-time">${h.time}</span>
            </div>
            ${h.comment ? `<div class="timeline-comment">${h.comment}</div>` : ''}
          </div>
        </div>
      `).join('');
    }
  }

  renderModalSteps(tpl) {
    if (!tpl) return;
    const footerLeft = document.getElementById('modal-review-footer-info');
    if (!footerLeft) return;

    // Determine step status
    // Step 1: Submit (Alex) -> Step 2: Department/User Manager -> Step 3: Guardian / Architecture Lead (John Doe)
    const isApproved = tpl.reviewStatus === 'Approved';
    const isReview = tpl.reviewStatus === 'In Review';
    const isDraftOrRejected = tpl.reviewStatus === 'Draft';

    let step1Class = 'finish';
    let step2Class = isApproved ? 'finish' : (isReview ? 'finish' : (isDraftOrRejected ? 'rejected' : 'process'));
    let step3Class = isApproved ? 'finish' : (isReview ? 'process' : 'wait');

    const authorName = tpl.author ? tpl.author.split(' ')[0] : 'Current User';
    const assigneeName = tpl.assignee ? tpl.assignee.split(' ')[0] : 'Guardian';

    footerLeft.innerHTML = `
      <div class="ant-steps-horizontal">
        <!-- Step 1 -->
        <div class="ant-step-item ${step1Class}">
          <div class="ant-step-node">
            <div class="ant-step-icon">1</div>
            <div class="ant-step-content">
              <div class="ant-step-title">送審提出</div>
              <div class="ant-step-subtitle">${authorName} (Author)</div>
            </div>
          </div>
          <div class="ant-step-line"></div>
        </div>

        <!-- Step 2 -->
        <div class="ant-step-item ${step2Class}">
          <div class="ant-step-node">
            <div class="ant-step-icon">2</div>
            <div class="ant-step-content">
              <div class="ant-step-title">部門主管審核</div>
              <div class="ant-step-subtitle">Dept Manager</div>
            </div>
          </div>
          <div class="ant-step-line"></div>
        </div>

        <!-- Step 3 -->
        <div class="ant-step-item ${step3Class}">
          <div class="ant-step-node">
            <div class="ant-step-icon">${isApproved ? '✓' : '3'}</div>
            <div class="ant-step-content">
              <div class="ant-step-title">資料治理覆核</div>
              <div class="ant-step-subtitle">${assigneeName} (Guardian)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateModalContent(id) {
    const tpl = store.getById(id);
    if (!tpl) return;

    this.renderModalSteps(tpl);

    const piiTag = document.getElementById('modal-pii-count-tag');
    const piiList = document.getElementById('modal-pii-list');
    const proofContainer = document.getElementById('modal-proof-container');
    const timeline = document.getElementById('modal-audit-timeline');

    if (!piiTag || !piiList) return;

    // PII
    const piiFields = tpl.piiFields || [];
    if (piiFields.length > 0) {
      piiTag.className = 'ant-tag ant-tag-error';
      piiTag.textContent = `${piiFields.length} 個敏感欄位`;
      piiList.innerHTML = piiFields.map(f => `<span class="ant-tag ant-tag-error" style="font-size:11px;">${f}</span>`).join(' ');
    } else {
      piiTag.className = 'ant-tag ant-tag-success';
      piiTag.textContent = '無敏感欄位';
      piiList.innerHTML = `<span style="font-size:12px; color:#059669;">✓ 未偵測到個資敏感欄位 (如身分證、電話、銀行帳號)</span>`;
    }

    // Proofs - Use direct DOM image creation to prevent any attribute parsing issues
    if (proofContainer) {
      proofContainer.innerHTML = '';
      const attachments = tpl.attachments || [];
      if (attachments.length > 0) {
        attachments.forEach(att => {
          const wrap = document.createElement('div');
          wrap.style.marginBottom = '8px';

          const img = document.createElement('img');
          img.className = 'proof-img-thumb';
          img.src = att.url;
          img.alt = att.name;
          img.title = '點擊放大檢視完整執行憑證';
          img.onclick = () => {
            ModalManager.showLightbox(att.url, `執行憑證檢視: ${att.name}`);
          };

          const caption = document.createElement('div');
          caption.className = 'text-xs text-secondary';
          caption.style.marginTop = '6px';
          caption.style.display = 'flex';
          caption.style.justifyContent = 'space-between';
          caption.innerHTML = `<span><strong>${att.name}</strong></span> <span>${att.size}</span>`;

          wrap.appendChild(img);
          wrap.appendChild(caption);
          proofContainer.appendChild(wrap);
        });
      } else {
        proofContainer.innerHTML = `<span style="font-size:12px; color:#dc2626;">⚠️ 建立者未上傳真實執行憑證截圖</span>`;
      }
    }

    // Timeline
    if (timeline) {
      const history = tpl.history || [];
      timeline.innerHTML = history.map(h => `
        <div class="timeline-step">
          <div class="timeline-dot ${h.action === 'Approve' ? 'success' : (h.action === 'Reject' ? 'danger' : '')}"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-user">${h.user} <span style="font-weight:normal; color:#64748b;">(${h.action})</span></span>
              <span class="timeline-time">${h.time}</span>
            </div>
            ${h.comment ? `<div class="timeline-comment">${h.comment}</div>` : ''}
          </div>
        </div>
      `).join('');
    }
  }

  bindEvents() {
    // Tab switching
    this.container.querySelectorAll('.ant-tab-item').forEach(tabBtn => {
      tabBtn.onclick = () => {
        this.container.querySelectorAll('.ant-tab-item').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        this.activeTab = tabBtn.dataset.tab;
        this.renderTable();
      };
    });

    // Search filter
    const searchInput = this.container.querySelector('#review-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.filterKeyword = e.target.value;
        this.renderTable();
      };
    }

    // Status filter
    const statusFilter = this.container.querySelector('#review-status-filter');
    if (statusFilter) {
      statusFilter.onchange = (e) => {
        this.filterStatus = e.target.value;
        this.renderTable();
      };
    }

    // Refresh button
    this.container.querySelector('#btn-review-refresh')?.addEventListener('click', () => {
      this.renderStats();
      this.updateTabBadges();
      this.renderTable();
      toast.info('審核中心資料已重新載入');
    });

    // Go to Studio
    this.container.querySelector('#btn-review-goto-studio')?.addEventListener('click', () => {
      window.AppRouter.navigate('studio', { mode: 'create' });
    });
  }
}
