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
    this._markdownRenderer = deps.markdownRenderer ?? null;
    this._win = deps.win || window;

    this._currentExamData = null;
    this._currentSettings = null;
    this._beforeUnloadHandler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
  }

  async init() {
    this._quizView.setCopyHelper(this._copyHelper);
    this._quizView.setMarkdownRenderer(this._markdownRenderer);
    this._quizView.setDataLoader(this._dataLoader);
    this._resultView.setCopyHelper(this._copyHelper);
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
      this._currentExamData = await this._dataLoader.loadExamData(exam.file);
      this._setupView.render(this._currentExamData.label);
      this._screenManager.showScreen('setup');
    });

    // 設定画面: クイズ開始
    this._setupView.onStart(async (settings) => {
      this._currentSettings = settings;
      this._quizEngine.init(this._currentExamData, settings);
      await this._showCurrentQuestion();
      this._screenManager.showScreen('quiz');
    });

    // クイズ画面: 回答
    this._quizView.onAnswer(async (index) => {
      const result = this._quizEngine.submitAnswer(index);

      if (this._currentSettings.mode === 'one-by-one') {
        // 一問一答: 正誤・解説を表示（インデックスは進めない）
        this._quizView.showResult(result);
        const q = this._quizEngine.getCurrentQuestion();
        this._quizView.showExplanation({
          text: q.explanation,
          aiPromptTemplate: q.aiPromptTemplate,
        });
      } else {
        // 全問回答モード: 回答後に自動で次の問題へ進む
        const number = this._quizEngine.getQuestionNumber();
        if (number.current === number.total) {
          // 最後の問題 → 確認して結果表示
          if (this._win.confirm('結果を表示しますか？')) {
            this._showResults();
          }
        } else {
          this._quizEngine.nextQuestion();
          await this._showCurrentQuestion();
        }
      }
    });

    // クイズ画面: 前の問題
    this._quizView.onPrev(async () => {
      const number = this._quizEngine.getQuestionNumber();
      if (number.current === 1) {
        if (this._win.confirm('TOPページに戻りますか？')) {
          this._loadAndShowHome();
        }
      } else {
        this._quizEngine.prevQuestion();
        await this._showCurrentQuestion();
      }
    });

    // クイズ画面: 次の問題
    this._quizView.onNext(async () => {
      const number = this._quizEngine.getQuestionNumber();
      if (number.current === number.total) {
        if (this._win.confirm('結果を表示しますか？')) {
          this._showResults();
        }
      } else {
        this._quizEngine.nextQuestion();
        await this._showCurrentQuestion();
      }
    });

    // 結果画面: トップに戻る
    this._resultView.onBackToHome(async () => {
      await this._loadAndShowHome();
    });
  }

  async _showCurrentQuestion() {
    const question = this._quizEngine.getCurrentQuestion();
    const number = this._quizEngine.getQuestionNumber();
    const answerState = this._quizEngine.getCurrentAnswer();
    await this._quizView.renderQuestion(question, number, answerState, this._currentSettings.mode);
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
