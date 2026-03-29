import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// DOM モック
function createMockSection() {
  let html = '';
  const elementStore = {};

  function makeElement(tag, attrs = {}) {
    const el = {
      _tag: tag,
      _listeners: {},
      _children: [],
      checked: false,
      ...attrs,
      classList: {
        _set: new Set(attrs.className ? attrs.className.split(' ') : []),
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
        contains(cls) { return this._set.has(cls); },
        toggle(cls) { this._set.has(cls) ? this._set.delete(cls) : this._set.add(cls); },
      },
      addEventListener(event, fn) {
        this._listeners[event] = this._listeners[event] || [];
        this._listeners[event].push(fn);
      },
      click() {
        (this._listeners['click'] || []).forEach(fn => fn());
      },
    };
    return el;
  }

  return {
    id: 'setup',
    get innerHTML() { return html; },
    set innerHTML(v) {
      html = v;
      // パースして要素を生成
      Object.keys(elementStore).forEach(k => delete elementStore[k]);

      // モード項目
      const modeRegex = /data-mode="([^"]+)"/g;
      let m;
      const modeItems = [];
      while ((m = modeRegex.exec(v)) !== null) {
        modeItems.push(makeElement('li', { dataset: { mode: m[1] }, className: 'mode-item' }));
      }
      elementStore['.mode-item'] = modeItems;

      // トグル
      elementStore['#shuffle-questions'] = makeElement('input', { id: 'shuffle-questions', checked: false });
      elementStore['#shuffle-choices'] = makeElement('input', { id: 'shuffle-choices', checked: false });

      // 開始ボタン
      elementStore['#start-quiz'] = makeElement('button', { id: 'start-quiz' });
    },
    querySelector(selector) {
      return elementStore[selector] || null;
    },
    querySelectorAll(selector) {
      return elementStore[selector] || [];
    },
  };
}

describe('SetupView', () => {
  let SetupView, section;

  beforeEach(async () => {
    const mod = await import('../js/setup-view.js');
    SetupView = mod.SetupView;
    section = createMockSection();
  });

  it('render で年度・回次名が表示される', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    assert.ok(section.innerHTML.includes('2025年度第1回'));
  });

  it('render でモード選択肢（一問一答・全問回答）が表示される', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    assert.ok(section.innerHTML.includes('一問一答'));
    assert.ok(section.innerHTML.includes('全問回答'));
  });

  it('render でランダム化トグルが表示される', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    assert.ok(section.innerHTML.includes('shuffle-questions'));
    assert.ok(section.innerHTML.includes('shuffle-choices'));
  });

  it('render で開始ボタンが表示される', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    assert.ok(section.innerHTML.includes('start-quiz'));
  });

  it('getSettings でデフォルト設定を返す', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    const settings = view.getSettings();
    assert.equal(settings.mode, 'one-by-one');
    assert.equal(settings.shuffleQuestions, false);
    assert.equal(settings.shuffleChoices, false);
  });

  it('モード選択で設定が変更される', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    view._selectMode('all-at-once');
    const settings = view.getSettings();
    assert.equal(settings.mode, 'all-at-once');
  });

  it('トグル変更でランダム化設定が反映される', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');

    // トグルをONに
    const qToggle = section.querySelector('#shuffle-questions');
    qToggle.checked = true;
    const cToggle = section.querySelector('#shuffle-choices');
    cToggle.checked = true;

    const settings = view.getSettings();
    assert.equal(settings.shuffleQuestions, true);
    assert.equal(settings.shuffleChoices, true);
  });

  it('onStart で開始コールバックが設定される', () => {
    const view = new SetupView(section);
    const calls = [];
    view.onStart((settings) => calls.push(settings));
    view.render('2025年度第1回');

    // 開始ボタンクリックをシミュレート
    view._handleStart();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].mode, 'one-by-one');
  });

  it('デフォルトでランダム化はオフ', () => {
    const view = new SetupView(section);
    view.render('2025年度第1回');
    const settings = view.getSettings();
    assert.equal(settings.shuffleQuestions, false);
    assert.equal(settings.shuffleChoices, false);
  });
});
