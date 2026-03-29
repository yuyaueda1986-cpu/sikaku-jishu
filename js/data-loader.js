class DataLoader {
  constructor(fetchFn) {
    this._fetch = fetchFn || fetch.bind(globalThis);
    this._index = null;
  }

  async loadIndex() {
    const response = await this._fetch('data/index.json');
    if (!response.ok) {
      throw new Error('データの読み込みに失敗しました: index.json');
    }
    this._index = await response.json();
    return this._index;
  }

  getAvailableExams() {
    if (!this._index) return [];
    return this._index.exams;
  }

  async loadExamData(year, round) {
    if (!this._index) {
      throw new Error('インデックスが読み込まれていません');
    }

    const entry = this._index.exams.find(
      (e) => e.year === year && e.round === round
    );
    if (!entry) {
      throw new Error(`${year}年度第${round}回のデータが見つかりません`);
    }

    const response = await this._fetch(`data/${entry.file}`);
    if (!response.ok) {
      throw new Error(`データの読み込みに失敗しました: ${entry.file}`);
    }
    return response.json();
  }
}

export { DataLoader };
