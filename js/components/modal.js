/**
 * Modal & Lightbox Component Manager
 */

import { toast } from './toast.js';

export class ModalManager {
  static showApiModal(template) {
    const overlay = document.getElementById('api-modal-overlay');
    if (!overlay) return;

    document.getElementById('api-modal-tpl-name').textContent = `${template.name} (${template.id})`;

    const paramsObj = {};
    (template.parameters || []).forEach(p => {
      paramsObj[p.name] = p.defaultVal ? p.defaultVal.replace(/'/g, '') : 'example_value';
    });

    const jsonPayload = JSON.stringify({
      template_id: template.id,
      target_db: (template.databases && template.databases[0]) || 'DBName2',
      parameters: paramsObj
    }, null, 2);

    // Code generators
    const curlCode = `curl -X POST https://api.datastudio.internal/v1/sql/execute \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload}'`;

    const pythonCode = `import requests

url = "https://api.datastudio.internal/v1/sql/execute"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN",
    "Content-Type": "application/json"
}
payload = ${jsonPayload}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print("Execution Result:", data)`;

    const javaCode = `// Java 11+ HttpClient Example
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.datastudio.internal/v1/sql/execute"))
    .header("Authorization", "Bearer YOUR_API_TOKEN")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(${JSON.stringify(jsonPayload)}))
    .build();

HttpClient.newHttpClient().sendAsync(request, HttpResponse.BodyHandlers.ofString())
    .thenApply(HttpResponse::body)
    .thenAccept(System.out::println);`;

    const codeContainer = document.getElementById('api-modal-code');
    const tabs = document.querySelectorAll('.api-tab-btn');

    let currentTab = 'curl';
    const renderCode = () => {
      if (currentTab === 'curl') codeContainer.textContent = curlCode;
      else if (currentTab === 'python') codeContainer.textContent = pythonCode;
      else if (currentTab === 'java') codeContainer.textContent = javaCode;
    };

    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.lang;
        renderCode();
      };
    });

    renderCode();

    const copyBtn = document.getElementById('api-modal-copy-btn');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(codeContainer.textContent);
      toast.success('API 調用代碼已複製到剪貼簿！');
    };

    overlay.classList.add('active');
  }

  static closeApiModal() {
    const overlay = document.getElementById('api-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  static showRejectModal(onConfirm) {
    const overlay = document.getElementById('reject-modal-overlay');
    const textarea = document.getElementById('reject-reason-input');
    const confirmBtn = document.getElementById('reject-modal-confirm-btn');
    if (!overlay || !textarea || !confirmBtn) return;

    textarea.value = '';
    textarea.classList.remove('is-invalid');

    confirmBtn.onclick = () => {
      const reason = textarea.value.trim();
      if (!reason) {
        textarea.classList.add('is-invalid');
        textarea.focus();
        toast.danger('請務必填寫退回原因，以利提交者修正！');
        return;
      }
      ModalManager.closeRejectModal();
      onConfirm(reason);
    };

    overlay.classList.add('active');
    setTimeout(() => textarea.focus(), 100);
  }

  static closeRejectModal() {
    const overlay = document.getElementById('reject-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  static showDeleteModal(onConfirm, templateName = '') {
    const overlay = document.getElementById('delete-modal-overlay');
    const titleEl = document.getElementById('delete-modal-tpl-name');
    const textarea = document.getElementById('delete-reason-input');
    const confirmBtn = document.getElementById('delete-modal-confirm-btn');
    if (!overlay || !textarea || !confirmBtn) return;

    if (titleEl) titleEl.textContent = templateName ? `樣板：${templateName}` : '';
    textarea.value = '';
    textarea.classList.remove('is-invalid');

    confirmBtn.onclick = () => {
      const reason = textarea.value.trim();
      if (!reason) {
        textarea.classList.add('is-invalid');
        textarea.focus();
        toast.danger('請務必填寫刪除申請原因！');
        return;
      }
      ModalManager.closeDeleteModal();
      onConfirm(reason);
    };

    overlay.classList.add('active');
    setTimeout(() => textarea.focus(), 100);
  }

  static closeDeleteModal() {
    const overlay = document.getElementById('delete-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  static showConfirmModal({
    title = '確認操作',
    content = '您確定要執行此操作嗎？',
    type = 'danger', // 'danger' | 'primary' | 'warning'
    confirmText = '確認',
    cancelText = '取消',
    onConfirm
  }) {
    let overlay = document.getElementById('global-confirm-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-confirm-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-container" style="max-width: 440px; z-index: 10000; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
          <div class="modal-header" id="confirm-modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 14px 18px;">
            <div class="modal-title" id="confirm-modal-title" style="font-size: 14px; font-weight: 600;">確認操作</div>
            <button class="btn btn-outline btn-xs" id="btn-close-confirm-modal">✕</button>
          </div>
          <div class="modal-body" style="padding: 18px 20px;">
            <div id="confirm-modal-content" style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line;"></div>
          </div>
          <div class="modal-footer" style="padding: 12px 18px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 8px;">
            <button class="btn btn-outline btn-sm" id="btn-cancel-confirm-modal">取消</button>
            <button class="btn btn-sm" id="btn-confirm-action">確認</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById('confirm-modal-title');
    const headerEl = document.getElementById('confirm-modal-header');
    const contentEl = document.getElementById('confirm-modal-content');
    const confirmBtn = document.getElementById('btn-confirm-action');
    const cancelBtn = document.getElementById('btn-cancel-confirm-modal');
    const closeBtn = document.getElementById('btn-close-confirm-modal');

    titleEl.textContent = title;
    contentEl.textContent = content;

    if (type === 'danger') {
      headerEl.style.background = '#fff1f2';
      headerEl.style.borderBottomColor = '#fecdd3';
      titleEl.style.color = '#9f1239';
      confirmBtn.className = 'btn btn-danger btn-sm';
    } else if (type === 'warning') {
      headerEl.style.background = '#fffbeb';
      headerEl.style.borderBottomColor = '#fde68a';
      titleEl.style.color = '#92400e';
      confirmBtn.className = 'btn btn-warning btn-sm';
    } else {
      headerEl.style.background = '#f8fafc';
      headerEl.style.borderBottomColor = '#e2e8f0';
      titleEl.style.color = '#0f172a';
      confirmBtn.className = 'btn btn-primary btn-sm';
    }

    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    const closeModal = () => {
      overlay.classList.remove('active');
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    confirmBtn.onclick = () => {
      closeModal();
      if (onConfirm) onConfirm();
    };

    overlay.classList.add('active');
  }

  static showLightbox(imgSrc, title = '執行截圖憑證預覽') {
    let overlay = document.getElementById('global-lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-lightbox-overlay';
      overlay.className = 'lightbox-overlay';
      overlay.innerHTML = `
        <div class="lightbox-content">
          <div class="lightbox-header">
            <span id="lightbox-title">憑證預覽</span>
            <button style="background:none; border:none; color:white; font-size:18px; cursor:pointer;" onclick="document.getElementById('global-lightbox-overlay').classList.remove('active')">✕</button>
          </div>
          <img id="lightbox-img" class="lightbox-img" src="" alt="Screenshot" />
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      };
    }

    document.getElementById('lightbox-title').textContent = title;
    document.getElementById('lightbox-img').src = imgSrc;
    overlay.classList.add('active');
  }
}
