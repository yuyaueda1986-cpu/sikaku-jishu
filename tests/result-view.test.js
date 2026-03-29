import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function createSampleResult() {
  return {
    examLabel: '2025年度第1回',
    totalQuestions: 3,
    correctCount: 2,
    percentage: 67,
    details: [
      { questionId: 1, selectedIndex: 0, correctIndex: 0, isCorrect: true },
      { questionId: 2, selectedIndex: 1, correctIndex: 2, isCorrect: false },
      { questionId: 3, selectedIndex: 1, correctIndex: 1, isCorrect: true },
    ],
    questions: [
      {
        id: 1, text: '問題1', choices: ['A', 'B', 'C', 'D'],
        correctIndex: 0, explanation: '解説1', aiPromptTemplate: 'AI1',
      },
      {
        id: 2, text: '問題2', choices: ['A', 'B', 'C', 'D'],
        correctIndex: 2, explanation: '解説2', aiPromptTemplate: 'AI2',
      },
      {
        id: 3, text: '問題3', choices: ['A', 'B', 'C', 'D', 'E'],
        correctIndex: 1, explanation: '解説3', aiPromptTemplate: 'AI3',
      },
    ],
  };
}

// DOM モック
function createMockSection() {
  let html = '';
  const btnListeners = {};

  const listeners = {};

  return {
    id: 'result',
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; },
    querySelector(selector) {
      if (selector === '#back-home-btn') {
        return {
          _listeners: btnListeners,
          addEventListener(event, fn) {
            this._listeners[event] = this._listeners[event] || [];
            this._listeners[event].push(fn);
          },
        };
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
  };
}

describe('ResultView', () => {
  let ResultView, section;

  beforeEach(async () => {
    const mod = await import('../js/result-view.js');
    ResultView = mod.ResultView;
    section = createMockSection();
  });

  describe('render', () => {
    it('正答数と総問題数が表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.ok(section.innerHTML.includes('2'));
      assert.ok(section.innerHTML.includes('3'));
    });

    it('正答率がパーセンテージで表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.ok(section.innerHTML.includes('67'));
      assert.ok(section.innerHTML.includes('%'));
    });

    it('試験ラベルが表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.ok(section.innerHTML.includes('2025年度第1回'));
    });

    it('各問題の正誤が表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      // 正解と不正解の両方が含まれる
      assert.ok(section.innerHTML.includes('正解'));
      assert.ok(section.innerHTML.includes('不正解'));
    });

    it('各問題の解説が表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.ok(section.innerHTML.includes('解説1'));
      assert.ok(section.innerHTML.includes('解説2'));
      assert.ok(section.innerHTML.includes('解説3'));
    });

    it('AI解説誘導テキストが表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.ok(section.innerHTML.includes('AI1'));
      assert.ok(section.innerHTML.includes('AI2'));
      assert.ok(section.innerHTML.includes('AI3'));
    });

    it('コピーボタンが各問題に表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      // 3問分のコピーボタン
      const matches = section.innerHTML.match(/copy-btn/g);
      assert.ok(matches);
      assert.equal(matches.length, 3);
    });

    it('トップに戻るボタンが表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.ok(section.innerHTML.includes('back-home-btn'));
      assert.ok(section.innerHTML.includes('トップ'));
    });

    it('正解の問題には正解の選択肢が表示される', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      // 問題2の正解は選択肢C（index 2）
      assert.ok(section.innerHTML.includes('正解: C'));
    });
  });

  describe('onBackToHome', () => {
    it('コールバックが設定される', () => {
      const view = new ResultView(section);
      const calls = [];
      view.onBackToHome(() => calls.push('home'));
      view.render(createSampleResult());
      view._handleBackToHome();
      assert.deepEqual(calls, ['home']);
    });

    it('コールバック未設定でもエラーにならない', () => {
      const view = new ResultView(section);
      view.render(createSampleResult());
      assert.doesNotThrow(() => view._handleBackToHome());
    });
  });

  describe('全問正解の場合', () => {
    it('100%が表示される', () => {
      const view = new ResultView(section);
      const result = createSampleResult();
      result.correctCount = 3;
      result.percentage = 100;
      result.details = result.details.map(d => ({ ...d, isCorrect: true }));
      view.render(result);
      assert.ok(section.innerHTML.includes('100'));
    });
  });
});
