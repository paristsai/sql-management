/**
 * Catalog Hub View Controller
 * Redesigned with Clean Flat Style & Full Read-only Modal
 */

import { store } from '../store.js';
import { toast } from '../components/toast.js';
import { SqlReadOnlyEditor } from '../components/editor.js';
import { ModalManager } from '../components/modal.js';
import { importPreviewModal } from '../components/import-modal.js';

export class CatalogView {
  constructor(container) {
    this.container = container;
    this.filterState = {
      keyword: '',
      dept: 'all',
      db: 'all',
      reviewStatus: 'all',
      usageStatus: 'all',
      hasPii: 'all'
    };
    this.modalTemplateId = null;
    this.modalActiveTab = 'raw'; // 'raw' | 'template'
    this.modalHighlightEnabled = true;
    this.modalReadOnlyEditor = null;
  }

  init() {
    this.render();
    this.bindEvents();
    store.subscribe(() => {
      this.renderTable();
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="catalog-container" id="catalog-dropzone">
        <!-- Catalog Header -->
        <div class="catalog-header">
          <div class="catalog-title-group">
            <h1>SQL 樣板</h1>
            <p>全公司標準化數據查詢與 API 調用樣板，點擊任一列可快速檢視 SQL 內容與調用方式</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="file" id="catalog-file-import" accept=".json,application/json" style="display: none;" />
            <button class="btn btn-outline btn-sm" id="btn-import-tpl" title="匯入 SQL Template JSON 檔 (一次最多 10 個)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              匯入
            </button>
            <button class="btn btn-outline btn-sm" id="btn-batch-export-all" title="匯出 SQL Template">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              匯出
            </button>
            <button class="btn btn-primary btn-sm" id="btn-create-new-tpl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              建立 SQL Template
            </button>
          </div>
        </div>

        <!-- Filter Card -->
        <div class="catalog-filter-card">
          <div class="filter-row">
            <div class="search-input-wrapper" style="flex: 1; max-width: 340px;">
              <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
              <input type="text" class="form-input search-input" id="filter-keyword" placeholder="搜尋 Template ID、名稱、SQL 內容、建立者..." />
            </div>

            <div style="min-width: 130px;">
              <select class="form-select" id="filter-dept">
                <option value="all">所有適用部門</option>
                <option value="全公司">全公司通用</option>
                <option value="數據工程部">數據工程部</option>
                <option value="營運企劃部">營運企劃部</option>
                <option value="財務會計部">財務會計部</option>
                <option value="法務合規部">法務合規部</option>
              </select>
            </div>

            <div style="min-width: 120px;">
              <select class="form-select" id="filter-db">
                <option value="all">所有資料庫</option>
                <option value="DBName2">DBName2</option>
                <option value="DBName1">DBName1</option>
                <option value="DBName5">DBName5</option>
                <option value="DBName3">DBName3</option>
              </select>
            </div>

            <div style="min-width: 120px;">
              <select class="form-select" id="filter-review-status">
                <option value="all">所有審核狀態</option>
                <option value="Draft">草稿 (Draft)</option>
                <option value="In Review">審核中 (In Review)</option>
                <option value="Approved">已核准 (Approved)</option>
              </select>
            </div>

            <div style="min-width: 110px;">
              <select class="form-select" id="filter-pii">
                <option value="all">敏感資料過濾</option>
                <option value="has_pii">含敏感欄位</option>
                <option value="no_pii">無敏感欄位</option>
              </select>
            </div>

            <button class="btn btn-secondary btn-sm" id="btn-reset-filters" title="重設條件">重設</button>
          </div>
        </div>

        <!-- Ant Design Flat Table View -->
        <div class="ant-table-wrapper" style="margin-top: 16px;">
          <table class="ant-table">
            <thead>
              <tr>
                <th style="width: 150px;">Template ID</th>
                <th style="min-width: 220px;">SQL 樣板名稱與業務描述</th>
                <th style="width: 130px;">適用部門</th>
                <th style="width: 120px;">目標資料庫</th>
                <th style="width: 100px;">敏感資訊</th>
                <th style="width: 100px;">審核狀態</th>
                <th style="width: 90px;">使用狀態</th>
                <th style="width: 130px;">建立者 / 時間</th>
              </tr>
            </thead>
            <tbody id="catalog-table-tbody">
              <!-- Dynamically rendered -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.renderTable();
  }

  bindEvents() {
    this.container.querySelector('#btn-create-new-tpl').onclick = () => {
      window.AppRouter.navigate('studio', { mode: 'create' });
    };

    const bindFilter = (elemId, key) => {
      this.container.querySelector(elemId).addEventListener('input', (e) => {
        this.filterState[key] = e.target.value;
        this.renderTable();
      });
    };

    bindFilter('#filter-keyword', 'keyword');
    bindFilter('#filter-dept', 'dept');
    bindFilter('#filter-db', 'db');
    bindFilter('#filter-review-status', 'reviewStatus');
    bindFilter('#filter-pii', 'hasPii');

    this.container.querySelector('#btn-reset-filters').onclick = () => {
      this.filterState = {
        keyword: '',
        dept: 'all',
        db: 'all',
        reviewStatus: 'all',
        usageStatus: 'all',
        hasPii: 'all'
      };
      this.container.querySelector('#filter-keyword').value = '';
      this.container.querySelector('#filter-dept').value = 'all';
      this.container.querySelector('#filter-db').value = 'all';
      this.container.querySelector('#filter-review-status').value = 'all';
      this.container.querySelector('#filter-pii').value = 'all';
      this.renderTable();
    };

    this.container.querySelector('#btn-batch-export-all').onclick = () => {
      store.exportCatalogJson();
      toast.success('全量 SQL Template Catalog 匯出完成！');
    };

    // Import Trigger & File Handler
    const fileInput = this.container.querySelector('#catalog-file-import');
    const btnImport = this.container.querySelector('#btn-import-tpl');

    if (btnImport && fileInput) {
      btnImport.onclick = () => {
        fileInput.value = '';
        fileInput.click();
      };

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          this.processImportFile(file);
        }
      };
    }

    // Drag and drop support
    const dropzone = this.container.querySelector('#catalog-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.name.endsWith('.json')) {
            this.processImportFile(file);
          } else {
            toast.error('僅支援上傳 .json 格式檔案');
          }
        }
      });
    }
  }

  processImportFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const result = store.validateImportData(parsed);
        if (!result.valid) {
          toast.error(result.error);
          return;
        }

        toast.info(`已載入 ${result.items.length} 筆 Template，開啟匯入預覽工作台...`);
        importPreviewModal.open(result.items, () => {
          this.renderTable();
        });
      } catch (err) {
        console.error('Import parse error:', err);
        toast.error('檔案解析失敗，請確認檔案是否為合法的 JSON 格式。');
      }
    };
    reader.onerror = () => {
      toast.error('讀取檔案失敗');
    };
    reader.readAsText(file, 'utf-8');
  }

  getFilteredData() {
    const list = store.getAll();
    return list.filter(item => {
      if (this.filterState.keyword) {
        const kw = this.filterState.keyword.toLowerCase();
        const matchId = item.id.toLowerCase().includes(kw);
        const matchName = item.name.toLowerCase().includes(kw);
        const matchSql = (item.templateSql || '').toLowerCase().includes(kw);
        const matchAuthor = (item.author || '').toLowerCase().includes(kw);
        if (!matchId && !matchName && !matchSql && !matchAuthor) return false;
      }
      if (this.filterState.dept !== 'all') {
        if (this.filterState.dept === '全公司' && item.type !== 'company') return false;
        if (this.filterState.dept !== '全公司' && !(item.departments || []).includes(this.filterState.dept)) return false;
      }
      if (this.filterState.db !== 'all') {
        if (!(item.databases || []).includes(this.filterState.db)) return false;
      }
      if (this.filterState.reviewStatus !== 'all') {
        if (item.reviewStatus !== this.filterState.reviewStatus) return false;
      }
      if (this.filterState.hasPii !== 'all') {
        const hasSensitive = (item.piiFields && item.piiFields.length > 0);
        if (this.filterState.hasPii === 'has_pii' && !hasSensitive) return false;
        if (this.filterState.hasPii === 'no_pii' && hasSensitive) return false;
      }
      return true;
    });
  }

  renderTable() {
    const tbody = this.container.querySelector('#catalog-table-tbody');
    if (!tbody) return;

    const data = this.getFilteredData();
    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
            無符合條件的 SQL 樣板紀錄
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(tpl => {
      let reviewStatus = '<span style="color:#64748b; font-size:12px; font-weight:500;">草稿</span>';
      if (tpl.reviewType === 'delete' || (tpl.reviewStatus === 'In Review' && tpl.reviewType === 'delete')) {
        reviewStatus = '<span style="color:#e11d48; font-size:12px; font-weight:600;">刪除審核中</span>';
      } else if (tpl.reviewStatus === 'In Review') {
        reviewStatus = '<span style="color:#d97706; font-size:12px; font-weight:500;">審核中</span>';
      } else if (tpl.reviewStatus === 'Approved') {
        reviewStatus = '<span style="color:#059669; font-size:12px; font-weight:500;">已核准</span>';
      }

      let usageStatus = '<span style="color:#94a3b8; font-size:12px;">停用</span>';
      if (tpl.usageStatus === 'Active') {
        usageStatus = '<span style="color:#059669; font-size:12px; font-weight:500;">可使用</span>';
      }

      let sensitiveTag = '<span style="color:#94a3b8; font-size:12px;">無</span>';
      if (tpl.piiFields && tpl.piiFields.length > 0) {
        sensitiveTag = `<span style="color:#dc2626; font-size:12px; font-weight:500;" title="${tpl.piiFields.join(', ')}">${tpl.piiFields.length} 個</span>`;
      }

      const dbText = (tpl.databases || []).join(', ') || '-';
      const deptText = tpl.type === 'company'
        ? '<span style="color:#475569;">全公司</span>'
        : (tpl.departments || []).join('、 ') || '-';

      return `
        <tr class="ant-table-row catalog-table-row" data-id="${tpl.id}" style="cursor: pointer;">
          <td style="font-family: var(--font-mono); font-weight: 600; color: #0f172a;">${tpl.id}</td>
          <td>
            <div style="font-weight: 500; color: #0f172a; margin-bottom: 2px;">${tpl.name}</div>
            <div style="font-size: 11px; color: #64748b; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${tpl.description || '無業務說明'}
            </div>
          </td>
          <td style="color: #475569; font-size: 12px;">${deptText}</td>
          <td style="color: #475569; font-size: 12px; font-family: var(--font-mono);">${dbText}</td>
          <td>${sensitiveTag}</td>
          <td>${reviewStatus}</td>
          <td>${usageStatus}</td>
          <td>
            <div style="font-size: 12px; font-weight: 500; color: #1e293b;">${tpl.author || '-'}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${tpl.updatedAt || '-'}</div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.catalog-table-row').forEach(row => {
      row.onclick = () => {
        const id = row.dataset.id;
        this.openDetailModal(id);
      };
    });
  }

  hasEditPermission(tpl) {
    return store.canEdit(tpl);
  }

  async openDetailModal(id) {
    const tpl = store.getById(id);
    if (!tpl) return;

    this.modalTemplateId = id;
    this.modalActiveTab = 'raw';
    this.modalReadOnlyEditor?.dispose?.();
    this.modalReadOnlyEditor = null;

    const overlay = document.getElementById('catalog-modal-overlay');
    const modalBody = document.getElementById('modal-catalog-body');
    const titleEl = document.getElementById('modal-catalog-title');
    const typeBadge = document.getElementById('modal-catalog-type-badge');
    const statusBadge = document.getElementById('modal-catalog-status-badge');
    const footerInfo = document.getElementById('modal-catalog-footer-info');
    const editBtn = document.getElementById('btn-modal-catalog-edit');
    const duplicateBtn = document.getElementById('btn-modal-catalog-duplicate');
    const deleteBtn = document.getElementById('btn-modal-catalog-delete');
    const copySqlBtn = document.getElementById('btn-modal-catalog-copy-sql');
    const apiBtn = document.getElementById('btn-modal-catalog-api');
    const closeBtn = document.getElementById('btn-modal-catalog-close');
    const closeIconBtn = document.getElementById('btn-close-catalog-modal');

    if (!overlay || !modalBody) return;

    titleEl.textContent = tpl.name;
    titleEl.style.fontSize = '15px';
    titleEl.style.fontWeight = '600';
    titleEl.style.color = '#0f172a';
    typeBadge.textContent = tpl.id;

    if (tpl.reviewType === 'delete') {
      statusBadge.style.color = '#e11d48';
      statusBadge.textContent = '• 刪除審核中';
    } else if (tpl.reviewStatus === 'Approved') {
      statusBadge.style.color = '#059669';
      statusBadge.textContent = '• 已核准 (可調用)';
    } else if (tpl.reviewStatus === 'In Review') {
      statusBadge.style.color = '#d97706';
      statusBadge.textContent = '• 審核中';
    } else {
      statusBadge.style.color = '#64748b';
      statusBadge.textContent = '• 草稿';
    }

    const canEdit = store.canEdit(tpl);
    if (editBtn) {
      editBtn.style.display = canEdit ? 'inline-flex' : 'none';
      editBtn.onclick = () => {
        this.closeDetailModal();
        window.AppRouter.navigate('studio', { mode: 'edit', id });
      };
    }

    const canDuplicate = store.isAuthor(tpl) || store.isAdmin();
    if (duplicateBtn) {
      duplicateBtn.style.display = canDuplicate ? 'inline-flex' : 'none';
      duplicateBtn.onclick = () => {
        const cloned = store.duplicateTemplate(id);
        if (cloned) {
          toast.success(`已複製樣板為 [${cloned.id}]，即將進入工作台！`);
          this.closeDetailModal();
          window.AppRouter.navigate('studio', { mode: 'edit', id: cloned.id });
        }
      };
    }

    const canDelete = store.canDelete(tpl);
    if (deleteBtn) {
      deleteBtn.style.display = canDelete ? 'inline-flex' : 'none';
      deleteBtn.onclick = () => {
        ModalManager.showDeleteModal((reason) => {
          store.requestDeleteTemplate(id, reason);
          toast.warning(`已提交樣板 [${id}] 之刪除審核申請！`);
          this.closeDetailModal();
          this.renderTable();
        }, `${tpl.name} (${tpl.id})`);
      };
    }

    if (footerInfo) {
      footerInfo.innerHTML = `
        <span>建立者：<strong>${tpl.author || '-'}</strong></span>
        <span style="margin: 0 8px;">|</span>
        <span>更新時間：${tpl.updatedAt || '-'}</span>
      `;
    }

    modalBody.innerHTML = `
      <div class="review-sql-pane" id="catalog-sql-pane" style="width: 50%; min-width: 280px;">
        <div class="review-sql-toolbar">
          <div class="review-sql-tabs">
            <button class="review-sql-tab active" id="catalog-tab-raw">Raw SQL</button>
            <button class="review-sql-tab" id="catalog-tab-template">SQL Template</button>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="sql-highlight-legend" id="catalog-highlight-legend" style="${this.modalHighlightEnabled ? 'display: flex;' : 'display: none;'}">
              <span class="sql-highlight-legend-item">
                <span class="sql-highlight-dot-pii"></span>敏感欄位
              </span>
              <span class="sql-highlight-legend-item">
                <span class="sql-highlight-dot-param"></span>動態參數
              </span>
            </div>
            <button class="sql-highlight-toggle-btn ${this.modalHighlightEnabled ? 'active' : ''}" id="catalog-btn-highlight-toggle" title="切換敏感欄位與動態參數高亮標記">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>高亮欄位</span>
            </button>
          </div>
        </div>
        <div class="review-editor-area" id="catalog-editor-area"></div>
      </div>
      <div class="review-splitter" id="catalog-splitter"></div>
      <div class="review-info-pane" id="catalog-info-pane" style="flex: 1; min-width: 0;">
        ${this.buildReadOnlyInfoPaneHTML(tpl)}
      </div>
    `;

    await this._renderSqlEditor(tpl);

    const tabRaw = modalBody.querySelector('#catalog-tab-raw');
    const tabTemplate = modalBody.querySelector('#catalog-tab-template');
    const btnHighlightToggle = modalBody.querySelector('#catalog-btn-highlight-toggle');
    const highlightLegend = modalBody.querySelector('#catalog-highlight-legend');

    tabRaw.addEventListener('click', () => {
      this.modalActiveTab = 'raw';
      this._renderSqlEditor(tpl);
    });
    tabTemplate.addEventListener('click', () => {
      this.modalActiveTab = 'template';
      this._renderSqlEditor(tpl);
    });

    if (btnHighlightToggle) {
      btnHighlightToggle.addEventListener('click', () => {
        this.modalHighlightEnabled = !this.modalHighlightEnabled;
        btnHighlightToggle.classList.toggle('active', this.modalHighlightEnabled);
        if (highlightLegend) {
          highlightLegend.style.display = this.modalHighlightEnabled ? 'flex' : 'none';
        }

        if (this.modalHighlightEnabled) {
          const piiFields = (tpl.columns || [])
            .filter(c => c.isPii)
            .map(c => c.name)
            .concat(tpl.piiFields || []);
          this.modalReadOnlyEditor?.updateHighlights(
            Array.from(new Set(piiFields)),
            tpl.parameters || [],
            this.modalActiveTab
          );
        } else {
          this.modalReadOnlyEditor?.clearHighlights();
        }
      });
    }

    if (copySqlBtn) {
      copySqlBtn.onclick = () => {
        const sqlToCopy = this.modalActiveTab === 'raw'
          ? (tpl.rawSql || tpl.templateSql || '')
          : (tpl.templateSql || tpl.rawSql || '');
        navigator.clipboard.writeText(sqlToCopy);
        toast.success(`已複製 ${this.modalActiveTab === 'raw' ? 'Raw SQL' : 'SQL Template'} 至剪貼簿！`);
      };
    }

    if (apiBtn) {
      apiBtn.onclick = () => {
        ModalManager.showApiModal(tpl);
      };
    }

    this.closeDetailModal = () => {
      this.modalTemplateId = null;
      this.modalReadOnlyEditor?.dispose?.();
      this.modalReadOnlyEditor = null;
      overlay.classList.remove('active');
    };

    closeBtn.onclick = () => this.closeDetailModal();
    closeIconBtn.onclick = () => this.closeDetailModal();
    overlay.onclick = (e) => {
      if (e.target.id === 'catalog-modal-overlay') this.closeDetailModal();
    };

    this.initSplitter();
    overlay.classList.add('active');
  }

  async _renderSqlEditor(tpl) {
    const editorArea = document.getElementById('catalog-editor-area');
    if (!editorArea) return;

    this.modalReadOnlyEditor?.dispose?.();
    this.modalReadOnlyEditor = null;
    editorArea.innerHTML = '';

    const tabRaw = document.getElementById('catalog-tab-raw');
    const tabTemplate = document.getElementById('catalog-tab-template');
    if (tabRaw) tabRaw.classList.toggle('active', this.modalActiveTab === 'raw');
    if (tabTemplate) tabTemplate.classList.toggle('active', this.modalActiveTab === 'template');

    const currentSql = this.modalActiveTab === 'raw'
      ? (tpl.rawSql || tpl.templateSql || '')
      : (tpl.templateSql || tpl.rawSql || '');

    this.modalReadOnlyEditor = new SqlReadOnlyEditor(editorArea);
    await this.modalReadOnlyEditor.init(currentSql);

    if (this.modalHighlightEnabled) {
      const piiFields = (tpl.columns || [])
        .filter(c => c.isPii)
        .map(c => c.name)
        .concat(tpl.piiFields || []);
      this.modalReadOnlyEditor.updateHighlights(
        Array.from(new Set(piiFields)),
        tpl.parameters || [],
        this.modalActiveTab
      );
    }
  }

  initSplitter() {
    const splitter = document.getElementById('catalog-splitter');
    const leftPane = document.getElementById('catalog-sql-pane');
    const modalBody = document.getElementById('modal-catalog-body');
    if (!splitter || !leftPane || !modalBody) return;

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
      const bodyRect = modalBody.getBoundingClientRect();
      const newLeftWidth = e.clientX - bodyRect.left;
      const totalWidth = bodyRect.width;

      const minLeft = 280;
      const minRight = 280;
      const maxLeft = totalWidth - minRight;

      if (newLeftWidth >= minLeft && newLeftWidth <= maxLeft) {
        const leftPercent = (newLeftWidth / totalWidth) * 100;
        leftPane.style.width = `${leftPercent}%`;
        this.modalReadOnlyEditor?.layout?.();
      }
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      splitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.modalReadOnlyEditor?.layout?.();
    };

    splitter.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  buildReadOnlyInfoPaneHTML(tpl) {
    const deptText = tpl.type === 'company'
      ? '<span style="color:#475569;">全公司</span>'
      : (tpl.departments || []).join('、 ') || '-';

    const dbText = (tpl.databases || []).join(', ') || '-';

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
            <span class="review-meta-label">業務說明</span>
            <span class="review-meta-value" style="color:#475569;line-height:1.5;">${tpl.description || '無描述'}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Columns & Sensitivity -->
      <div class="review-info-section">
        <div class="review-section-heading">
          <h3>輸出欄位與敏感資訊</h3>
          <span style="font-size:12px;color:#64748b;">${(tpl.piiFields || []).length > 0 ? `含 ${(tpl.piiFields || []).length} 個敏感欄位` : '無敏感欄位'}</span>
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
          <h3>動態參數 (Parameters)</h3>
          <span style="font-size:12px;color:#94a3b8;">${params.length} 個</span>
        </div>
        <div class="review-param-list">
          ${paramItems}
        </div>
      </div>
    `;
  }
}
