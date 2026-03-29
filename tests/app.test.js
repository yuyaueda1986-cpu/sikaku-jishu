import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- モックファクトリ ---

function createMockScreenManager() {
  let current = 'home';
  const callbacks = [];
  return {
    showScreen(id) { current = id; callbacks.forEach(cb => cb(id)); },
    getCurrentScreen() { return current; },
    onScreenChange(cb) { callbacks.push(cb); },
    _callbacks: callbacks,
  };
}

function createMockDataLoader(exams, examData) {
  return {
    loadIndex: async () => ({ exams }),
    getAvailableExams: () => exams,
    loadExamData: async (year, round) => examData,
  };
}

function createMockHomeView() {
  let selectCb = null;
  let rendered = false;
  return {
    render(exams) { rendered = true; },
    onExamSelect(cb) { selectCb = cb; },
    _triggerSelect(exam) { if (selectCb) selectCb(exam); },
    _isRendered() { return rendered; },
  };
}

function createMockSetupView() {
  let startCb = null;
  let renderedLabel = null;
  return {
    render(label) { renderedLabel = label; },
    getSettings() { return { mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false }; },
    onStart(cb) { startCb = cb; },
    _triggerStart(settings) { if (startCb) startCb(settings || this.getSettings()); },
    _getRenderedLabel() { return renderedLabel; },
  };
}

function createMockQuizEngine() {
  let questionIdx = 0;
  const questions = [
    { id: 1, text: '問題1', choices: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '解説1', aiPromptTemplate: 'AI1' },
    { id: 2, text: '問題2', choices: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: '解説2', aiPromptTemplate: 'AI2' },
  ];
  let complete = false;
  const answers = [];
  return {
    init(data, settings) { questionIdx = 0; complete = false; answers.length = 0; },
    getCurrentQuestion() { return questions[questionIdx]; },
    getQuestionNumber() { return { current: questionIdx + 1, total: questions.length }; },
    submitAnswer(idx) {
      const q = questions[questionIdx];
      const r = { questionId: q.id, selectedIndex: idx, correctIndex: q.correctIndex, isCorrect: idx === q.correctIndex };
      answers.push(r);
      return r;
    },
    nextQuestion() {
      if (questionIdx < questions.length - 1) { questionIdx++; return true; }
      complete = true;
      return false;
    },
    isComplete() { return complete; },
    getResults() {
      return {
        examLabel: 'テスト', totalQuestions: questions.length,
        correctCount: answers.filter(a => a.isCorrect).length,
        percentage: 50, details: answers, questions,
      };
    },
  };
}

function createMockQuizView() {
  let answerCb = null;
  let nextCb = null;
  const rendered = [];
  const results = [];
  const explanations = [];
  const nextButtons = [];
  return {
    renderQuestion(q, num) { rendered.push({ q, num }); },
    showResult(r) { results.push(r); },
    showExplanation(e) { explanations.push(e); },
    showNextButton(isLast) { nextButtons.push(isLast); },
    onAnswer(cb) { answerCb = cb; },
    onNext(cb) { nextCb = cb; },
    _triggerAnswer(idx) { if (answerCb) answerCb(idx); },
    _triggerNext() { if (nextCb) nextCb(); },
    _rendered() { return rendered; },
    _results() { return results; },
    _explanations() { return explanations; },
    _nextButtons() { return nextButtons; },
  };
}

function createMockResultView() {
  let backCb = null;
  let renderedResult = null;
  return {
    render(result) { renderedResult = result; },
    onBackToHome(cb) { backCb = cb; },
    _triggerBack() { if (backCb) backCb(); },
    _getRenderedResult() { return renderedResult; },
  };
}

function createMockCopyHelper() {
  const copies = [];
  return {
    generatePrompt(q, expl) { return q.aiPromptTemplate; },
    async copyToClipboard(text) { copies.push(text); return true; },
    _getCopies() { return copies; },
  };
}

function createMockWindow() {
  const listeners = {};
  return {
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener(event, fn) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(f => f !== fn);
      }
    },
    _getListeners(event) { return listeners[event] || []; },
  };
}

// サンプルデータ
const sampleExams = [
  { year: 2025, round: 1, label: '2025年度第1回', file: '2025-1.json' },
];

const sampleExamData = {
  year: 2025, round: 1, label: '2025年度第1回',
  questions: [
    { id: 1, text: '問題1', choices: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '解説1', aiPromptTemplate: 'AI1' },
    { id: 2, text: '問題2', choices: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: '解説2', aiPromptTemplate: 'AI2' },
  ],
};

describe('App', () => {
  let App, app;
  let screenManager, dataLoader, homeView, setupView, quizEngine, quizView, resultView, copyHelper, mockWindow;

  beforeEach(async () => {
    const mod = await import('../js/app.js');
    App = mod.App;

    screenManager = createMockScreenManager();
    dataLoader = createMockDataLoader(sampleExams, sampleExamData);
    homeView = createMockHomeView();
    setupView = createMockSetupView();
    quizEngine = createMockQuizEngine();
    quizView = createMockQuizView();
    resultView = createMockResultView();
    copyHelper = createMockCopyHelper();
    mockWindow = createMockWindow();

    app = new App({
      screenManager, dataLoader, homeView, setupView,
      quizEngine, quizView, resultView, copyHelper,
      win: mockWindow,
    });
  });

  describe('init', () => {
    it('初期化後にホーム画面が表示される', async () => {
      await app.init();
      assert.ok(homeView._isRendered());
    });

    it('初期化後にデータがロードされる', async () => {
      await app.init();
      assert.ok(homeView._isRendered());
    });
  });

  describe('ホーム画面→設定画面の遷移', () => {
    it('試験選択で設定画面に遷移する', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      // loadExamDataはasyncなので少し待つ
      await new Promise(r => setTimeout(r, 10));
      assert.equal(screenManager.getCurrentScreen(), 'setup');
    });

    it('設定画面に選択した試験ラベルが渡される', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      assert.equal(setupView._getRenderedLabel(), '2025年度第1回');
    });
  });

  describe('設定画面→クイズ画面の遷移', () => {
    it('クイズ開始で画面がquizに遷移する', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false });
      assert.equal(screenManager.getCurrentScreen(), 'quiz');
    });

    it('クイズ開始で最初の問題が表示される', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false });
      assert.equal(quizView._rendered().length, 1);
    });
  });

  describe('一問一答モード', () => {
    async function startOneByOne() {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false });
    }

    it('回答後に正誤結果が表示される', async () => {
      await startOneByOne();
      quizView._triggerAnswer(0);
      assert.equal(quizView._results().length, 1);
    });

    it('回答後に解説が表示される', async () => {
      await startOneByOne();
      quizView._triggerAnswer(0);
      assert.equal(quizView._explanations().length, 1);
    });

    it('回答後に次の問題ボタンが表示される', async () => {
      await startOneByOne();
      quizView._triggerAnswer(0);
      assert.equal(quizView._nextButtons().length, 1);
      assert.equal(quizView._nextButtons()[0], false); // 最後ではない
    });

    it('次の問題ボタンで次の問題が表示される', async () => {
      await startOneByOne();
      quizView._triggerAnswer(0);
      quizView._triggerNext();
      assert.equal(quizView._rendered().length, 2);
    });

    it('最後の問題では結果を見るボタンが表示される', async () => {
      await startOneByOne();
      quizView._triggerAnswer(0);
      quizView._triggerNext(); // 問題2へ
      quizView._triggerAnswer(2);
      // 最後の問題なので isLast = true
      const lastBtn = quizView._nextButtons()[quizView._nextButtons().length - 1];
      assert.equal(lastBtn, true);
    });

    it('最後の問題の次ボタンで結果画面に遷移する', async () => {
      await startOneByOne();
      quizView._triggerAnswer(0);
      quizView._triggerNext(); // 問題2へ
      quizView._triggerAnswer(2);
      quizView._triggerNext(); // 結果画面へ
      assert.equal(screenManager.getCurrentScreen(), 'result');
    });
  });

  describe('全問回答モード', () => {
    async function startAllAtOnce() {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'all-at-once', shuffleQuestions: false, shuffleChoices: false });
    }

    it('回答後に解説は表示されず次の問題が表示される', async () => {
      await startAllAtOnce();
      quizView._triggerAnswer(0);
      assert.equal(quizView._explanations().length, 0);
      assert.equal(quizView._rendered().length, 2); // 2問目に自動遷移
    });

    it('最後の問題の回答後に結果画面に遷移する', async () => {
      await startAllAtOnce();
      quizView._triggerAnswer(0); // 問題1回答 → 問題2へ
      quizView._triggerAnswer(2); // 問題2回答 → 結果へ
      assert.equal(screenManager.getCurrentScreen(), 'result');
    });

    it('結果画面に結果データが渡される', async () => {
      await startAllAtOnce();
      quizView._triggerAnswer(0);
      quizView._triggerAnswer(2);
      assert.ok(resultView._getRenderedResult());
      assert.equal(resultView._getRenderedResult().totalQuestions, 2);
    });
  });

  describe('結果画面→ホーム画面', () => {
    it('トップに戻るでホーム画面に遷移する', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'all-at-once', shuffleQuestions: false, shuffleChoices: false });
      quizView._triggerAnswer(0);
      quizView._triggerAnswer(2);
      resultView._triggerBack();
      await new Promise(r => setTimeout(r, 10));
      assert.equal(screenManager.getCurrentScreen(), 'home');
    });
  });

  describe('beforeunload制御', () => {
    it('クイズ画面表示中はbeforeunloadリスナが登録される', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false });
      assert.equal(screenManager.getCurrentScreen(), 'quiz');
      assert.ok(mockWindow._getListeners('beforeunload').length > 0);
    });

    it('結果画面に遷移するとbeforeunloadリスナが解除される', async () => {
      await app.init();
      homeView._triggerSelect(sampleExams[0]);
      await new Promise(r => setTimeout(r, 10));
      setupView._triggerStart({ mode: 'all-at-once', shuffleQuestions: false, shuffleChoices: false });
      quizView._triggerAnswer(0);
      quizView._triggerAnswer(2);
      assert.equal(screenManager.getCurrentScreen(), 'result');
      assert.equal(mockWindow._getListeners('beforeunload').length, 0);
    });

    it('ホーム画面ではbeforeunloadリスナが登録されていない', async () => {
      await app.init();
      assert.equal(mockWindow._getListeners('beforeunload').length, 0);
    });
  });
});
