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
      target_db: (template.databases && template.databases[0]) || 'MySQL_Master',
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
