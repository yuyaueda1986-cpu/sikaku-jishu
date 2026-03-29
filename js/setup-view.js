class SetupView {
  constructor(section) {
    this._section = section;
    this._selectedMode = 'one-by-one';
    this._startCallback = null;
    this._shuffleQuestionsEl = null;
    this._shuffleChoicesEl = null;
  }

  render(examLabel) {
    this._selectedMode = 'one-by-one';

    this._section.innerHTML = `
      <h1 class="page-title">${examLabel}</h1>

      <div class="card">
        <h2 class="section-title">回答モード</h2>
        <ul class="mode-list">
          <li class="mode-item selected" data-mode="one-by-one">一問一答モード<br><small>1問ずつ回答・解説確認</small></li>
          <li class="mode-item" data-mode="all-at-once">全問回答モード<br><small>全問回答後にまとめて結果確認</small></li>
        </ul>
      </div>

      <div class="card">
        <h2 class="section-title">オプション</h2>
        <div class="toggle">
          <span>出題順ランダム化</span>
          <label class="toggle-switch">
            <input type="checkbox" id="shuffle-questions">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle">
          <span>選択肢ランダム化</span>
          <label class="toggle-switch">
            <input type="checkbox" id="shuffle-choices">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <button id="start-quiz" class="btn btn--block">クイズ開始</button>
    `;

    this._shuffleQuestionsEl = this._section.querySelector('#shuffle-questions');
    this._shuffleChoicesEl = this._section.querySelector('#shuffle-choices');
    this._bindEvents();
  }

  getSettings() {
    return {
      mode: this._selectedMode,
      shuffleQuestions: this._shuffleQuestionsEl ? this._shuffleQuestionsEl.checked : false,
      shuffleChoices: this._shuffleChoicesEl ? this._shuffleChoicesEl.checked : false,
    };
  }

  onStart(callback) {
    this._startCallback = callback;
  }

  _selectMode(mode) {
    this._selectedMode = mode;
    const items = this._section.querySelectorAll('.mode-item');
    for (const item of items) {
      if (item.dataset.mode === mode) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    }
  }

  _handleStart() {
    if (this._startCallback) {
      this._startCallback(this.getSettings());
    }
  }

  _bindEvents() {
    const modeItems = this._section.querySelectorAll('.mode-item');
    for (const item of modeItems) {
      item.addEventListener('click', () => {
        this._selectMode(item.dataset.mode);
      });
    }

    const startBtn = this._section.querySelector('#start-quiz');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this._handleStart();
      });
    }
  }
}

export { SetupView };
