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
