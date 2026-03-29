class QuizEngine {
  constructor() {
    this._questions = [];
    this._settings = null;
    this._examLabel = '';
    this._currentIndex = 0;
    this._answers = [];
    this._complete = false;
  }

  init(data, settings) {
    this._settings = settings;
    this._examLabel = data.label;
    this._currentIndex = 0;
    this._answers = [];
    this._complete = false;

    // 問題をディープコピー（シャッフルで元データを壊さないため）
    this._questions = data.questions.map((q) => ({
      id: q.id,
      text: q.text,
      choices: [...q.choices],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      aiPromptTemplate: q.aiPromptTemplate,
    }));

    // 選択肢ランダム化（出題順シャッフルより先に実行）
    if (settings.shuffleChoices) {
      for (const q of this._questions) {
        const correctChoice = q.choices[q.correctIndex];
        this._shuffle(q.choices);
        q.correctIndex = q.choices.indexOf(correctChoice);
      }
    }

    // 出題順ランダム化
    if (settings.shuffleQuestions) {
      this._shuffle(this._questions);
    }
  }

  getCurrentQuestion() {
    return this._questions[this._currentIndex];
  }

  getQuestionNumber() {
    return {
      current: this._currentIndex + 1,
      total: this._questions.length,
    };
  }

  submitAnswer(index) {
    const q = this._questions[this._currentIndex];
    const result = {
      questionId: q.id,
      selectedIndex: index,
      correctIndex: q.correctIndex,
      isCorrect: index === q.correctIndex,
    };
    this._answers.push(result);
    return result;
  }

  nextQuestion() {
    if (this._currentIndex < this._questions.length - 1) {
      this._currentIndex++;
      return true;
    }
    this._complete = true;
    return false;
  }

  isComplete() {
    return this._complete;
  }

  getResults() {
    const correctCount = this._answers.filter((a) => a.isCorrect).length;
    const total = this._questions.length;
    return {
      examLabel: this._examLabel,
      totalQuestions: total,
      correctCount,
      percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      details: this._answers,
      questions: this._questions,
    };
  }

  _shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

export { QuizEngine };
