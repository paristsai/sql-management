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
    this.decorationIds = [];
    this.onParamExtracted = options.onParamExtracted || (() => {});
    this.onPiiMarked = options.onPiiMarked || (() => {});
    this.onContentChanged = options.onContentChanged || (() => {});
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

    this.editor.onDidChangeModelContent(() => {
      this.onContentChanged(this.getValue());
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

  /**
   * Highlight PII columns and Dynamic Parameters in Monaco Editor
   * @param {Array<string>} piiFields 
   * @param {Array<Object|string>} parameters - e.g. [{ name: 'channel', defaultVal: "'google_ad'" }] or ['channel']
   * @param {string} mode - 'raw' | 'template'
   */
  updateHighlights(piiFields = [], parameters = [], mode = 'raw') {
    if (!this.editor || !window.monaco) return;
    const model = this.editor.getModel();
    if (!model) return;

    const newDecorations = [];
    const text = model.getValue();

    // 1. Highlight {{param}} in Template mode or if {{param}} exists in text
    const paramRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    let match;
    const foundPlaceholders = new Set();
    while ((match = paramRegex.exec(text)) !== null) {
      foundPlaceholders.add(match[1]);
      const startOffset = match.index;
      const endOffset = match.index + match[0].length;
      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(endOffset);

      newDecorations.push({
        range: new window.monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
        options: {
          inlineClassName: 'monaco-highlight-param',
          hoverMessage: { value: `**動態參數**: \`{{${match[1]}}}\` (執行時將代入即時值)` }
        }
      });
    }

    // 2. In Raw SQL mode: Highlight raw values that correspond to extracted parameters
    (parameters || []).forEach(param => {
      const pObj = typeof param === 'string' ? { name: param, defaultVal: '' } : param;
      if (!pObj || !pObj.name) return;

      // If text already has {{param.name}}, we already highlighted it above
      if (foundPlaceholders.has(pObj.name)) return;

      if (pObj.defaultVal !== undefined && pObj.defaultVal !== null) {
        const rawVal = String(pObj.defaultVal).trim();
        if (rawVal.length > 0) {
          // Check both quoted form and unquoted form
          const cleanVal = rawVal.replace(/^'+|'+$/g, '').trim();
          const variants = [rawVal];
          if (cleanVal && cleanVal !== rawVal) {
            variants.push(cleanVal);
            variants.push(`'${cleanVal}'`);
          }

          // Pick the best match
          Array.from(new Set(variants)).forEach(valToMatch => {
            if (!valToMatch || valToMatch.length === 0) return;
            const escaped = valToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // If it's a number/word, use word boundary; if quoted, match quotes
            const isQuoted = valToMatch.startsWith("'") && valToMatch.endsWith("'");
            const pattern = isQuoted ? escaped : `(?<=^|[\\s,(=<>])${escaped}(?=$|[\\s,);<>]|$)`;
            
            try {
              const valRegex = new RegExp(pattern, 'g');
              let vMatch;
              while ((vMatch = valRegex.exec(text)) !== null) {
                const startOffset = vMatch.index;
                const endOffset = vMatch.index + vMatch[0].length;
                const startPos = model.getPositionAt(startOffset);
                const endPos = model.getPositionAt(endOffset);

                newDecorations.push({
                  range: new window.monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                  options: {
                    inlineClassName: 'monaco-highlight-raw-param',
                    hoverMessage: { value: `**對應參數化內容**: 此值對應 Template 模式中的動態參數 \`{{${pObj.name}}}\`` }
                  }
                });
              }
            } catch (e) {
              // fallback to simple regex
            }
          });
        }
      }
    });

    // 3. Highlight PII fields (Supports both "u.register_date" and plain "phone_number")
    (piiFields || []).forEach(field => {
      if (!field) return;
      const cleanField = field.trim();
      if (!cleanField) return;

      let pattern;
      if (cleanField.includes('.')) {
        // Qualified name like "u.register_date": match exact prefix.col
        const escaped = cleanField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = `\\b${escaped}\\b`;
      } else {
        // Plain column name like "phone_number":
        // Should match either "phone_number" or "table.phone_number" (e.g. "u.phone_number")
        const escaped = cleanField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = `(?:\\b[a-zA-Z0-9_]+\\.)?\\b${escaped}\\b`;
      }

      try {
        const fieldRegex = new RegExp(pattern, 'gi');
        let pMatch;
        while ((pMatch = fieldRegex.exec(text)) !== null) {
          const startOffset = pMatch.index;
          const endOffset = pMatch.index + pMatch[0].length;
          const startPos = model.getPositionAt(startOffset);
          const endPos = model.getPositionAt(endOffset);

          newDecorations.push({
            range: new window.monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
            options: {
              inlineClassName: 'monaco-highlight-pii',
              hoverMessage: { value: `**敏感欄位 (PII)**: \`${pMatch[0]}\` (包含機敏個資或隱私數據)` }
            }
          });
        }
      } catch (e) {
        // fallback
      }
    });

    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, newDecorations);
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
      <button class="btn btn-primary btn-xs" id="popover-btn-param">轉為動態參數 {{...}}</button>
      <button class="btn btn-secondary btn-xs" id="popover-btn-pii">標為 PII 欄位</button>
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

  layout() {
    this.diffEditor?.layout?.();
  }

  dispose() {
    this.diffEditor?.dispose?.();
    this.diffEditor = null;
  }
}

/**
 * Read-only single Monaco editor for Review Modal SQL tabs
 */
export class SqlReadOnlyEditor {
  constructor(containerElement) {
    this.container = containerElement;
    this.editor = null;
  }

  async init(value = '') {
    const monaco = await loadMonaco();

    this.editor = monaco.editor.create(this.container, {
      value: value,
      language: 'sql',
      theme: 'vs',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
      readOnly: true,
      automaticLayout: true,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: 'none',
      selectionHighlight: false,
      occurrencesHighlight: false,
    });

    return this.editor;
  }

  setValue(val) {
    if (this.editor) {
      this.editor.setValue(val || '');
    }
  }

  layout() {
    this.editor?.layout?.();
  }

  dispose() {
    this.editor?.dispose?.();
    this.editor = null;
  }
}
