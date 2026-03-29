class HomeView {
  constructor(section) {
    this._section = section;
    this._exams = [];
    this._selectCallback = null;
  }

  render(exams) {
    this._exams = exams;

    const examItems = exams.map((exam, i) =>
      `<li class="exam-item" data-index="${i}">${exam.label}</li>`
    ).join('');

    this._section.innerHTML = `
      <h1 class="page-title">とあるエンジニアの資格自習HP</h1>
      <div class="card">
        <p>電気通信主任技術者試験の過去問をクイズ形式で学習できるようにする予定。</br>
           いろいろな試験問題を増やせたら・・・いいなあ。
        </p>
      </div>
      <p class="notice">ページをリロードすると進捗がリセットされる。世の中そういうものだ。</p>
      <ul class="exam-list">
        ${examItems}
      </ul>
    `;

    this._bindEvents();
  }

  onExamSelect(callback) {
    this._selectCallback = callback;
  }

  _bindEvents() {
    const items = this._section.querySelectorAll('.exam-item');
    for (const item of items) {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index, 10);
        this._handleExamClick(index);
      });
    }
  }

  _handleExamClick(index) {
    if (this._selectCallback && this._exams[index]) {
      this._selectCallback(this._exams[index]);
    }
  }
}

export { HomeView };
