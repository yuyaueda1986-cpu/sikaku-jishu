class QuizEngine {
  constructor() {
    this._questions = [];
    this._settings = null;
    this._examLabel = '';
    this._currentIndex = 0;
    this._answers = [];
  }

  init(data, settings) {
    this._settings = settings;
    this._examLabel = data.label;
    this._currentIndex = 0;

    // 選択肢数のバリデーション（1〜16択）
    for (const q of data.questions) {
      if (q.choices.length < 1 || q.choices.length > 16) {
        throw new Error(`問題ID ${q.id}: 選択肢の数は1〜16の範囲で指定してください（現在: ${q.choices.length}）`);
      }
    }

    // 問題をディープコピー（シャッフルで元データを壊さないため）
    this._questions = data.questions.map((q) => ({
      id: q.id,
      text: q.text,
      choices: [...q.choices],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      aiPromptTemplate: q.aiPromptTemplate,
      ...(q.figure ? { figure: { ...q.figure } } : {}),
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

    // 回答をインデックスベースで管理（上書き可能）
    this._answers = new Array(this._questions.length).fill(null);
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
    this._answers[this._currentIndex] = result;
    return result;
  }

  nextQuestion() {
    if (this._currentIndex < this._questions.length - 1) {
      this._currentIndex++;
      return true;
    }
    return false;
  }

  prevQuestion() {
    if (this._currentIndex > 0) {
      this._currentIndex--;
      return true;
    }
    return false;
  }

  getAnswerAt(index) {
    return this._answers[index];
  }

  isComplete() {
    return this._answers.every((a) => a !== null);
  }

  getResults() {
    const correctCount = this._answers.filter((a) => a && a.isCorrect).length;
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
