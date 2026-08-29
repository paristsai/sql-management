/**
 * Review & Audit Center View Controller
 * Redesigned with Ant Design Enterprise Tabs & Full Review Modal
 */

import { store } from '../store.js';
import { toast } from '../components/toast.js';
import { SqlDiffViewer } from '../components/editor.js';
import { ModalManager } from '../components/modal.js';

export class ReviewView {
  constructor(container) {
    this.container = container;
    this.activeTab = 'assigned'; // 'assigned' | 'my' | 'all'
    this.modalTemplateId = null;
    this.modalDiffViewer = null;
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
        this.updateModalContent(this.modalTemplateId);
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
                    <th style="width: 110px;">安全 / PII</th>
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
          <span class="review-stat-value" style="color:#d97706;">${pendingAssigned}</span>
          <span class="review-stat-desc">目前指派給您的待辦</span>
        </div>
        <div class="review-stat-icon-wrap stat-icon-amber" style="font-weight:bold; font-size:16px;">PEND</div>
      </div>

      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">全平台審核中 (In Review)</span>
          <span class="review-stat-value" style="color:#2563eb;">${totalPending}</span>
          <span class="review-stat-desc">等待主管覆核之樣板</span>
        </div>
        <div class="review-stat-icon-wrap stat-icon-blue" style="font-weight:bold; font-size:16px;">REV</div>
      </div>

      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">已核准發布 (Approved)</span>
          <span class="review-stat-value" style="color:#059669;">${totalApproved}</span>
          <span class="review-stat-desc">正式發布生效之 SQL</span>
        </div>
        <div class="review-stat-icon-wrap stat-icon-emerald" style="font-weight:bold; font-size:16px;">OK</div>
      </div>

      <div class="review-stat-card">
        <div class="review-stat-info">
          <span class="review-stat-label">我的送審紀錄 (My Requests)</span>
          <span class="review-stat-value" style="color:#475569;">${mySubmissions}</span>
          <span class="review-stat-desc">您建立或送審的項目</span>
        </div>
        <div class="review-stat-icon-wrap stat-icon-slate" style="font-weight:bold; font-size:16px;">MY</div>
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
      // Status Tag
      let statusTag = '';
      if (t.reviewStatus === 'In Review') {
        statusTag = `<span class="ant-tag ant-tag-processing">審核中</span>`;
      } else if (t.reviewStatus === 'Approved') {
        statusTag = `<span class="ant-tag ant-tag-success">已核准</span>`;
      } else {
        statusTag = `<span class="ant-tag ant-tag-default">草稿/退回</span>`;
      }

      // PII Tag
      const piiFields = t.piiFields || [];
      let piiTag = '';
      if (piiFields.length > 0) {
        piiTag = `<span class="ant-tag ant-tag-error" title="${piiFields.join(', ')}">${piiFields.length} 個 PII</span>`;
      } else {
        piiTag = `<span class="ant-tag ant-tag-success">無敏感欄位</span>`;
      }

      // Dept Tags
      const deptBadges = (t.departments || []).map(d => `<span class="ant-tag ant-tag-purple" style="font-size:11px;">${d}</span>`).join(' ');

      // Database
      const dbBadge = (t.databases || []).map(db => `<span class="ant-tag ant-tag-default" style="font-size:11px;">${db}</span>`).join(' ');

      return `
        <tr class="ant-table-row" data-id="${t.id}">
          <td style="font-family: var(--font-mono); font-weight: 600; color: #1677ff;">${t.id}</td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${t.name}</div>
            <div class="text-xs text-secondary" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">
              ${t.description || '無描述'}
            </div>
          </td>
          <td>${deptBadges || '<span class="text-muted text-xs">-</span>'}</td>
          <td>${dbBadge || '<span class="text-muted text-xs">-</span>'}</td>
          <td>${piiTag}</td>
          <td>
            <div style="font-size: 12px; font-weight: 500;">${t.author || '-'}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              審核：<strong>${t.assignee || '未指定'}</strong>
            </div>
          </td>
          <td>${statusTag}</td>
          <td style="font-size: 12px; color: var(--text-secondary);">${t.updatedAt || '-'}</td>
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
    const overlay = document.getElementById('review-modal-overlay');
    const modalBody = document.getElementById('modal-review-body');
    const titleEl = document.getElementById('modal-review-title');
    const typeBadge = document.getElementById('modal-review-type-badge');
    const statusBadge = document.getElementById('modal-review-status-badge');
    const authorEl = document.getElementById('modal-review-author');
    const assigneeEl = document.getElementById('modal-review-assignee');

    if (!overlay || !modalBody) return;

    titleEl.textContent = `[${tpl.id}] ${tpl.name}`;
    typeBadge.textContent = tpl.type === 'dept' ? '部門專用 SQL' : '全公司通用 SQL';

    if (tpl.reviewStatus === 'In Review') {
      statusBadge.className = 'ant-tag ant-tag-processing';
      statusBadge.textContent = '審核中 (In Review)';
    } else if (tpl.reviewStatus === 'Approved') {
      statusBadge.className = 'ant-tag ant-tag-success';
      statusBadge.textContent = '已核准發布 (Approved)';
    } else {
      statusBadge.className = 'ant-tag ant-tag-default';
      statusBadge.textContent = '草稿 / 退回 (Draft)';
    }

    if (authorEl) authorEl.textContent = tpl.author || 'Alex Chen';
    if (assigneeEl) assigneeEl.textContent = tpl.assignee || 'John Doe (Data Architect)';

    // Inject 2-Pane Body
    modalBody.innerHTML = `
      <!-- Left Pane: Code Diff (62%) -->
      <div class="modal-diff-pane">
        <div class="modal-diff-toolbar">
          <div>
            <span>Raw SQL</span>
            <span style="margin: 0 10px; color: #cbd5e1;">|</span>
            <span>SQL Template</span>
          </div>
          <div style="display: flex; gap: 10px; font-size: 11px;">
            <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:#fecaca;border-radius:2px;"></span> 刪除</span>
            <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:#bbf7d0;border-radius:2px;"></span> 新增</span>
            <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:#fef08a;border-radius:2px;"></span> 參數</span>
          </div>
        </div>
        <div id="modal-monaco-diff-container" class="modal-diff-container"></div>
      </div>

      <!-- Right Pane: Governance, Proof & Timeline (38%) -->
      <div class="modal-info-pane">
        <!-- 1. Description & Meta -->
        <div class="review-section-card">
          <div class="review-section-header">
            <span>樣板說明與規格</span>
            <span class="text-xs text-secondary">${tpl.databases ? tpl.databases.join(', ') : ''}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
            ${tpl.description || '無描述說明'}
          </div>
        </div>

        <!-- 2. Security & PII Detection -->
        <div class="review-section-card" id="modal-sec-card">
          <div class="review-section-header">
            <span>敏感欄位偵測 (PII Inspection)</span>
            <span id="modal-pii-count-tag" class="ant-tag ant-tag-error">0 個 PII</span>
          </div>
          <div id="modal-pii-list" style="margin-top: 4px; display:flex; flex-wrap:wrap; gap:6px;">
            <!-- PII list -->
          </div>
        </div>

        <!-- 3. Execution Proof Screenshot -->
        <div class="review-section-card">
          <div class="review-section-header">
            <span>執行憑證截圖 (Proof of Execution)</span>
          </div>
          <div id="modal-proof-container">
            <!-- Proofs -->
          </div>
        </div>

        <!-- 4. Audit History Timeline -->
        <div class="review-section-card">
          <div class="review-section-header">
            <span>審核歷程紀錄 (Audit Timeline)</span>
          </div>
          <div class="timeline" id="modal-audit-timeline" style="margin-top: 6px;">
            <!-- History items -->
          </div>
        </div>
      </div>
    `;

    // Render Steps Component in Modal Footer
    this.renderModalSteps(tpl);

    // Render Diff Editor
    const diffContainer = modalBody.querySelector('#modal-monaco-diff-container');
    if (diffContainer) {
      diffContainer.innerHTML = '';
      this.modalDiffViewer = new SqlDiffViewer(diffContainer);
      await this.modalDiffViewer.init(tpl.rawSql || tpl.templateSql || '', tpl.templateSql || '');
    }

    // Populate Right Pane Details
    this.updateModalContent(id);

    // Button state in Modal Footer
    const rejectBtn = document.getElementById('btn-modal-review-reject');
    const approveBtn = document.getElementById('btn-modal-review-approve');
    const editBtn = document.getElementById('btn-modal-review-edit');

    if (rejectBtn) {
      rejectBtn.onclick = () => {
        ModalManager.showRejectModal((reason) => {
          store.rejectTemplate(id, reason);
          toast.warning(`Template [${id}] 已退回修正！`);
          overlay.classList.remove('active');
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
            store.approveTemplate(id);
            toast.success(`Template [${id}] 審核通過，正式發布上線！`);
            overlay.classList.remove('active');
          }
        };
      }
    }

    if (editBtn) {
      editBtn.onclick = () => {
        overlay.classList.remove('active');
        window.AppRouter.navigate('studio', { mode: 'edit', id });
      };
    }

    overlay.classList.add('active');
  }

  renderModalSteps(tpl) {
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
