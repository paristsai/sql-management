/**
 * Monaco Editor Integration & Floating Popover Manager
 */

let monacoLoaded = false;
let monacoLoadPromise = null;

export function loadMonaco() {
  if (monacoLoaded) return Promise.resolve(window.monaco);
  if (monacoLoadPromise) return monacoLoadPromise;

  monacoLoadPromise = new Promise((resolve, reject) => {
    if (window.monaco) {
      monacoLoaded = true;
      return resolve(window.monaco);
    }

    // Load Monaco via AMD loader
    const loaderScript = document.createElement('script');
    loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js';
    loaderScript.onload = () => {
      window.require.config({
        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
      });
      window.require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        resolve(window.monaco);
      });
    };
    loaderScript.onerror = reject;
    document.head.appendChild(loaderScript);
  });

  return monacoLoadPromise;
}

export class SqlEditor {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = options;
    this.editor = null;
    this.popoverElement = null;
    this.onParamExtracted = options.onParamExtracted || (() => {});
    this.onPiiMarked = options.onPiiMarked || (() => {});
  }

  async init(initialValue = '') {
    const monaco = await loadMonaco();

    this.editor = monaco.editor.create(this.container, {
      value: initialValue,
      language: 'sql',
      theme: 'vs', // Clean Light Theme
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 }
    });

    this.setupSelectionListener();
    return this.editor;
  }

  setValue(val) {
    if (this.editor) {
      this.editor.setValue(val || '');
    }
  }

  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  setupSelectionListener() {
    // Create popover DOM if not present
    this.popoverElement = document.createElement('div');
    this.popoverElement.className = 'monaco-selection-popover';
    this.popoverElement.style.display = 'none';
    this.container.parentElement.appendChild(this.popoverElement);

    this.editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      if (selection.isEmpty()) {
        this.hidePopover();
        return;
      }

      const selectedText = this.editor.getModel().getValueInRange(selection).trim();
      if (!selectedText || selectedText.length > 80) {
        this.hidePopover();
        return;
      }

      // Get screen coordinates of selection
      const startPos = selection.getStartPosition();
      const coords = this.editor.getScrolledVisiblePosition(startPos);
      if (!coords) {
        this.hidePopover();
        return;
      }

      this.showPopover(coords, selectedText, selection);
    });

    this.editor.onDidScrollChange(() => this.hidePopover());
  }

  showPopover(coords, selectedText, selection) {
    const defaultParamName = selectedText.replace(/['"`\s,=()]/g, '_').toLowerCase().replace(/^_+|_+$/g, '') || 'param';

    this.popoverElement.innerHTML = `
      <div style="font-weight: 600; color: var(--text-secondary);">選取: <code style="color:var(--primary);">${this.escapeHtml(selectedText)}</code></div>
      <button class="btn btn-primary btn-xs" id="popover-btn-param">⚡ 轉為動態參數 {{...}}</button>
      <button class="btn btn-secondary btn-xs" id="popover-btn-pii">🛡️ 標為 PII</button>
      <div class="popover-arrow"></div>
    `;

    // Position above selection
    const top = coords.top - 40;
    const left = Math.max(10, coords.left - 40);

    this.popoverElement.style.top = `${top}px`;
    this.popoverElement.style.left = `${left}px`;
    this.popoverElement.style.display = 'flex';

    // Hook buttons
    document.getElementById('popover-btn-param').onclick = (evt) => {
      evt.stopPropagation();
      const paramName = prompt('請輸入參數名稱 (例如 user_id, start_date):', defaultParamName);
      if (!paramName) return;

      const cleanName = paramName.trim().replace(/[{}]/g, '');
      const placeholder = `{{${cleanName}}}`;

      // Replace in Monaco
      this.editor.executeEdits('user-param-action', [{
        range: selection,
        text: placeholder,
        forceMoveMarkers: true
      }]);

      this.hidePopover();
      this.onParamExtracted({
        name: cleanName,
        defaultVal: selectedText,
        type: 'String',
        required: true
      });
    };

    document.getElementById('popover-btn-pii').onclick = (evt) => {
      evt.stopPropagation();
      this.hidePopover();
      this.onPiiMarked(selectedText.replace(/['"`]/g, ''));
    };
  }

  hidePopover() {
    if (this.popoverElement) {
      this.popoverElement.style.display = 'none';
    }
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export class SqlDiffViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.diffEditor = null;
  }

  async init(originalValue = '', modifiedValue = '') {
    const monaco = await loadMonaco();

    this.diffEditor = monaco.editor.createDiffEditor(this.container, {
      theme: 'vs',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: false }
    });

    this.setValues(originalValue, modifiedValue);
    return this.diffEditor;
  }

  setValues(originalValue, modifiedValue) {
    if (!this.diffEditor || !window.monaco) return;
    const originalModel = window.monaco.editor.createModel(originalValue || '', 'sql');
    const modifiedModel = window.monaco.editor.createModel(modifiedValue || '', 'sql');
    this.diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
  }
}
