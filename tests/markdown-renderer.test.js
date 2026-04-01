import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// marked のモック
function createMockMarked() {
  const instance = {
    _options: {},
    _extensions: [],
    setOptions(opts) {
      Object.assign(this._options, opts);
    },
    use(ext) {
      this._extensions.push(ext);
    },
    parse(text) {
      // 簡易変換: **bold** → <strong>bold</strong>、入力をpタグでラップ
      return `<p>${text}</p>`;
    },
  };
  return instance;
}

// DOM モック（querySelectorAll + innerHTML 対応）
function createMockContainer(codeBlocks = []) {
  const elements = codeBlocks.map((content) => {
    const pre = {
      tagName: 'PRE',
      className: '',
      innerHTML: '',
      _children: [],
    };
    const code = {
      tagName: 'CODE',
      className: 'language-mermaid',
      textContent: content,
      parentElement: pre,
    };
    pre._children.push(code);
    return { pre, code };
  });

  return {
    _elements: elements,
    querySelectorAll(selector) {
      if (selector === 'code.language-mermaid') {
        return elements.map((e) => e.code);
      }
      if (selector === 'pre.mermaid') {
        return elements.map((e) => e.pre).filter((p) => p.className === 'mermaid');
      }
      return [];
    },
  };
}

describe('MarkdownRenderer', () => {
  let MarkdownRenderer;

  beforeEach(async () => {
    const mod = await import('../js/markdown-renderer.js');
    MarkdownRenderer = mod.MarkdownRenderer;
  });

  describe('render()', () => {
    it('markedが注入されていない場合、入力テキストをそのまま返す', () => {
      const renderer = new MarkdownRenderer();
      const input = '# 見出し\n\nテスト';
      assert.equal(renderer.render(input), input);
    });

    it('markedが注入されている場合、parse()を呼び出してHTMLを返す', () => {
      const mockMarked = createMockMarked();
      const renderer = new MarkdownRenderer({ markedLib: mockMarked });
      const result = renderer.render('テスト');
      assert.equal(result, '<p>テスト</p>');
    });

    it('gfm: true でmarkedが初期化される', () => {
      const mockMarked = createMockMarked();
      new MarkdownRenderer({ markedLib: mockMarked });
      assert.equal(mockMarked._options.gfm, true);
    });

    it('KaTeX拡張が注入されている場合、use()に渡される', () => {
      const mockMarked = createMockMarked();
      let katexOptsReceived = null;
      const mockKatexExt = (opts) => {
        katexOptsReceived = opts;
        return { type: 'katex' };
      };
      new MarkdownRenderer({ markedLib: mockMarked, markedKatexLib: mockKatexExt });
      assert.ok(katexOptsReceived !== null, 'KaTeX拡張ファクトリが呼ばれていること');
      assert.equal(katexOptsReceived.throwOnError, false);
      assert.equal(mockMarked._extensions.length, 1);
    });

    it('<script>タグをHTMLから除去する（XSS対策）', () => {
      const mockMarked = createMockMarked();
      // parse() が script タグを含む HTML を返すようにモック
      mockMarked.parse = (text) =>
        `<p>内容</p><script>alert("XSS")</script><p>続き</p>`;
      const renderer = new MarkdownRenderer({ markedLib: mockMarked });
      const result = renderer.render('テスト');
      assert.ok(!result.includes('<script>'), 'scriptタグが除去されていること');
      assert.ok(!result.includes('alert'), 'script内容が除去されていること');
      assert.ok(result.includes('<p>内容</p>'), '正常なHTMLは残ること');
    });

    it('属性付き<script>タグも除去される', () => {
      const mockMarked = createMockMarked();
      mockMarked.parse = () => `<p>テスト</p><script type="text/javascript">evil()</script>`;
      const renderer = new MarkdownRenderer({ markedLib: mockMarked });
      const result = renderer.render('テスト');
      assert.ok(!result.includes('<script'), 'scriptタグが除去されていること');
      assert.ok(!result.includes('evil()'), 'script内容が除去されていること');
    });

    it('markedの初期化が失敗した場合でも入力テキストを返す（フォールバック）', () => {
      const badMarked = {
        setOptions() { throw new Error('初期化失敗'); },
        use() {},
        parse() { return ''; },
      };
      const renderer = new MarkdownRenderer({ markedLib: badMarked });
      const input = 'テスト入力';
      assert.equal(renderer.render(input), input);
    });
  });

  describe('renderMermaidIn()', () => {
    it('mermaidがグローバルに存在しない場合、何もしない', async () => {
      const renderer = new MarkdownRenderer();
      const container = createMockContainer(['graph TD; A-->B']);
      // エラーにならないこと
      await assert.doesNotReject(() => renderer.renderMermaidIn(container));
    });

    it('code.language-mermaidをpre.mermaidに変換する', async () => {
      // グローバルにmermaidモックを設定
      const runArgs = [];
      globalThis.mermaid = {
        run: async (opts) => { runArgs.push(opts); },
      };

      try {
        const renderer = new MarkdownRenderer();
        const container = createMockContainer(['graph TD; A-->B']);
        await renderer.renderMermaidIn(container);

        const { pre, code } = container._elements[0];
        assert.equal(pre.className, 'mermaid', 'preのclassNameがmermaidになること');
        assert.equal(pre.innerHTML, 'graph TD; A-->B', 'preのinnerHTMLにコード内容が入ること');
      } finally {
        delete globalThis.mermaid;
      }
    });

    it('複数のMermaidブロックを変換する', async () => {
      globalThis.mermaid = { run: async () => {} };

      try {
        const renderer = new MarkdownRenderer();
        const container = createMockContainer(['graph TD; A-->B', 'sequenceDiagram; A->>B: msg']);
        await renderer.renderMermaidIn(container);

        assert.equal(container._elements[0].pre.className, 'mermaid');
        assert.equal(container._elements[1].pre.className, 'mermaid');
      } finally {
        delete globalThis.mermaid;
      }
    });

    it('mermaid.run()にpre.mermaid要素が渡される', async () => {
      let capturedNodes = null;
      globalThis.mermaid = {
        run: async (opts) => { capturedNodes = opts.nodes; },
      };

      try {
        const renderer = new MarkdownRenderer();
        const container = createMockContainer(['graph TD; A-->B']);
        await renderer.renderMermaidIn(container);

        assert.ok(capturedNodes !== null, 'run()にnodesが渡されること');
      } finally {
        delete globalThis.mermaid;
      }
    });

    it('mermaid.run()がエラーをthrowしても例外が伝播しない', async () => {
      globalThis.mermaid = {
        run: async () => { throw new Error('Mermaidエラー'); },
      };

      try {
        const renderer = new MarkdownRenderer();
        const container = createMockContainer(['graph TD; A-->B']);
        await assert.doesNotReject(() => renderer.renderMermaidIn(container));
      } finally {
        delete globalThis.mermaid;
      }
    });

    it('code要素のparentElementがPREでない場合はスキップする', async () => {
      globalThis.mermaid = { run: async () => {} };

      try {
        const renderer = new MarkdownRenderer();
        // parentElementがDIVのケース
        const container = {
          _elements: [],
          querySelectorAll(selector) {
            if (selector === 'code.language-mermaid') {
              return [{
                tagName: 'CODE',
                className: 'language-mermaid',
                textContent: 'graph TD;',
                parentElement: { tagName: 'DIV', className: '', innerHTML: '' },
              }];
            }
            return [];
          },
        };
        await assert.doesNotReject(() => renderer.renderMermaidIn(container));
      } finally {
        delete globalThis.mermaid;
      }
    });
  });
});
