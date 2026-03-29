import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// サンプルクイズデータ
function createSampleData() {
  return {
    year: 2025,
    round: 1,
    label: '2025年度第1回',
    questions: [
      {
        id: 1,
        text: '問題1',
        choices: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: '解説1',
        aiPromptTemplate: 'AI1',
      },
      {
        id: 2,
        text: '問題2',
        choices: ['A', 'B', 'C', 'D'],
        correctIndex: 2,
        explanation: '解説2',
        aiPromptTemplate: 'AI2',
      },
      {
        id: 3,
        text: '問題3',
        choices: ['A', 'B', 'C', 'D', 'E'],
        correctIndex: 1,
        explanation: '解説3',
        aiPromptTemplate: 'AI3',
      },
    ],
  };
}

describe('QuizEngine', () => {
  let QuizEngine, engine;

  beforeEach(async () => {
    const mod = await import('../js/quiz-engine.js');
    QuizEngine = mod.QuizEngine;
    engine = new QuizEngine();
  });

  describe('init', () => {
    it('デフォルト設定で初期化できる', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      assert.equal(engine.isComplete(), false);
    });

    it('シャッフルなしでは元の順序が保たれる', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal(q.id, 1);
      assert.deepEqual(q.choices, ['A', 'B', 'C', 'D']);
    });

    it('出題順ランダム化が有効の場合、問題順が変わりうる', () => {
      // 統計的テスト: 複数回実行して少なくとも1回は順序が変わるか
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: true, shuffleChoices: false };
      let differentOrder = false;
      for (let i = 0; i < 50; i++) {
        engine.init(data, settings);
        const q = engine.getCurrentQuestion();
        if (q.id !== 1) {
          differentOrder = true;
          break;
        }
      }
      assert.ok(differentOrder, '50回中1回は問題順が変わるべき');
    });

    it('選択肢ランダム化が有効の場合、correctIndexが追従する', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: true };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      // シャッフル後もcorrectIndexが正しい選択肢を指していることを確認
      assert.equal(q.choices[q.correctIndex], 'A'); // 元の正解はindex 0の'A'
    });
  });

  describe('getCurrentQuestion', () => {
    it('現在の問題を返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal(q.text, '問題1');
      assert.equal(q.choices.length, 4);
    });
  });

  describe('getQuestionNumber', () => {
    it('現在の問題番号と総数を返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const num = engine.getQuestionNumber();
      assert.deepEqual(num, { current: 1, total: 3 });
    });

    it('次の問題に進むと番号が増える', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      const num = engine.getQuestionNumber();
      assert.deepEqual(num, { current: 2, total: 3 });
    });
  });

  describe('submitAnswer', () => {
    it('正解の場合isCorrectがtrue', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const result = engine.submitAnswer(0); // 正解はindex 0
      assert.equal(result.isCorrect, true);
      assert.equal(result.selectedIndex, 0);
      assert.equal(result.correctIndex, 0);
      assert.equal(result.questionId, 1);
    });

    it('不正解の場合isCorrectがfalse', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const result = engine.submitAnswer(2);
      assert.equal(result.isCorrect, false);
      assert.equal(result.selectedIndex, 2);
      assert.equal(result.correctIndex, 0);
    });
  });

  describe('nextQuestion', () => {
    it('次の問題がある場合trueを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      assert.equal(engine.nextQuestion(), true);
      assert.equal(engine.getCurrentQuestion().id, 2);
    });

    it('最後の問題の場合falseを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      engine.submitAnswer(2);
      engine.nextQuestion();
      engine.submitAnswer(1);
      assert.equal(engine.nextQuestion(), false);
    });
  });

  describe('isComplete', () => {
    it('全問回答後にtrueを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      engine.submitAnswer(2);
      engine.nextQuestion();
      engine.submitAnswer(1);
      // 最後の問題に回答した後、nextQuestionがfalseを返してもisCompleteはtrue
      engine.nextQuestion();
      assert.equal(engine.isComplete(), true);
    });

    it('途中ではfalseを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      assert.equal(engine.isComplete(), false);
    });
  });

  describe('getResults', () => {
    it('全問回答後に正しい結果を返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0); // 正解
      engine.nextQuestion();
      engine.submitAnswer(1); // 不正解 (正解は2)
      engine.nextQuestion();
      engine.submitAnswer(1); // 正解
      engine.nextQuestion();

      const results = engine.getResults();
      assert.equal(results.examLabel, '2025年度第1回');
      assert.equal(results.totalQuestions, 3);
      assert.equal(results.correctCount, 2);
      assert.equal(results.percentage, Math.round((2 / 3) * 100));
      assert.equal(results.details.length, 3);
      assert.equal(results.questions.length, 3);
    });

    it('全問正解の場合100%', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0); // 正解
      engine.nextQuestion();
      engine.submitAnswer(2); // 正解
      engine.nextQuestion();
      engine.submitAnswer(1); // 正解
      engine.nextQuestion();

      const results = engine.getResults();
      assert.equal(results.correctCount, 3);
      assert.equal(results.percentage, 100);
    });

    it('全問不正解の場合0%', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(3); // 不正解
      engine.nextQuestion();
      engine.submitAnswer(0); // 不正解
      engine.nextQuestion();
      engine.submitAnswer(3); // 不正解
      engine.nextQuestion();

      const results = engine.getResults();
      assert.equal(results.correctCount, 0);
      assert.equal(results.percentage, 0);
    });
  });

  describe('全問回答モード', () => {
    it('全問回答モードでも正しく動作する', () => {
      const data = createSampleData();
      const settings = { mode: 'all-at-once', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      engine.submitAnswer(2);
      engine.nextQuestion();
      engine.submitAnswer(1);
      engine.nextQuestion();

      const results = engine.getResults();
      assert.equal(results.totalQuestions, 3);
      assert.equal(results.correctCount, 3);
    });
  });
});
