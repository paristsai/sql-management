/**
 * Catalog Hub View Controller
 */

import { store } from '../store.js';
import { toast } from '../components/toast.js';
import { ModalManager } from '../components/modal.js';

export class CatalogView {
  constructor(container) {
    this.container = container;
    this.selectedIds = new Set();
    this.filterState = {
      keyword: '',
      dept: 'all',
      db: 'all',
      reviewStatus: 'all',
      usageStatus: 'all',
      hasPii: 'all'
    };
  }

  init() {
    this.render();
    this.bindEvents();
    store.subscribe(() => {
      this.renderTable();
      this.updateBatchBar();
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="catalog-container">
        <!-- Catalog Header -->
        <div class="catalog-header">
          <div class="catalog-title-group">
            <h1>SQL Template 資產目錄 (Catalog Hub)</h1>
            <p>集中管理、版本審核與調用全公司已標準化之數據分析 SQL 樣板庫</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-outline" id="btn-batch-export-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              匯出全量 Catalog
            </button>
            <button class="btn btn-primary" id="btn-create-new-tpl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              建立 SQL Template
            </button>
          </div>
        </div>

        <!-- Filter Card -->
        <div class="catalog-filter-card">
          <div class="filter-row">
            <div class="search-input-wrapper">
              <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
              <input type="text" class="form-input search-input" id="filter-keyword" placeholder="搜尋 Template ID、名稱、SQL 內容、建立者..." />
            </div>

            <div style="min-width: 140px;">
              <select class="form-select" id="filter-dept">
                <option value="all">所有適用部門</option>
                <option value="全公司">全公司通用</option>
                <option value="數據工程部">數據工程部</option>
                <option value="營運企劃部">營運企劃部</option>
                <option value="財務會計部">財務會計部</option>
                <option value="法務合規部">法務合規部</option>
              </select>
            </div>

            <div style="min-width: 130px;">
              <select class="form-select" id="filter-db">
                <option value="all">所有資料庫</option>
                <option value="MySQL_Master">MySQL_Master</option>
                <option value="Trino">Trino</option>
                <option value="Oracle_Fin">Oracle_Fin</option>
                <option value="Snowflake_WH">Snowflake_WH</option>
              </select>
            </div>

            <div style="min-width: 120px;">
              <select class="form-select" id="filter-review-status">
                <option value="all">所有審核狀態</option>
                <option value="Draft">草稿 (Draft)</option>
                <option value="In Review">審核中 (In Review)</option>
                <option value="Approved">審核完畢 (Approved)</option>
              </select>
            </div>

            <div style="min-width: 120px;">
              <select class="form-select" id="filter-usage-status">
                <option value="all">所有使用狀態</option>
                <option value="Active">可使用 (Active)</option>
                <option value="Disabled">停止使用 (Disabled)</option>
              </select>
            </div>

            <div style="min-width: 120px;">
              <select class="form-select" id="filter-pii">
                <option value="all">敏感資料 (PII)</option>
                <option value="has_pii">含 PII 欄位</option>
                <option value="no_pii">無 PII 欄位</option>
              </select>
            </div>

            <button class="btn btn-secondary btn-sm" id="btn-reset-filters" title="重設條件">重設</button>
          </div>
        </div>

        <!-- Batch Action Toolbar (Conditionally shown when items are checked) -->
        <div class="catalog-batch-bar" id="catalog-batch-bar" style="display: none;">
          <div class="batch-info">
            <span>✓ 已選取 <strong id="selected-count">0</strong> 個 SQL Template</span>
          </div>
          <div class="batch-actions">
            <button class="btn btn-outline btn-sm" id="btn-batch-export">批次匯出 (JSON/YAML)</button>
            <button class="btn btn-danger-outline btn-sm" id="btn-batch-disable">批次停用</button>
          </div>
        </div>

        <!-- Table View -->
        <div class="catalog-table-wrapper">
          <table class="catalog-table">
            <thead>
              <tr>
                <th style="width: 40px;"><input type="checkbox" id="th-select-all" /></th>
                <th style="width: 180px;">Template ID</th>
                <th>名稱 / 業務描述</th>
                <th style="width: 120px;">適用部門</th>
                <th style="width: 130px;">綁定 DB</th>
                <th style="width: 140px;">敏感欄位 (PII)</th>
                <th style="width: 110px;">審核狀態</th>
                <th style="width: 100px;">使用狀態</th>
                <th style="width: 140px;">建立者 / 更新時間</th>
                <th style="width: 80px; text-align: center;">操作</th>
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
    // New Template Button
    this.container.querySelector('#btn-create-new-tpl').onclick = () => {
      window.AppRouter.navigate('studio', { mode: 'create' });
    };

    // Filter controls
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
    bindFilter('#filter-usage-status', 'usageStatus');
    bindFilter('#filter-pii', 'hasPii');

    this.container.querySelector('#btn-reset-filters').onclick = () => {
      this.filterState = { keyword: '', dept: 'all', db: 'all', reviewStatus: 'all', usageStatus: 'all', hasPii: 'all' };
      this.container.querySelector('#filter-keyword').value = '';
      this.container.querySelector('#filter-dept').value = 'all';
      this.container.querySelector('#filter-db').value = 'all';
      this.container.querySelector('#filter-review-status').value = 'all';
      this.container.querySelector('#filter-usage-status').value = 'all';
      this.container.querySelector('#filter-pii').value = 'all';
      this.renderTable();
    };

    // Select all checkbox
    this.container.querySelector('#th-select-all').onchange = (e) => {
      const checked = e.target.checked;
      const allFiltered = this.getFilteredData();
      if (checked) {
        allFiltered.forEach(t => this.selectedIds.add(t.id));
      } else {
        this.selectedIds.clear();
      }
      this.renderTable();
      this.updateBatchBar();
    };

    // Batch Export
    this.container.querySelector('#btn-batch-export').onclick = () => this.exportSelected();
    this.container.querySelector('#btn-batch-export-all').onclick = () => {
      const allData = store.getAll();
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sql_templates_catalog_${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      toast.success('全量 Catalog 匯出完成！');
    };

    // Batch Disable
    this.container.querySelector('#btn-batch-disable').onclick = () => {
      if (confirm(`確定要停用選取的 ${this.selectedIds.size} 個 SQL Template 嗎？`)) {
        store.batchDisable(Array.from(this.selectedIds));
        this.selectedIds.clear();
        this.updateBatchBar();
        toast.warning('所選 Template 已批次停用');
      }
    };

    // Close any action menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.action-menu-container')) {
        document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.remove('active'));
      }
    });
  }

  getFilteredData() {
    const list = store.getAll();
    return list.filter(item => {
      // Keyword
      if (this.filterState.keyword) {
        const kw = this.filterState.keyword.toLowerCase();
        const matchId = item.id.toLowerCase().includes(kw);
        const matchName = item.name.toLowerCase().includes(kw);
        const matchSql = (item.templateSql || '').toLowerCase().includes(kw);
        const matchAuthor = (item.author || '').toLowerCase().includes(kw);
        if (!matchId && !matchName && !matchSql && !matchAuthor) return false;
      }

      // Dept
      if (this.filterState.dept !== 'all') {
        if (this.filterState.dept === '全公司' && item.type !== 'company') return false;
        if (this.filterState.dept !== '全公司' && !(item.departments || []).includes(this.filterState.dept)) return false;
      }

      // DB
      if (this.filterState.db !== 'all') {
        if (!(item.databases || []).includes(this.filterState.db)) return false;
      }

      // Review Status
      if (this.filterState.reviewStatus !== 'all') {
        if (item.reviewStatus !== this.filterState.reviewStatus) return false;
      }

      // Usage Status
      if (this.filterState.usageStatus !== 'all') {
        if (item.usageStatus !== this.filterState.usageStatus) return false;
      }

      // PII
      if (this.filterState.hasPii !== 'all') {
        const hasPii = (item.piiFields && item.piiFields.length > 0);
        if (this.filterState.hasPii === 'has_pii' && !hasPii) return false;
        if (this.filterState.hasPii === 'no_pii' && hasPii) return false;
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
          <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
            無符合條件的 SQL Template 紀錄
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(tpl => {
      const isChecked = this.selectedIds.has(tpl.id);

      // Review badge
      let reviewBadge = `<span class="badge badge-draft"><span class="badge-dot"></span> 草稿</span>`;
      if (tpl.reviewStatus === 'In Review') {
        reviewBadge = `<span class="badge badge-review"><span class="badge-dot"></span> 審核中</span>`;
      } else if (tpl.reviewStatus === 'Approved') {
        reviewBadge = `<span class="badge badge-approved"><span class="badge-dot"></span> 審核完畢</span>`;
      }

      // Usage badge
      let usageBadge = `<span class="badge badge-disabled">停止使用</span>`;
      if (tpl.usageStatus === 'Active') {
        usageBadge = `<span class="badge badge-active">可使用</span>`;
      }

      // PII tags
      let piiTags = '<span style="color: var(--text-muted); font-size:12px;">無</span>';
      if (tpl.piiFields && tpl.piiFields.length > 0) {
        piiTags = tpl.piiFields.map(f => `<span class="tag-pii">${f}</span>`).join(' ');
      }

      // DB tags
      const dbTags = (tpl.databases || []).map(db => `<span class="tag-db">${db}</span>`).join(' ');

      // Dept
      const deptText = tpl.type === 'company'
        ? '<span class="badge" style="background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe;">全公司</span>'
        : (tpl.departments || []).map(d => `<span class="tag-dept">${d}</span>`).join(' ');

      return `
        <tr data-id="${tpl.id}">
          <td>
            <input type="checkbox" class="row-checkbox" data-id="${tpl.id}" ${isChecked ? 'checked' : ''} />
          </td>
          <td>
            <span class="tpl-id-cell" title="點擊前往編輯" data-action="edit" data-id="${tpl.id}">
              ${tpl.id}
            </span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${tpl.name}</div>
            <div style="font-size: 11px; color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${tpl.description || '無業務說明'}
            </div>
          </td>
          <td>${deptText}</td>
          <td>${dbTags}</td>
          <td>${piiTags}</td>
          <td>${reviewBadge}</td>
          <td>${usageBadge}</td>
          <td>
            <div style="font-weight: 500; font-size: 12px;">${tpl.author || '-'}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${tpl.updatedAt || '-'}</div>
          </td>
          <td style="text-align: center;">
            <div class="action-menu-container">
              <button class="btn btn-secondary btn-xs btn-icon btn-action-toggle" title="更多操作">
                ⋮
              </button>
              <div class="action-menu-dropdown">
                <button class="action-menu-item" data-action="copy-id" data-id="${tpl.id}">
                  複製 ID
                </button>
                <button class="action-menu-item" data-action="duplicate" data-id="${tpl.id}">
                  複製建立 (Duplicate)
                </button>
                <button class="action-menu-item" data-action="edit" data-id="${tpl.id}">
                  進入編輯
                </button>
                ${tpl.reviewStatus === 'In Review' ? `
                <button class="action-menu-item" data-action="goto-review" data-id="${tpl.id}" style="color:var(--primary); font-weight:600;">
                  前往審核中心
                </button>` : ''}
                <hr style="border:none; border-top:1px solid var(--border-light); margin:2px 0;">
                ${tpl.reviewStatus === 'Approved' ? `
                <button class="action-menu-item" data-action="toggle-status" data-id="${tpl.id}">
                  ${tpl.usageStatus === 'Active' ? '停止使用' : '啟用 (Active)'}
                </button>` : ''}
                <button class="action-menu-item danger-item" data-action="delete" data-id="${tpl.id}">
                  刪除
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.bindTableEvents();
  }

  bindTableEvents() {
    const tbody = this.container.querySelector('#catalog-table-tbody');

    // Row Checkbox
    tbody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.onchange = (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) this.selectedIds.add(id);
        else this.selectedIds.delete(id);
        this.updateBatchBar();
      };
    });

    // Action Dropdown Toggle
    tbody.querySelectorAll('.btn-action-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isActive = dropdown.classList.contains('active');
        document.querySelectorAll('.action-menu-dropdown').forEach(d => d.classList.remove('active'));
        if (!isActive) dropdown.classList.add('active');
      };
    });

    // Action clicks
    tbody.querySelectorAll('[data-action]').forEach(elem => {
      elem.onclick = (e) => {
        const action = elem.dataset.action;
        const id = elem.dataset.id;
        const tpl = store.getById(id);
        if (!tpl) return;

        if (action === 'copy-id') {
          navigator.clipboard.writeText(tpl.id);
          toast.success(`已複製 ID: ${tpl.id}`);
        } else if (action === 'api-sample') {
          ModalManager.showApiModal(tpl);
        } else if (action === 'duplicate') {
          const newId = `${tpl.id}_COPY`;
          const duplicated = JSON.parse(JSON.stringify(tpl));
          duplicated.id = newId;
          duplicated.name = `${tpl.name} (副本)`;
          duplicated.reviewStatus = 'Draft';
          duplicated.usageStatus = 'Disabled';
          store.saveTemplate(duplicated);
          toast.success(`已建立副本 ${newId}`);
          window.AppRouter.navigate('studio', { mode: 'edit', id: newId });
        } else if (action === 'edit') {
          window.AppRouter.navigate('studio', { mode: 'edit', id: tpl.id });
        } else if (action === 'goto-review') {
          window.AppRouter.navigate('review', { id: tpl.id });
        } else if (action === 'toggle-status') {
          store.toggleUsageStatus(tpl.id);
          toast.info(`Template ${tpl.id} 狀態已更新`);
        } else if (action === 'delete') {
          if (confirm(`確定要刪除 Template ${tpl.id} 嗎？此操作不可復原。`)) {
            store.deleteTemplate(tpl.id);
            this.selectedIds.delete(tpl.id);
            toast.warning(`已刪除 ${tpl.id}`);
          }
        }
      };
    });
  }

  updateBatchBar() {
    const bar = this.container.querySelector('#catalog-batch-bar');
    const countElem = this.container.querySelector('#selected-count');
    if (!bar || !countElem) return;

    const count = this.selectedIds.size;
    countElem.textContent = count;
    bar.style.display = count > 0 ? 'flex' : 'none';
  }

  exportSelected() {
    const selected = Array.from(this.selectedIds).map(id => store.getById(id)).filter(Boolean);
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql_templates_export_${this.selectedIds.size}_items.json`;
    a.click();
    toast.success(`已成功匯出 ${selected.length} 筆 Template！`);
  }
}
