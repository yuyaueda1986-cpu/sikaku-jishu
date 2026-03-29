class CopyHelper {
  constructor(env) {
    this._env = env || {};
  }

  generatePrompt(question, explanation) {
    return question.aiPromptTemplate;
  }

  async copyToClipboard(text) {
    // Clipboard API を優先的に使用
    const clipboard = this._env.clipboard !== undefined
      ? this._env.clipboard
      : (typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null);

    if (clipboard) {
      try {
        await clipboard.writeText(text);
        return true;
      } catch {
        // フォールバックへ
      }
    }

    // document.execCommand('copy') フォールバック
    return this._fallbackCopy(text);
  }

  _fallbackCopy(text) {
    const execCommand = this._env.execCommand
      || (typeof document !== 'undefined' ? document.execCommand.bind(document) : null);
    const createElement = this._env.createElement
      || (typeof document !== 'undefined' ? document.createElement.bind(document) : null);
    const appendChild = this._env.appendChild
      || (typeof document !== 'undefined' ? (el) => document.body.appendChild(el) : null);
    const removeChild = this._env.removeChild
      || (typeof document !== 'undefined' ? (el) => document.body.removeChild(el) : null);

    if (!execCommand || !createElement) return false;

    const textarea = createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    if (appendChild) appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    let success = false;
    try {
      success = execCommand('copy');
    } catch {
      success = false;
    }

    if (removeChild) removeChild(textarea);
    return success;
  }
}

export { CopyHelper };
