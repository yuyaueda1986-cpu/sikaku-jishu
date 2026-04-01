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

  describe('prevQuestion', () => {
    it('前の問題に戻れる', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      assert.equal(engine.getCurrentQuestion().id, 2);
      assert.equal(engine.prevQuestion(), true);
      assert.equal(engine.getCurrentQuestion().id, 1);
    });

    it('先頭問題ではfalseを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      assert.equal(engine.prevQuestion(), false);
      assert.equal(engine.getCurrentQuestion().id, 1);
    });
  });

  describe('getAnswerAt', () => {
    it('回答済みの問題の回答を返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      const answer = engine.getAnswerAt(0);
      assert.equal(answer.selectedIndex, 0);
      assert.equal(answer.isCorrect, true);
    });

    it('未回答の問題ではnullを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      assert.equal(engine.getAnswerAt(0), null);
      assert.equal(engine.getAnswerAt(1), null);
    });
  });

  describe('submitAnswer（上書き）', () => {
    it('同じ問題に再回答すると上書きされる', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(1); // 不正解
      assert.equal(engine.getAnswerAt(0).selectedIndex, 1);
      engine.submitAnswer(0); // 正解に上書き
      assert.equal(engine.getAnswerAt(0).selectedIndex, 0);
      assert.equal(engine.getAnswerAt(0).isCorrect, true);
    });
  });

  describe('isComplete（全問回答判定）', () => {
    it('全問回答済みでtrueを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      engine.submitAnswer(2);
      engine.nextQuestion();
      engine.submitAnswer(1);
      assert.equal(engine.isComplete(), true);
    });

    it('未回答がある場合falseを返す', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      // 2問目は未回答のまま
      assert.equal(engine.isComplete(), false);
    });

    it('前に戻って回答しても正しく判定される', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      engine.submitAnswer(0);
      engine.nextQuestion();
      engine.submitAnswer(2);
      engine.nextQuestion();
      // 3問目は未回答
      assert.equal(engine.isComplete(), false);
      // 3問目に回答
      engine.submitAnswer(1);
      assert.equal(engine.isComplete(), true);
    });
  });

  describe('可変選択肢バリデーション', () => {
    it('選択肢が1個の問題で初期化できる', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          { id: 1, text: '問題1', choices: ['A'], correctIndex: 0, explanation: '解説', aiPromptTemplate: 'AI' },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      assert.equal(engine.getCurrentQuestion().choices.length, 1);
    });

    it('選択肢が16個の問題で初期化できる', () => {
      const choices = Array.from({ length: 16 }, (_, i) => `選択肢${i + 1}`);
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          { id: 1, text: '問題1', choices, correctIndex: 0, explanation: '解説', aiPromptTemplate: 'AI' },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      assert.equal(engine.getCurrentQuestion().choices.length, 16);
    });

    it('選択肢が0個の場合エラーをスローする', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          { id: 1, text: '問題1', choices: [], correctIndex: 0, explanation: '解説', aiPromptTemplate: 'AI' },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      assert.throws(() => engine.init(data, settings), /選択肢の数は1〜16/);
    });

    it('選択肢が17個の場合エラーをスローする', () => {
      const choices = Array.from({ length: 17 }, (_, i) => `選択肢${i + 1}`);
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          { id: 1, text: '問題1', choices, correctIndex: 0, explanation: '解説', aiPromptTemplate: 'AI' },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      assert.throws(() => engine.init(data, settings), /選択肢の数は1〜16/);
    });
  });

  describe('figureフィールドのディープコピー', () => {
    it('figureフィールドがある問題をディープコピーする', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          {
            id: 1, text: '問題1', choices: ['A', 'B'], correctIndex: 0,
            explanation: '解説', aiPromptTemplate: 'AI',
            figure: { type: 'mermaid', content: 'graph TD; A-->B', alt: 'テスト図' },
          },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.deepEqual(q.figure, { type: 'mermaid', content: 'graph TD; A-->B', alt: 'テスト図' });
      // ディープコピーの確認（元データと異なるオブジェクト参照）
      assert.notEqual(q.figure, data.questions[0].figure);
    });

    it('figureフィールドがない問題はundefinedのまま', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal(q.figure, undefined);
    });

    it('svg/png型のfigureもディープコピーされる', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          {
            id: 1, text: '問題1', choices: ['A', 'B'], correctIndex: 0,
            explanation: '解説', aiPromptTemplate: 'AI',
            figure: { type: 'png', src: 'diagram.png', alt: '図1' },
          },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.deepEqual(q.figure, { type: 'png', src: 'diagram.png', alt: '図1' });
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

  describe('markdown_text/markdown_fileフィールドのディープコピー', () => {
    it('markdown_textが存在する問題をコピーする', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          {
            id: 1, text: '問題1', choices: ['A', 'B'], correctIndex: 0,
            explanation: '解説', aiPromptTemplate: 'AI',
            markdown_text: '## 補足\n本文テキスト',
          },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal(q.markdown_text, '## 補足\n本文テキスト');
    });

    it('markdown_fileが存在する問題をコピーする', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          {
            id: 1, text: '問題1', choices: ['A', 'B'], correctIndex: 0,
            explanation: '解説', aiPromptTemplate: 'AI',
            markdown_file: 'md/test/sample.md',
          },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal(q.markdown_file, 'md/test/sample.md');
    });

    it('markdown_text/markdown_fileが両方ない問題ではフィールドが含まれない', () => {
      const data = createSampleData();
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal('markdown_text' in q, false);
      assert.equal('markdown_file' in q, false);
    });

    it('markdown_textとmarkdown_fileが両方ある問題を両方コピーする', () => {
      const data = {
        year: 2025, round: 1, label: 'テスト',
        questions: [
          {
            id: 1, text: '問題1', choices: ['A', 'B'], correctIndex: 0,
            explanation: '解説', aiPromptTemplate: 'AI',
            markdown_text: 'インラインMD',
            markdown_file: 'md/test/sample.md',
          },
        ],
      };
      const settings = { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false };
      engine.init(data, settings);
      const q = engine.getCurrentQuestion();
      assert.equal(q.markdown_text, 'インラインMD');
      assert.equal(q.markdown_file, 'md/test/sample.md');
    });
  });
});
