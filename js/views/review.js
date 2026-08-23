/**
 * Review & Audit Center View Controller
 */

import { store } from '../store.js';
import { toast } from '../components/toast.js';
import { SqlDiffViewer } from '../components/editor.js';
import { ModalManager } from '../components/modal.js';

export class ReviewView {
  constructor(container) {
    this.container = container;
    this.currentId = null;
    this.diffViewer = null;
    this.currentTemplate = null;
  }

  async init(params = {}) {
    this.currentId = params.id || null;
    this.renderLayout();
    await this.initDiffViewer();
    this.loadReviewData();
    this.bindEvents();

    store.subscribe(() => {
      this.updateTemplateSelector();
      if (this.currentId) this.loadReviewData();
    });
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="review-container">
        <!-- Review Header -->
        <div class="review-header">
          <div class="review-header-left">
            <span class="badge badge-review" style="font-size:12px;">🛡️ 審核中心 (Review & Audit)</span>
            <div class="review-select-wrapper">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">選擇審核項目:</label>
              <select class="form-select" id="review-template-select" style="min-width: 280px; padding: 4px 8px; font-size: 12px;">
                <!-- Populated dynamically -->
              </select>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn btn-outline btn-sm" id="btn-review-back-catalog">返回資產目錄</button>
            <button class="btn btn-outline btn-sm" id="btn-review-edit-current">✏️ 進入編輯工作台</button>
          </div>
        </div>

        <!-- Review Body -->
        <div class="review-body">
          <!-- Left: Code Diff (60%) -->
          <div class="review-left-pane">
            <div class="diff-header">
              <div id="diff-mode-label">
                <span>◀ 原始可跑 SQL (Raw)</span>
                <span style="margin: 0 12px; color: var(--border-color);">|</span>
                <span>▶ 挖洞 Template SQL (現送審版本)</span>
              </div>
              <div class="diff-legend">
                <div class="legend-item">
                  <div class="legend-box deleted"></div>
                  <span>刪除</span>
                </div>
                <div class="legend-item">
                  <div class="legend-box added"></div>
                  <span>新增</span>
                </div>
                <div class="legend-item">
                  <div class="legend-box param"></div>
                  <span>參數化</span>
                </div>
              </div>
            </div>

            <!-- Monaco Diff Editor Container -->
            <div id="monaco-diff-container"></div>
          </div>

          <!-- Right: Audit Checklist & Risk Indicators (40%) -->
          <div class="review-right-pane">
            <!-- Review Status Summary -->
            <div class="card" style="margin-bottom: 12px;">
              <div class="card-body" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 11px; color: var(--text-secondary);">目前審核狀態</div>
                  <div id="review-current-status-badge" style="margin-top: 4px;">
                    <span class="badge badge-review">審核中</span>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 11px; color: var(--text-secondary);">送審者</div>
                  <div id="review-author-name" style="font-weight: 600; font-size: 13px;">-</div>
                </div>
              </div>
            </div>

            <!-- Risk Card 1: PII Alert -->
            <div class="risk-card" id="risk-card-pii">
              <div class="risk-card-title">
                <span style="display:flex; align-items:center; gap:6px;">
                  🛡️ 敏感欄位偵測 (PII Alert)
                </span>
                <span id="risk-pii-badge" class="badge badge-draft">0 個欄位</span>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary);" id="risk-pii-desc">
                本 Template 涉及之個人隱私/機敏個資欄位：
              </div>
              <div class="risk-items-list" id="risk-pii-list">
                <!-- PII tags -->
              </div>
            </div>

            <!-- Risk Card 2: Similarity Alert -->
            <div class="risk-card warning-risk" id="risk-card-similarity">
              <div class="risk-card-title">
                <span style="display:flex; align-items:center; gap:6px;">
                  🔄 相似 SQL 查重警示
                </span>
                <span id="risk-sim-badge" class="badge badge-review">82% 相似</span>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary);" id="risk-sim-desc">
                系統中已存在相似邏輯之樣板：<strong id="risk-sim-target-name">-</strong>
              </div>
            </div>

            <!-- Risk Card 3: Impact Analysis -->
            <div class="risk-card danger-risk" id="risk-card-impact">
              <div class="risk-card-title">
                <span style="display:flex; align-items:center; gap:6px;">
                  💥 衝擊分析評估
                </span>
                <span class="badge badge-disabled">線上依賴</span>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary);" id="risk-impact-content">
                目前有 <strong id="risk-impact-sys-num">4</strong> 個線上排程/DAG 與 <strong id="risk-impact-usr-num">18</strong> 位使用者調用此樣板。
              </div>
            </div>

            <!-- Card 4: Execution Proof & Screenshots -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">🖼️ 執行憑證與截圖 (Proof of Execution)</div>
              </div>
              <div class="card-body">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                  建立者上傳之真實資料庫執行測試紀錄 (點擊可放大檢視)：
                </div>
                <div class="proof-thumbnail-container" id="proof-thumbnails-container">
                  <!-- Screenshots -->
                </div>
              </div>
            </div>

            <!-- Card 5: Audit History Timeline -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">📜 審核歷史與歷程 (Timeline)</div>
              </div>
              <div class="card-body">
                <div class="timeline" id="audit-timeline">
                  <!-- Timeline steps -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fixed Bottom Action Bar -->
        <div class="review-bottom-bar">
          <div class="review-info-hint">
            <span style="font-size:16px;">⚖️</span>
            <span>作為審核主管，請確認程式碼品質、PII 遵循、索引效能與執行憑證真實性。</span>
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="btn btn-danger-outline" id="btn-audit-reject">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              退回修正 (Reject)
            </button>
            <button class="btn btn-success" id="btn-audit-approve">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              核准發布 (Approve)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async initDiffViewer() {
    const diffContainer = this.container.querySelector('#monaco-diff-container');
    this.diffViewer = new SqlDiffViewer(diffContainer);
    await this.diffViewer.init('', '');
  }

  updateTemplateSelector() {
    const select = this.container.querySelector('#review-template-select');
    if (!select) return;

    const all = store.getAll();
    if (all.length === 0) {
      select.innerHTML = '<option value="">無 Template</option>';
      return;
    }

    if (!this.currentId || !store.getById(this.currentId)) {
      // Find first "In Review" or first item
      const inReview = all.find(t => t.reviewStatus === 'In Review');
      this.currentId = inReview ? inReview.id : all[0].id;
    }

    select.innerHTML = all.map(t => `
      <option value="${t.id}" ${t.id === this.currentId ? 'selected' : ''}>
        [${t.reviewStatus === 'In Review' ? '審核中' : (t.reviewStatus === 'Approved' ? '已核准' : '草稿')}] ${t.id} - ${t.name}
      </option>
    `).join('');
  }

  loadReviewData() {
    this.updateTemplateSelector();
    const tpl = store.getById(this.currentId);
    if (!tpl) return;

    this.currentTemplate = tpl;

    // Diff Editor Update
    const rawSql = tpl.rawSql || tpl.templateSql || '';
    const templateSql = tpl.templateSql || '';
    this.diffViewer.setValues(rawSql, templateSql);

    // Status Badge
    const statusBadgeContainer = this.container.querySelector('#review-current-status-badge');
    if (tpl.reviewStatus === 'In Review') {
      statusBadgeContainer.innerHTML = `<span class="badge badge-review"><span class="badge-dot"></span> 審核中 (In Review)</span>`;
    } else if (tpl.reviewStatus === 'Approved') {
      statusBadgeContainer.innerHTML = `<span class="badge badge-approved"><span class="badge-dot"></span> 審核完畢 (${tpl.usageStatus === 'Active' ? '可使用' : '停止使用'})</span>`;
    } else {
      statusBadgeContainer.innerHTML = `<span class="badge badge-draft"><span class="badge-dot"></span> 草稿 (Draft)</span>`;
    }

    this.container.querySelector('#review-author-name').textContent = tpl.author || 'Alex Chen';

    // Risk Card 1: PII
    const piiCard = this.container.querySelector('#risk-card-pii');
    const piiBadge = this.container.querySelector('#risk-pii-badge');
    const piiList = this.container.querySelector('#risk-pii-list');
    const piiFields = tpl.piiFields || [];

    if (piiFields.length > 0) {
      piiCard.className = 'risk-card danger-risk';
      piiBadge.className = 'badge badge-disabled';
      piiBadge.textContent = `${piiFields.length} 個 PII 欄位`;
      piiList.innerHTML = piiFields.map(f => `<span class="tag-pii">🛡️ ${f}</span>`).join(' ');
    } else {
      piiCard.className = 'risk-card success-risk';
      piiBadge.className = 'badge badge-approved';
      piiBadge.textContent = '無敏感欄位';
      piiList.innerHTML = `<span style="font-size:12px; color:var(--success-text);">✓ 未偵測到身分證、電話、銀行帳號等敏感個資</span>`;
    }

    // Risk Card 2: Similarity
    const simCard = this.container.querySelector('#risk-card-similarity');
    const simTargetName = this.container.querySelector('#risk-sim-target-name');
    const otherTpl = store.getAll().find(t => t.id !== tpl.id);
    if (otherTpl) {
      simCard.style.display = 'block';
      simTargetName.textContent = `[${otherTpl.id}] ${otherTpl.name}`;
    } else {
      simCard.style.display = 'none';
    }

    // Risk Card 3: Impact
    const impactCard = this.container.querySelector('#risk-card-impact');
    if (tpl.impact && (tpl.impact.affectedSystems > 0 || tpl.impact.affectedUsers > 0)) {
      impactCard.style.display = 'block';
      this.container.querySelector('#risk-impact-sys-num').textContent = tpl.impact.affectedSystems;
      this.container.querySelector('#risk-impact-usr-num').textContent = tpl.impact.affectedUsers;
    } else {
      impactCard.style.display = 'none';
    }

    // Execution Proofs
    const proofsContainer = this.container.querySelector('#proof-thumbnails-container');
    const attachments = tpl.attachments || [];
    if (attachments.length > 0) {
      proofsContainer.innerHTML = attachments.map(att => `
        <div style="text-align: center;">
          <img src="${att.url}" alt="${att.name}" class="proof-thumbnail" data-url="${att.url}" data-name="${att.name}" />
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${att.name}</div>
        </div>
      `).join('');

      proofsContainer.querySelectorAll('.proof-thumbnail').forEach(img => {
        img.onclick = () => {
          ModalManager.showLightbox(img.dataset.url, `執行憑證放大檢視: ${img.dataset.name}`);
        };
      });
    } else {
      proofsContainer.innerHTML = `<span style="font-size:12px; color:var(--danger);">⚠️ 提交者未上傳執行成功截圖憑證！</span>`;
    }

    // Timeline History
    const timeline = this.container.querySelector('#audit-timeline');
    const history = tpl.history || [];
    timeline.innerHTML = history.map(h => `
      <div class="timeline-step">
        <div class="timeline-dot ${h.action === 'Approve' ? 'success' : (h.action === 'Reject' ? 'danger' : '')}"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-user">${h.user} - <span style="font-weight:normal; color:var(--text-secondary);">${h.action}</span></span>
            <span class="timeline-time">${h.time}</span>
          </div>
          ${h.comment ? `<div class="timeline-comment">${h.comment}</div>` : ''}
        </div>
      </div>
    `).join('');

    // Bottom action button states
    const rejectBtn = this.container.querySelector('#btn-audit-reject');
    const approveBtn = this.container.querySelector('#btn-audit-approve');

    if (tpl.reviewStatus === 'Approved') {
      approveBtn.disabled = true;
      approveBtn.textContent = '✓ 已核准上線';
    } else {
      approveBtn.disabled = false;
      approveBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        核准發布 (Approve)
      `;
    }
  }

  bindEvents() {
    // Select dropdown change
    this.container.querySelector('#review-template-select').onchange = (e) => {
      this.currentId = e.target.value;
      this.loadReviewData();
    };

    // Back to Catalog
    this.container.querySelector('#btn-review-back-catalog').onclick = () => {
      window.AppRouter.navigate('catalog');
    };

    // Edit current
    this.container.querySelector('#btn-review-edit-current').onclick = () => {
      if (this.currentId) {
        window.AppRouter.navigate('studio', { mode: 'edit', id: this.currentId });
      }
    };

    // Reject Button
    this.container.querySelector('#btn-audit-reject').onclick = () => {
      if (!this.currentId) return;
      ModalManager.showRejectModal((reason) => {
        store.rejectTemplate(this.currentId, reason);
        toast.warning(`Template ${this.currentId} 已被退回修正！狀態回到「草稿」`);
        this.loadReviewData();
      });
    };

    // Approve Button
    this.container.querySelector('#btn-audit-approve').onclick = () => {
      if (!this.currentId) return;
      if (confirm(`確定核准 Template [${this.currentId}] 上線發布？\n核准後使用狀態將即刻變更為「可使用 (Active)」。`)) {
        store.approveTemplate(this.currentId);
        toast.success(`🎉 Template ${this.currentId} 審核通過！已正式發布上線！`);
        this.loadReviewData();
      }
    };
  }
}
