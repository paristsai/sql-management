/**
 * Toast Notification Component
 */

class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <div style="font-size: 16px;">${icon}</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 2px;">${type.toUpperCase()}</div>
        <div style="color: var(--text-secondary); line-height: 1.4;">${message}</div>
      </div>
      <button style="border:none; background:transparent; cursor:pointer; color:var(--text-muted); font-size:14px;" onclick="this.parentElement.remove()">✕</button>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  danger(msg) { this.show(msg, 'danger'); }
  warning(msg) { this.show(msg, 'warning'); }
  info(msg) { this.show(msg, 'info'); }
}

export const toast = new ToastManager();
