class ResultView {
  constructor(section) {
    this._section = section;
    this._backCallback = null;
  }

  render(result) {
    const detailsHtml = result.details.map((detail, i) => {
      const q = result.questions[i];
      const isCorrect = detail.isCorrect;
      const label = isCorrect ? '正解' : '不正解';
      const cssClass = isCorrect ? '' : 'explanation--incorrect';
      const correctChoice = q.choices[detail.correctIndex];

      return `
        <div class="card">
          <p class="section-title">問${i + 1}: ${q.text}</p>
          <p><strong>${label}</strong> — 正解: ${correctChoice}</p>
          <div class="explanation ${cssClass}">
            <p>${q.explanation}</p>
          </div>
          <div class="copy-area">
            <p class="section-title">AI に聞いてみよう</p>
            <p class="copy-text">${q.aiPromptTemplate}</p>
            <button class="btn btn--secondary copy-btn" data-copy-text="${this._escapeAttr(q.aiPromptTemplate)}">コピー</button>
            <span class="copy-feedback"></span>
          </div>
        </div>`;
    }).join('');

    this._section.innerHTML = `
      <h1 class="page-title">${result.examLabel} 結果</h1>
      <div class="result-summary card">
        <p class="result-score">${result.correctCount} / ${result.totalQuestions}</p>
        <p class="result-percentage">${result.percentage}%</p>
      </div>
      ${detailsHtml}
      <button id="back-home-btn" class="btn btn--block">トップに戻る</button>
    `;

    this._bindEvents();
  }

  onBackToHome(callback) {
    this._backCallback = callback;
  }

  _handleBackToHome() {
    if (this._backCallback) {
      this._backCallback();
    }
  }

  _bindEvents() {
    const btn = this._section.querySelector('#back-home-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        this._handleBackToHome();
      });
    }
  }

  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export { ResultView };
