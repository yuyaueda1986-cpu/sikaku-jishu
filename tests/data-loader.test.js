import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockIndex = {
  exams: [
    { year: 2025, round: 1, kind: '電気通信主任技術者.法規', label: '2025年度第1回 電気通信主任技術者法規', file: '2025-1.json' },
    { year: 2025, round: 2, kind: '電気通信主任技術者.電気通信システム', label: '2025年度第2回 電気通信主任技術者電気通信システム', file: '2025-2.json' },
  ],
};

const mockQuizData = {
  year: 2025,
  round: 1,
  kind: '電気通信主任技術者.法規',
  label: '2025年度第1回 電気通信主任技術者法規',
  questions: [
    {
      id: 1,
      text: 'テスト問題',
      choices: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: '解説テキスト',
      aiPromptTemplate: 'テンプレート',
    },
  ],
};

function createMockFetch(responses) {
  return async (url) => {
    const key = Object.keys(responses).find((k) => url.includes(k));
    if (key && responses[key].ok) {
      return { ok: true, json: async () => responses[key].data };
    }
    return { ok: false, status: 404, statusText: 'Not Found' };
  };
}

describe('DataLoader', () => {
  let DataLoader;

  beforeEach(async () => {
    const mod = await import('../js/data-loader.js');
    DataLoader = mod.DataLoader;
  });

  it('loadIndex でインデックスデータを取得できる', async () => {
    const fetch = createMockFetch({
      'data/index.json': { ok: true, data: mockIndex },
    });
    const loader = new DataLoader(fetch);
    const result = await loader.loadIndex();
    assert.deepEqual(result, mockIndex);
  });

  it('loadIndex 後に getAvailableExams で試験一覧を取得できる', async () => {
    const fetch = createMockFetch({
      'data/index.json': { ok: true, data: mockIndex },
    });
    const loader = new DataLoader(fetch);
    await loader.loadIndex();
    const exams = loader.getAvailableExams();
    assert.equal(exams.length, 2);
    assert.equal(exams[0].label, '2025年度第1回 電気通信主任技術者法規');
  });

  it('loadIndex 前に getAvailableExams は空配列を返す', async () => {
    const fetch = createMockFetch({});
    const loader = new DataLoader(fetch);
    const exams = loader.getAvailableExams();
    assert.deepEqual(exams, []);
  });

  it('loadExamData(file) でクイズデータを取得できる', async () => {
    const fetch = createMockFetch({
      'data/index.json': { ok: true, data: mockIndex },
      'data/2025-1.json': { ok: true, data: mockQuizData },
    });
    const loader = new DataLoader(fetch);
    await loader.loadIndex();
    const result = await loader.loadExamData('2025-1.json');
    assert.equal(result.year, 2025);
    assert.equal(result.kind, '電気通信主任技術者.法規');
    assert.equal(result.questions.length, 1);
  });

  it('loadIndex 失敗時にエラーメッセージを返す', async () => {
    const fetch = createMockFetch({});
    const loader = new DataLoader(fetch);
    await assert.rejects(() => loader.loadIndex(), {
      message: /データの読み込みに失敗/,
    });
  });

  it('loadExamData で存在しないファイルを指定するとエラー', async () => {
    const fetch = createMockFetch({
      'data/index.json': { ok: true, data: mockIndex },
    });
    const loader = new DataLoader(fetch);
    await loader.loadIndex();
    await assert.rejects(() => loader.loadExamData('nonexistent.json'), {
      message: /見つかりません/,
    });
  });

  it('loadExamData でfetch失敗時にエラーメッセージを返す', async () => {
    const fetch = createMockFetch({
      'data/index.json': { ok: true, data: mockIndex },
    });
    const loader = new DataLoader(fetch);
    await loader.loadIndex();
    await assert.rejects(() => loader.loadExamData('2025-1.json'), {
      message: /データの読み込みに失敗/,
    });
  });

  describe('loadMarkdownFile', () => {
    it('Markdownファイルを取得してテキストを返す', async () => {
      const mdContent = '# テスト\n\nMarkdownコンテンツ';
      const mockFetch = async (url) => {
        if (url === 'data/md/test/sample.md') {
          return { ok: true, text: async () => mdContent };
        }
        return { ok: false, status: 404 };
      };
      const loader = new DataLoader(mockFetch);
      const result = await loader.loadMarkdownFile('md/test/sample.md');
      assert.equal(result, mdContent);
    });

    it('fetch失敗時にErrorをthrowする', async () => {
      const mockFetch = async () => ({ ok: false, status: 404 });
      const loader = new DataLoader(mockFetch);
      await assert.rejects(() => loader.loadMarkdownFile('md/notfound.md'), Error);
    });
  });
});
