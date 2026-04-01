/**
 * GFMテキストをHTMLに変換する。KaTeX数式統合・XSSサニタイズ・Mermaid後処理を提供する。
 *
 * ブラウザ環境ではimportmap経由でmarkedとmarked-katex-extensionを注入する。
 * テスト環境ではコンストラクタの deps 引数で依存を注入できる。
 */
export class MarkdownRenderer {
  /**
   * @param {object} [deps] - 依存ライブラリの注入（テスト・ブラウザ共通）
   * @param {object} [deps.markedLib] - markedライブラリオブジェクト
   * @param {Function} [deps.markedKatexLib] - marked-katex-extensionファクトリ関数
   */
  constructor(deps = {}) {
    this._marked = null;
    this._ready = false;

    const markedLib = deps.markedLib ?? null;
    const markedKatexLib = deps.markedKatexLib ?? null;

    if (!markedLib) return;

    try {
      if (markedKatexLib) {
        markedLib.use(markedKatexLib({ throwOnError: false }));
      }
      markedLib.setOptions({ gfm: true });
      this._marked = markedLib;
      this._ready = true;
    } catch (_e) {
      this._ready = false;
    }
  }

  /**
   * GFM文字列をサニタイズ済みHTML文字列に変換する。
   * markedが未設定の場合、入力テキストをそのまま返す。
   *
   * @param {string} markdownText
   * @returns {string}
   */
  render(markdownText) {
    if (!this._ready || !this._marked) return markdownText;
    let html = this._marked.parse(markdownText);
    // XSS対策: scriptタグを除去
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return html;
  }

  /**
   * DOM要素内のMermaidコードブロックをダイアグラムに変換する。
   * mermaidがグローバルに存在しない場合、または変換中にエラーが発生した場合は何もしない。
   *
   * @param {HTMLElement} container
   * @returns {Promise<void>}
   */
  async renderMermaidIn(container) {
    if (typeof mermaid === 'undefined') return;
    try {
      const codeBlocks = container.querySelectorAll('code.language-mermaid');
      for (const code of codeBlocks) {
        const pre = code.parentElement;
        if (pre && pre.tagName === 'PRE') {
          pre.className = 'mermaid';
          pre.innerHTML = code.textContent;
        }
      }
      await mermaid.run({ nodes: container.querySelectorAll('pre.mermaid') });
    } catch (_e) {
      // エラー時はソースコードをそのまま表示（何もしない）
    }
  }
}
