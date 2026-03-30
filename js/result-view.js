class ResultView {
  constructor(section) {
    this._section = section;
    this._backCallback = null;
    this._copyHelper = null;

    // イベント委譲: コピーボタンとトップに戻るボタン
    this._section.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        this._handleCopy(copyBtn);
        return;
      }
      if (e.target.closest('#back-home-btn')) {
        this._handleBackToHome();
        return;
      }
    });
  }

  render(result) {
    const detailsHtml = result.details.map((detail, i) => {
      const q = result.questions[i];
      const isCorrect = detail ? detail.isCorrect : false;
      const label = detail ? (isCorrect ? '正解' : '不正解') : '未回答（不正解）';
      const cssClass = isCorrect ? '' : 'explanation--incorrect';
      const correctChoice = q.choices[detail ? detail.correctIndex : q.correctIndex];

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
      <div class="result-body">
        <h1 class="page-title">${result.examLabel} 結果</h1>
        <div class="result-summary card">
          <p class="result-score">${result.correctCount} / ${result.totalQuestions}</p>
          <p class="result-percentage">${result.percentage}%</p>
        </div>
        ${detailsHtml}
      </div>
      <div class="result-footer result-footer--sticky">
        <button id="back-home-btn" class="btn btn--block">トップに戻る</button>
      </div>
    `;

  }

  setCopyHelper(copyHelper) {
    this._copyHelper = copyHelper;
  }

  onBackToHome(callback) {
    this._backCallback = callback;
  }

  _handleBackToHome() {
    if (this._backCallback) {
      this._backCallback();
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

  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export { ResultView };
