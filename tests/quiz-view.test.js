import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// サンプルデータ
function createSampleQuestion() {
  return {
    id: 1,
    text: '問題文テスト',
    choices: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
    correctIndex: 0,
    explanation: '解説テスト',
    aiPromptTemplate: 'AIテンプレートテスト',
  };
}

function createSampleAnswerResult(isCorrect) {
  return {
    questionId: 1,
    selectedIndex: isCorrect ? 0 : 2,
    correctIndex: 0,
    isCorrect,
  };
}

// DOM モック
function createMockSection() {
  let html = '';
  const listeners = {};

  const markdownArea = (() => {
    let _html = '';
    return {
      get innerHTML() { return _html; },
      set innerHTML(v) { _html = v; },
      querySelectorAll() { return []; },
    };
  })();

  function parseChoiceItems(htmlStr) {
    const items = [];
    const regex = /data-index="(\d+)"/g;
    let m;
    while ((m = regex.exec(htmlStr)) !== null) {
      const idx = m[1];
      items.push({
        dataset: { index: idx },
        classList: {
          _classes: [],
          add(c) { this._classes.push(c); },
          remove(c) { this._classes = this._classes.filter(x => x !== c); },
          contains(c) { return this._classes.includes(c); },
        },
        _listeners: {},
        addEventListener(event, fn) {
          this._listeners[event] = this._listeners[event] || [];
          this._listeners[event].push(fn);
        },
      });
    }
    return items;
  }

  let choiceItems = [];

  return {
    id: 'quiz',
    get innerHTML() { return html; },
    set innerHTML(v) {
      html = v;
      choiceItems = parseChoiceItems(v);
    },
    querySelectorAll(selector) {
      if (selector === '.choice-item') return choiceItems;
      return [];
    },
    querySelector(selector) {
      if (selector === '#markdown-area') {
        return html.includes('id="markdown-area"') ? markdownArea : null;
      }
      if (selector === '#next-btn') {
        return {
          style: { display: '' },
          _listeners: {},
          addEventListener(event, fn) {
            this._listeners[event] = this._listeners[event] || [];
            this._listeners[event].push(fn);
          },
        };
      }
      if (selector === '.quiz-explanation') {
        return html.includes('quiz-explanation') ? { innerHTML: '' } : null;
      }
      if (selector === '.progress-bar') {
        return html.includes('progress-bar') ? {} : null;
      }
      return null;
    },
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    _getChoiceItems() { return choiceItems; },
    _markdownArea: markdownArea,
  };
}

describe('QuizView', () => {
  let QuizView, section;

  beforeEach(async () => {
    const mod = await import('../js/quiz-view.js');
    QuizView = mod.QuizView;
    section = createMockSection();
  });

  describe('renderQuestion', () => {
    it('問題文が表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('問題文テスト'));
    });

    it('選択肢が全て表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('選択肢A'));
      assert.ok(section.innerHTML.includes('選択肢B'));
      assert.ok(section.innerHTML.includes('選択肢C'));
      assert.ok(section.innerHTML.includes('選択肢D'));
    });

    it('進捗表示（問題番号/総数）が表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 3, total: 10 });
      assert.ok(section.innerHTML.includes('3'));
      assert.ok(section.innerHTML.includes('10'));
    });

    it('5択問題でも全選択肢が表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.choices.push('選択肢E');
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('選択肢E'));
      const items = section._getChoiceItems();
      assert.equal(items.length, 5);
    });
  });

  describe('onAnswer コールバック', () => {
    it('onAnswer でコールバックが呼ばれる', () => {
      const view = new QuizView(section);
      const calls = [];
      view.onAnswer((index) => calls.push(index));
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });

      // 内部メソッドで回答を模擬
      view._handleAnswer(2);
      assert.deepEqual(calls, [2]);
    });

    it('コールバック未設定でもエラーにならない', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.doesNotThrow(() => view._handleAnswer(0));
    });
  });

  describe('showResult（一問一答モード）', () => {
    it('正解時に正解の表示がある', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      const result = createSampleAnswerResult(true);
      view.showResult(result);
      assert.ok(section.innerHTML.includes('正解'));
    });

    it('不正解時に不正解の表示がある', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      const result = createSampleAnswerResult(false);
      view.showResult(result);
      assert.ok(section.innerHTML.includes('不正解'));
    });
  });

  describe('showExplanation（一問一答モード）', () => {
    it('解説テキストが表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      view.showExplanation({
        text: '解説テスト',
        aiPromptTemplate: 'AIテンプレートテスト',
      });
      assert.ok(section.innerHTML.includes('解説テスト'));
    });

    it('AI解説誘導テキストが表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      view.showExplanation({
        text: '解説テスト',
        aiPromptTemplate: 'AIテンプレートテスト',
      });
      assert.ok(section.innerHTML.includes('AIテンプレートテスト'));
    });
  });

  describe('onNext コールバック', () => {
    it('onNext でコールバックが設定される', () => {
      const view = new QuizView(section);
      const calls = [];
      view.onNext(() => calls.push('next'));
      // 内部メソッドで次へを模擬
      view._handleNext();
      assert.deepEqual(calls, ['next']);
    });
  });

  describe('ナビゲーションバー', () => {
    it('ナビゲーションバーが表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('quiz-nav'));
      assert.ok(section.innerHTML.includes('prev-btn'));
      assert.ok(section.innerHTML.includes('next-btn'));
    });

    it('先頭問題でも前の問題ボタンが有効である（確認ダイアログでTOPに戻る）', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('prev-btn'));
      const prevBtnMatch = section.innerHTML.match(/id="prev-btn"[^>]*/);
      assert.ok(prevBtnMatch && !prevBtnMatch[0].includes('disabled'));
    });

    it('2問目以降では前の問題ボタンが有効になる', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 2, total: 5 });
      // disabled属性がないことを確認
      const prevBtnMatch = section.innerHTML.match(/id="prev-btn"[^>]*/);
      assert.ok(prevBtnMatch);
      assert.ok(!prevBtnMatch[0].includes('disabled'));
    });

    it('進捗テキストが表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 3, total: 10 });
      assert.ok(section.innerHTML.includes('問題 3 / 10'));
    });
  });

  describe('onPrev コールバック', () => {
    it('onPrev でコールバックが呼ばれる', () => {
      const view = new QuizView(section);
      const calls = [];
      view.onPrev(() => calls.push('prev'));
      view._handlePrev();
      assert.deepEqual(calls, ['prev']);
    });
  });

  describe('コンパクト表示（8択以上）', () => {
    it('選択肢が8個以上の場合、choice-list--compactクラスが付与される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.choices = Array.from({ length: 8 }, (_, i) => `選択肢${i + 1}`);
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('choice-list--compact'));
    });

    it('選択肢が7個以下の場合、choice-list--compactクラスが付与されない', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.choices = Array.from({ length: 7 }, (_, i) => `選択肢${i + 1}`);
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(!section.innerHTML.includes('choice-list--compact'));
    });

    it('選択肢が4個の場合、choice-list--compactクラスが付与されない', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(!section.innerHTML.includes('choice-list--compact'));
    });
  });

  describe('図表表示（figure）', () => {
    it('Mermaid図表がpre.mermaidタグで表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.figure = { type: 'mermaid', content: 'graph TD; A-->B', alt: 'テスト図' };
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('<pre class="mermaid">'));
      assert.ok(section.innerHTML.includes('graph TD; A-->B'));
    });

    it('SVG画像がimgタグで表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.figure = { type: 'svg', src: 'diagram.svg', alt: 'SVG図' };
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('<img'));
      assert.ok(section.innerHTML.includes('data/images/diagram.svg'));
      assert.ok(section.innerHTML.includes('alt="SVG図"'));
    });

    it('PNG画像がimgタグで表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.figure = { type: 'png', src: 'photo.png', alt: 'PNG図' };
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('<img'));
      assert.ok(section.innerHTML.includes('data/images/photo.png'));
      assert.ok(section.innerHTML.includes('alt="PNG図"'));
    });

    it('figureがない場合は図表エリアが表示されない', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(!section.innerHTML.includes('question-figure'));
    });

    it('図表は問題文と選択肢の間に表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.figure = { type: 'mermaid', content: 'graph LR; X-->Y' };
      view.renderQuestion(q, { current: 1, total: 5 });
      const html = section.innerHTML;
      const questionTextPos = html.indexOf('question-text');
      const figurePos = html.indexOf('question-figure');
      const choiceListPos = html.indexOf('choice-list');
      assert.ok(questionTextPos < figurePos, '図表は問題文の後に表示されるべき');
      assert.ok(figurePos < choiceListPos, '図表は選択肢の前に表示されるべき');
    });

    it('alt属性が未指定の場合は空文字になる', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      q.figure = { type: 'png', src: 'photo.png' };
      view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('alt=""'));
    });
  });

  describe('MarkdownRenderer統合', () => {
    function createMockRenderer() {
      const calls = [];
      return {
        render(text) {
          calls.push({ type: 'render', text });
          return `<div class="md">${text}</div>`;
        },
        async renderMermaidIn(_container) {
          calls.push({ type: 'renderMermaidIn' });
        },
        _calls: calls,
      };
    }

    function createMockLoader(contentOrError) {
      const calls = [];
      return {
        async loadMarkdownFile(path) {
          calls.push(path);
          if (contentOrError instanceof Error) throw contentOrError;
          return contentOrError;
        },
        _calls: calls,
      };
    }

    it('setMarkdownRendererでレンダラーを設定できる', () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      assert.doesNotThrow(() => view.setMarkdownRenderer(renderer));
    });

    it('setDataLoaderでデータローダーを設定できる', () => {
      const view = new QuizView(section);
      const loader = createMockLoader('# テスト');
      assert.doesNotThrow(() => view.setDataLoader(loader));
    });

    it('renderQuestion()でmarkdown-areaのdivが含まれる', async () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      await view.renderQuestion(q, { current: 1, total: 5 });
      assert.ok(section.innerHTML.includes('markdown-area'));
    });

    it('markdown_textがある場合、MarkdownRendererのrender()が呼ばれる', async () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      view.setMarkdownRenderer(renderer);
      const q = { ...createSampleQuestion(), markdown_text: '## テスト見出し' };
      await view.renderQuestion(q, { current: 1, total: 5 });
      const renderCalls = renderer._calls.filter((c) => c.type === 'render');
      assert.equal(renderCalls.length, 1);
      assert.equal(renderCalls[0].text, '## テスト見出し');
    });

    it('markdown_fileがある場合、DataLoaderのloadMarkdownFile()が呼ばれる', async () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      const loader = createMockLoader('# ファイルMD');
      view.setMarkdownRenderer(renderer);
      view.setDataLoader(loader);
      const q = { ...createSampleQuestion(), markdown_file: 'md/test/sample.md' };
      await view.renderQuestion(q, { current: 1, total: 5 });
      assert.deepEqual(loader._calls, ['md/test/sample.md']);
    });

    it('markdown_fileとmarkdown_textが両方ある場合、markdown_fileを優先する', async () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      const loader = createMockLoader('# ファイルMD');
      view.setMarkdownRenderer(renderer);
      view.setDataLoader(loader);
      const q = { ...createSampleQuestion(), markdown_file: 'md/test.md', markdown_text: 'インラインMD' };
      await view.renderQuestion(q, { current: 1, total: 5 });
      const renderCall = renderer._calls.find((c) => c.type === 'render');
      assert.equal(renderCall.text, '# ファイルMD');
    });

    it('markdown_text/markdown_fileが両方ない場合、render()は呼ばれない', async () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      view.setMarkdownRenderer(renderer);
      const q = createSampleQuestion();
      await view.renderQuestion(q, { current: 1, total: 5 });
      assert.equal(renderer._calls.filter((c) => c.type === 'render').length, 0);
    });

    it('markdown_fileのfetchが失敗してもクイズ表示は継続される', async () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      const loader = createMockLoader(new Error('fetch失敗'));
      view.setMarkdownRenderer(renderer);
      view.setDataLoader(loader);
      const q = { ...createSampleQuestion(), markdown_file: 'md/test.md' };
      await assert.doesNotReject(() => view.renderQuestion(q, { current: 1, total: 5 }));
      assert.ok(section.innerHTML.includes('問題文テスト'));
    });

    it('MarkdownRendererが設定されていない場合、markdown_textがあっても何もしない', async () => {
      const view = new QuizView(section);
      const q = { ...createSampleQuestion(), markdown_text: '## テスト' };
      await assert.doesNotReject(() => view.renderQuestion(q, { current: 1, total: 5 }));
      assert.ok(section.innerHTML.includes('問題文テスト'));
    });

    it('renderMermaidIn()がmarkdownエリアに対して呼ばれる', async () => {
      const view = new QuizView(section);
      const renderer = createMockRenderer();
      view.setMarkdownRenderer(renderer);
      const q = { ...createSampleQuestion(), markdown_text: '## テスト' };
      await view.renderQuestion(q, { current: 1, total: 5 });
      const mermaidCalls = renderer._calls.filter((c) => c.type === 'renderMermaidIn');
      assert.equal(mermaidCalls.length, 1);
    });
  });

  describe('次の問題ボタン', () => {
    it('最後の問題では結果を見るボタンが表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 5, total: 5 });
      const result = createSampleAnswerResult(true);
      view.showResult(result);
      view.showExplanation({ text: '解説', aiPromptTemplate: 'AI' });
      // showNextButton の isLast=true で「結果を見る」テキスト
      view.showNextButton(true);
      assert.ok(section.innerHTML.includes('結果'));
    });

    it('途中の問題では次の問題ボタンが表示される', () => {
      const view = new QuizView(section);
      const q = createSampleQuestion();
      view.renderQuestion(q, { current: 1, total: 5 });
      const result = createSampleAnswerResult(true);
      view.showResult(result);
      view.showExplanation({ text: '解説', aiPromptTemplate: 'AI' });
      view.showNextButton(false);
      assert.ok(section.innerHTML.includes('次の問題'));
    });
  });
});
