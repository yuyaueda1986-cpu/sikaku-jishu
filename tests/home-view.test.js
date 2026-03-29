import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// DOM モック
function createMockSection() {
  let html = '';
  const elements = [];

  return {
    id: 'home',
    get innerHTML() { return html; },
    set innerHTML(v) {
      html = v;
      elements.length = 0;
      // data-index 属性からリスト要素を生成
      const regex = /data-index="(\d+)"/g;
      let m;
      while ((m = regex.exec(v)) !== null) {
        const idx = m[1];
        const el = {
          dataset: { index: idx },
          _listeners: {},
          addEventListener(event, fn) {
            this._listeners[event] = this._listeners[event] || [];
            this._listeners[event].push(fn);
          },
        };
        elements.push(el);
      }
    },
    querySelectorAll(selector) {
      if (selector === '.exam-item') return elements;
      return [];
    },
  };
}

describe('HomeView', () => {
  let HomeView, section;

  const sampleExams = [
    { year: 2025, round: 1, label: '2025年度第1回', file: '2025-1.json' },
    { year: 2024, round: 1, label: '2024年度第1回', file: '2024-1.json' },
  ];

  beforeEach(async () => {
    const mod = await import('../js/home-view.js');
    HomeView = mod.HomeView;
    section = createMockSection();
  });

  it('render でサイトタイトルが表示される', () => {
    const view = new HomeView(section);
    view.render(sampleExams);
    assert.ok(section.innerHTML.includes('電気通信主任技術者 過去問クイズ'));
  });

  it('render で概要説明が表示される', () => {
    const view = new HomeView(section);
    view.render(sampleExams);
    assert.ok(section.innerHTML.includes('過去問'));
  });

  it('render でリロード注意書きが表示される', () => {
    const view = new HomeView(section);
    view.render(sampleExams);
    assert.ok(section.innerHTML.includes('リロード'));
    assert.ok(section.innerHTML.includes('リセット'));
  });

  it('render で年度・回次の一覧が表示される', () => {
    const view = new HomeView(section);
    view.render(sampleExams);
    assert.ok(section.innerHTML.includes('2025年度第1回'));
    assert.ok(section.innerHTML.includes('2024年度第1回'));
  });

  it('render で試験数分の選択項目がある', () => {
    const view = new HomeView(section);
    view.render(sampleExams);
    const items = section.querySelectorAll('.exam-item');
    assert.equal(items.length, 2);
  });

  it('render で空配列の場合もエラーにならない', () => {
    const view = new HomeView(section);
    assert.doesNotThrow(() => view.render([]));
  });

  it('onExamSelect で選択コールバックが設定される', () => {
    const view = new HomeView(section);
    const calls = [];
    view.onExamSelect((exam) => calls.push(exam));
    view.render(sampleExams);

    view._handleExamClick(0);
    assert.deepEqual(calls, [sampleExams[0]]);
  });

  it('onExamSelect で複数回のクリックに対応する', () => {
    const view = new HomeView(section);
    const calls = [];
    view.onExamSelect((exam) => calls.push(exam));
    view.render(sampleExams);

    view._handleExamClick(0);
    view._handleExamClick(1);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], sampleExams[1]);
  });
});
