class QuizView {
  constructor(section) {
    this._section = section;
    this._answerCallback = null;
    this._nextCallback = null;
    this._answered = false;

    // イベント委譲: sectionレベルで一度だけ登録
    this._section.addEventListener('click', (e) => {
      const choiceItem = e.target.closest('.choice-item');
      if (choiceItem) {
        const index = parseInt(choiceItem.dataset.index, 10);
        this._handleAnswer(index);
        return;
      }
      if (e.target.closest('#next-btn')) {
        this._handleNext();
        return;
      }
    });
  }

  renderQuestion(question, number) {
    this._answered = false;
    this._currentQuestion = question;

    const choiceItems = question.choices.map((choice, i) =>
      `<li class="choice-item" data-index="${i}">${choice}</li>`
    ).join('');

    this._section.innerHTML = `
      <div class="progress-bar">問題 ${number.current} / ${number.total}</div>
      <div class="card">
        <p class="question-text">${question.text}</p>
      </div>
      <ul class="choice-list">
        ${choiceItems}
      </ul>
      <div id="result-area"></div>
      <div id="explanation-area"></div>
      <div id="next-area"></div>
    `;
  }

  showResult(result) {
    const label = result.isCorrect ? '正解' : '不正解';

    const resultHtml = `<div class="explanation ${result.isCorrect ? '' : 'explanation--incorrect'}">
      <p><strong>${label}</strong></p>
    </div>`;

    this._section.innerHTML = this._section.innerHTML.replace(
      '<div id="result-area"></div>',
      `<div id="result-area">${resultHtml}</div>`
    );
  }

  showExplanation(explanation) {
    const explHtml = `<div class="quiz-explanation">
      <div class="explanation">
        <p>${explanation.text}</p>
      </div>
      <div class="copy-area">
        <p class="section-title">AI に聞いてみよう</p>
        <p class="copy-text">${explanation.aiPromptTemplate}</p>
        <button class="btn btn--secondary copy-btn" data-copy-text="${this._escapeAttr(explanation.aiPromptTemplate)}">コピー</button>
        <span class="copy-feedback"></span>
      </div>
    </div>`;

    this._section.innerHTML = this._section.innerHTML.replace(
      '<div id="explanation-area"></div>',
      `<div id="explanation-area">${explHtml}</div>`
    );
  }

  showNextButton(isLast) {
    const label = isLast ? '結果を見る' : '次の問題';
    const btnHtml = `<button id="next-btn" class="btn btn--block">${label}</button>`;

    this._section.innerHTML = this._section.innerHTML.replace(
      '<div id="next-area"></div>',
      `<div id="next-area">${btnHtml}</div>`
    );
  }

  onAnswer(callback) {
    this._answerCallback = callback;
  }

  onNext(callback) {
    this._nextCallback = callback;
  }

  _handleAnswer(index) {
    if (this._answered) return;
    this._answered = true;
    if (this._answerCallback) {
      this._answerCallback(index);
    }
  }

  _handleNext() {
    if (this._nextCallback) {
      this._nextCallback();
    }
  }

  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export { QuizView };
