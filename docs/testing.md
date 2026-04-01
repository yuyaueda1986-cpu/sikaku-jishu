# テストガイド

---

## テスト実行

```bash
# 全テストを実行
node --test tests/*.test.js

# 特定ファイルのみ
node --test tests/quiz-engine.test.js
```

**要件**: Node.js 22 以上（`node:test` モジュールを使用）

---

## テストファイル一覧

| ファイル | 対象クラス | テスト数 |
|---|---|---|
| `tests/screen-manager.test.js` | ScreenManager | - |
| `tests/data-loader.test.js` | DataLoader | - |
| `tests/quiz-data.test.js` | data/2025-1.json の形式検証 | - |
| `tests/home-view.test.js` | HomeView | - |
| `tests/setup-view.test.js` | SetupView | - |
| `tests/quiz-engine.test.js` | QuizEngine | - |
| `tests/quiz-view.test.js` | QuizView | - |
| `tests/copy-helper.test.js` | CopyHelper | - |
| `tests/result-view.test.js` | ResultView | - |
| `tests/app.test.js` | App（統合） | - |
| `tests/markdown-renderer.test.js` | MarkdownRenderer | - |

---

## テスト設計方針

### DOM モック

ブラウザAPIは Node.js に存在しないため、各 View のテストでは `section` 要素をオブジェクトでモックする。

```js
// 最小限の section モック例
function createMockSection() {
  let html = '';
  return {
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; },
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    addEventListener(event, fn) {},
  };
}
```

### 依存性注入によるモック差し替え

`App` はすべての依存コンポーネントをコンストラクタで受け取るため、テストではモックオブジェクトを渡す。

```js
const app = new App({
  screenManager: mockScreenManager,
  dataLoader: mockDataLoader,
  // ...
});
```

### 非同期処理の待機

`HomeView.onExamSelect` コールバック内の `loadExamData` は async のため、テストでは短いタイムアウトで待機する。

```js
homeView._triggerSelect(exam);
await new Promise(r => setTimeout(r, 10));
assert.equal(screenManager.getCurrentScreen(), 'setup');
```

---

## 新しいテストを追加する場合

1. `tests/` フォルダに `クラス名.test.js` を作成する
2. `node:test` と `node:assert/strict` を使用する
3. ES Modules 形式（`import`）でテスト対象を読み込む

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('MyClass', () => {
  it('something', async () => {
    const mod = await import('../js/my-class.js');
    // テストコード
  });
});
```
