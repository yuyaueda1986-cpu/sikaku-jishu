class App {
  constructor(deps) {
    this._screenManager = deps.screenManager;
    this._dataLoader = deps.dataLoader;
    this._homeView = deps.homeView;
    this._setupView = deps.setupView;
    this._quizEngine = deps.quizEngine;
    this._quizView = deps.quizView;
    this._resultView = deps.resultView;
    this._copyHelper = deps.copyHelper;
    this._win = deps.win || window;

    this._currentExamData = null;
    this._currentSettings = null;
    this._beforeUnloadHandler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
  }

  async init() {
    this._bindCallbacks();
    this._setupScreenChangeHandler();
    await this._loadAndShowHome();
  }

  async _loadAndShowHome() {
    const index = await this._dataLoader.loadIndex();
    const exams = this._dataLoader.getAvailableExams();
    this._homeView.render(exams);
    this._screenManager.showScreen('home');
  }

  _bindCallbacks() {
    // ホーム画面: 試験選択
    this._homeView.onExamSelect(async (exam) => {
      this._currentExamData = await this._dataLoader.loadExamData(exam.year, exam.round);
      this._setupView.render(this._currentExamData.label);
      this._screenManager.showScreen('setup');
    });

    // 設定画面: クイズ開始
    this._setupView.onStart((settings) => {
      this._currentSettings = settings;
      this._quizEngine.init(this._currentExamData, settings);
      this._showCurrentQuestion();
      this._screenManager.showScreen('quiz');
    });

    // クイズ画面: 回答
    this._quizView.onAnswer((index) => {
      const result = this._quizEngine.submitAnswer(index);

      if (this._currentSettings.mode === 'one-by-one') {
        // 一問一答: 正誤・解説・次ボタンを表示
        this._quizView.showResult(result);
        const q = this._quizEngine.getCurrentQuestion();
        this._quizView.showExplanation({
          text: q.explanation,
          aiPromptTemplate: q.aiPromptTemplate,
        });
        const hasNext = this._quizEngine.nextQuestion();
        this._quizView.showNextButton(!hasNext);
      } else {
        // 全問回答: 次の問題に自動進行
        const hasNext = this._quizEngine.nextQuestion();
        if (hasNext) {
          this._showCurrentQuestion();
        } else {
          this._showResults();
        }
      }
    });

    // クイズ画面: 次の問題
    this._quizView.onNext(() => {
      if (this._quizEngine.isComplete()) {
        this._showResults();
      } else {
        this._showCurrentQuestion();
      }
    });

    // 結果画面: トップに戻る
    this._resultView.onBackToHome(async () => {
      await this._loadAndShowHome();
    });
  }

  _showCurrentQuestion() {
    const question = this._quizEngine.getCurrentQuestion();
    const number = this._quizEngine.getQuestionNumber();
    this._quizView.renderQuestion(question, number);
  }

  _showResults() {
    const results = this._quizEngine.getResults();
    this._resultView.render(results);
    this._screenManager.showScreen('result');
  }

  _setupScreenChangeHandler() {
    this._screenManager.onScreenChange((screenId) => {
      if (screenId === 'quiz') {
        this._win.addEventListener('beforeunload', this._beforeUnloadHandler);
      } else {
        this._win.removeEventListener('beforeunload', this._beforeUnloadHandler);
      }
    });
  }
}

export { App };
