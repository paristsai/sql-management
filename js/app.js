/**
 * SQL Template Platform - SPA Application Router & Entry Point
 */

import { store } from './store.js';
import { CatalogView } from './views/catalog.js';
import { StudioView } from './views/studio.js';
import { ReviewView } from './views/review.js';
import { ModalManager } from './components/modal.js';
import { toast } from './components/toast.js';

class AppRouter {
  constructor() {
    this.currentRoute = 'catalog';
    this.views = {};
    this.catalogView = null;
    this.studioView = null;
    this.reviewView = null;
  }

  init() {
    // Containers
    this.views = {
      catalog: document.getElementById('view-catalog'),
      studio: document.getElementById('view-studio'),
      review: document.getElementById('view-review')
    };

    this.catalogView = new CatalogView(this.views.catalog);
    this.studioView = new StudioView(this.views.studio);
    this.reviewView = new ReviewView(this.views.review);

    this.catalogView.init();

    this.bindGlobalNavigation();
    this.updatePendingReviewBadge();

    store.subscribe(() => {
      this.updatePendingReviewBadge();
    });

    // Default route
    this.navigate('catalog');
  }

  bindGlobalNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const targetView = btn.dataset.view;
        this.navigate(targetView);
      };
    });

    // Global user switcher
    const userSwitcher = document.getElementById('global-user-switcher');
    if (userSwitcher) {
      userSwitcher.value = store.getCurrentUser();
      userSwitcher.addEventListener('change', (e) => {
        store.setCurrentUser(e.target.value);
        toast.info(`已切換操作視角為：${e.target.value}`);
      });
    }

    // Quick action: reset data
    document.getElementById('btn-reset-demo-data')?.addEventListener('click', () => {
      ModalManager.showConfirmModal({
        title: '⚠️ 重設展示資料',
        content: '確定要將所有 SQL Template 資料重置為系統預設範例？\n此動作將清除當前所有新增、修改與刪除的本機資料。',
        type: 'warning',
        confirmText: '確認重設',
        onConfirm: () => {
          store.resetToDefaults();
          toast.info('系統展示資料已重設');
        }
      });
    });

    // Modal close binds
    document.getElementById('btn-close-api-modal')?.addEventListener('click', () => ModalManager.closeApiModal());
    document.getElementById('api-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'api-modal-overlay') ModalManager.closeApiModal();
    });

    document.getElementById('btn-close-review-modal')?.addEventListener('click', () => {
      document.getElementById('review-modal-overlay')?.classList.remove('active');
    });
    document.getElementById('btn-modal-review-close')?.addEventListener('click', () => {
      document.getElementById('review-modal-overlay')?.classList.remove('active');
    });
    document.getElementById('review-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'review-modal-overlay') {
        document.getElementById('review-modal-overlay').classList.remove('active');
      }
    });

    document.getElementById('btn-close-reject-modal')?.addEventListener('click', () => ModalManager.closeRejectModal());
    document.getElementById('btn-cancel-reject-modal')?.addEventListener('click', () => ModalManager.closeRejectModal());
    document.getElementById('reject-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'reject-modal-overlay') ModalManager.closeRejectModal();
    });

    document.getElementById('btn-close-delete-modal')?.addEventListener('click', () => ModalManager.closeDeleteModal());
    document.getElementById('btn-cancel-delete-modal')?.addEventListener('click', () => ModalManager.closeDeleteModal());
    document.getElementById('delete-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'delete-modal-overlay') ModalManager.closeDeleteModal();
    });
  }

  updatePendingReviewBadge() {
    const inReviewCount = store.getAll().filter(t => t.reviewStatus === 'In Review').length;
    const badge = document.getElementById('nav-review-count');
    if (badge) {
      badge.textContent = inReviewCount;
      if (inReviewCount > 0) {
        badge.classList.add('alert');
      } else {
        badge.classList.remove('alert');
      }
    }
  }

  async navigate(route, params = {}) {
    this.currentRoute = route;

    // Update Nav Buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.dataset.view === route) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Switch View Containers
    Object.keys(this.views).forEach(vKey => {
      if (vKey === route) {
        this.views[vKey].classList.add('active');
      } else {
        this.views[vKey].classList.remove('active');
      }
    });

    // Initialize/Refresh views
    if (route === 'catalog') {
      this.catalogView.renderTable();
    } else if (route === 'studio') {
      await this.studioView.init(params);
    } else if (route === 'review') {
      await this.reviewView.init(params);
    }
  }
}

window.AppRouter = new AppRouter();

document.addEventListener('DOMContentLoaded', () => {
  window.AppRouter.init();
});
