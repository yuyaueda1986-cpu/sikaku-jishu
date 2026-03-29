import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// DOM モック
function createMockDOM() {
  const sections = {
    home: { id: 'home', classList: new Set(['screen', 'active']) },
    setup: { id: 'setup', classList: new Set(['screen']) },
    quiz: { id: 'quiz', classList: new Set(['screen']) },
    result: { id: 'result', classList: new Set(['screen']) },
  };

  // classList の add/remove/contains をシミュレート
  for (const section of Object.values(sections)) {
    const original = section.classList;
    section.classList = {
      add(cls) { original.add(cls); },
      remove(cls) { original.delete(cls); },
      contains(cls) { return original.has(cls); },
    };
  }

  const mockDocument = {
    querySelectorAll(selector) {
      if (selector === '.screen') return Object.values(sections);
      return [];
    },
    getElementById(id) {
      return sections[id] || null;
    },
  };

  return { sections, mockDocument };
}

describe('ScreenManager', () => {
  let ScreenManager, sm, sections, mockDocument;

  beforeEach(async () => {
    const mod = await import('../js/screen-manager.js');
    ScreenManager = mod.ScreenManager;
    ({ sections, mockDocument } = createMockDOM());
    sm = new ScreenManager(mockDocument);
  });

  it('初期状態で現在の画面を取得できる', () => {
    assert.equal(sm.getCurrentScreen(), 'home');
  });

  it('showScreen で指定画面に切り替わる', () => {
    sm.showScreen('quiz');
    assert.equal(sm.getCurrentScreen(), 'quiz');
    assert.ok(sections.quiz.classList.contains('active'));
    assert.ok(!sections.home.classList.contains('active'));
  });

  it('showScreen で他の全画面が非表示になる', () => {
    sm.showScreen('setup');
    assert.ok(!sections.home.classList.contains('active'));
    assert.ok(sections.setup.classList.contains('active'));
    assert.ok(!sections.quiz.classList.contains('active'));
    assert.ok(!sections.result.classList.contains('active'));
  });

  it('存在しない画面IDを指定するとエラーにならない', () => {
    assert.doesNotThrow(() => sm.showScreen('nonexistent'));
    assert.equal(sm.getCurrentScreen(), 'home');
  });

  it('onScreenChange コールバックが画面変更時に呼ばれる', () => {
    const calls = [];
    sm.onScreenChange((screenId) => calls.push(screenId));
    sm.showScreen('setup');
    sm.showScreen('quiz');
    assert.deepEqual(calls, ['setup', 'quiz']);
  });

  it('同じ画面に遷移してもコールバックが呼ばれる', () => {
    const calls = [];
    sm.onScreenChange((screenId) => calls.push(screenId));
    sm.showScreen('home');
    assert.deepEqual(calls, ['home']);
  });
});
