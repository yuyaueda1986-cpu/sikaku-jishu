class QuizView {
  constructor(section) {
    this._section = section;
    this._answerCallback = null;
    this._nextCallback = null;
    this._prevCallback = null;
    this._answered = false;

    this._copyHelper = null;

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
      if (e.target.closest('#prev-btn')) {
        this._handlePrev();
        return;
      }
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        this._handleCopy(copyBtn);
        return;
      }
    });
  }

  renderQuestion(question, number, answerState, mode) {
    this._answered = false;
    this._mode = mode || 'one-by-one';
    this._currentQuestion = question;

    const choiceItems = question.choices.map((choice, i) => {
      const classes = ['choice-item'];
      if (answerState && answerState.selectedIndex === i) {
        classes.push('selected');
      }
      return `<li class="${classes.join(' ')}" data-index="${i}">${choice}</li>`;
    }).join('');

    const figureHtml = question.figure ? this._renderFigure(question.figure) : '';

    this._section.innerHTML = `
      <div class="quiz-body">
        <div class="card">
          <p class="question-text">${question.text}</p>
        </div>
        ${figureHtml}
        <ul class="choice-list${question.choices.length >= 8 ? ' choice-list--compact' : ''}">
          ${choiceItems}
        </ul>
        <div id="result-area"></div>
        <div id="explanation-area"></div>
        <div id="next-area"></div>
      </div>
      <div class="quiz-nav quiz-nav--sticky">
        <button id="prev-btn" class="btn btn--secondary">前の問題</button>
        <span class="progress-text">問題 ${number.current} / ${number.total}</span>
        <button id="next-btn" class="btn btn--secondary">次の問題</button>
      </div>
    `;

    // 一問一答モード: 回答済みなら結果・解説を表示し、選択肢をロック
    if (answerState && mode === 'one-by-one') {
      this._answered = true;
      this.showResult(answerState);
      this.showExplanation({
        text: question.explanation,
        aiPromptTemplate: question.aiPromptTemplate,
      });
    }

    if (question.figure && question.figure.type === 'mermaid') {
      if (typeof mermaid !== 'undefined' && mermaid.run) {
        mermaid.run({ nodes: this._section.querySelectorAll('.mermaid') });
      }
    }
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

  setCopyHelper(copyHelper) {
    this._copyHelper = copyHelper;
  }

  onAnswer(callback) {
    this._answerCallback = callback;
  }

  onNext(callback) {
    this._nextCallback = callback;
  }

  onPrev(callback) {
    this._prevCallback = callback;
  }

  _handleAnswer(index) {
    if (this._answered && this._mode === 'one-by-one') return;

    // 選択状態をUIに反映
    const items = this._section.querySelectorAll('.choice-item');
    items.forEach((item) => item.classList.remove('selected'));
    if (items[index]) items[index].classList.add('selected');

    if (this._mode === 'one-by-one') {
      this._answered = true;
    }
    if (this._answerCallback) {
      this._answerCallback(index);
    }
  }

  _handleNext() {
    if (this._nextCallback) {
      this._nextCallback();
    }
  }

  _handlePrev() {
    if (this._prevCallback) {
      this._prevCallback();
    }
  }

  async _handleCopy(btn) {
    if (!this._copyHelper) return;
    const text = btn.dataset.copyText;
    const feedback = btn.nextElementSibling;
    const success = await this._copyHelper.copyToClipboard(text);
    if (feedback) {
      feedback.textContent = success ? 'コピーしました' : 'コピーに失敗しました';
      feedback.classList.add('visible');
      setTimeout(() => feedback.classList.remove('visible'), 2000);
    }
  }

  _renderFigure(figure) {
    const alt = figure.alt || '';
    let inner;
    if (figure.type === 'mermaid') {
      inner = `<pre class="mermaid">${figure.content}</pre>`;
    } else {
      inner = `<img src="data/images/${figure.src}" alt="${alt}">`;
    }
    return `<div class="question-figure">${inner}</div>`;
  }

  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export { QuizView };
