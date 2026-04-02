# モジュール仕様書

各クラスのインターフェース・責務・使用例をまとめる。

---

## App

**ファイル**: `js/app.js`
**責務**: 全コンポーネントを接続し、画面フロー全体を制御するエントリーポイント。

### コンストラクタ

```js
new App(deps)
```

`deps` オブジェクトの各フィールド:

| フィールド | 型 | 説明 |
|---|---|---|
| `screenManager` | ScreenManager | 画面切り替え |
| `dataLoader` | DataLoader | JSONデータ読み込み |
| `homeView` | HomeView | ホーム画面UI |
| `setupView` | SetupView | 設定画面UI |
| `quizEngine` | QuizEngine | クイズロジック |
| `quizView` | QuizView | クイズ画面UI |
| `resultView` | ResultView | 結果画面UI |
| `copyHelper` | CopyHelper | コピー機能 |
| `markdownRenderer` | MarkdownRenderer | Markdown変換（省略時は `null`、Markdownレンダリング無効） |
| `win` | Window | `beforeunload` 登録先（省略時は `window`） |

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `init()` | `Promise<void>` | データ読み込み・コールバック設定・ホーム画面表示 |

### フロー制御ロジック

- **ホーム→設定**: `HomeView.onExamSelect` → `DataLoader.loadExamData` → `SetupView.render` → 画面遷移
- **設定→クイズ**: `SetupView.onStart` → `QuizEngine.init` → 最初の問題表示 → 画面遷移
- **一問一答モード回答後**: 正誤表示 → 解説表示（インデックスは進めない。次ボタンで移動）
- **全問回答モード回答後**: 回答を記録するだけ（自動遷移なし。次ボタンで移動）
- **前ボタン（最初の問題）**: 確認ダイアログ → OK でホーム画面へ
- **次ボタン（最後の問題）**: 確認ダイアログ → OK で結果画面へ
- **前後ボタン（途中の問題）**: `QuizEngine.prevQuestion/nextQuestion` → 現在の問題を表示（回答済み状態を復元）
- **結果→ホーム**: `ResultView.onBackToHome` → `DataLoader.loadIndex` → ホーム画面再表示

### beforeunload 制御

クイズ画面（`quiz`）表示中のみ `beforeunload` リスナを登録し、他の画面では解除する。

---

## ScreenManager

**ファイル**: `js/screen-manager.js`
**責務**: `<section class="screen">` 要素の表示/非表示を制御する。

### コンストラクタ

```js
new ScreenManager(document)
```

| 引数 | 説明 |
|---|---|
| `document` | DOMの `document` オブジェクト（省略時は `document`） |

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `showScreen(screenId)` | `void` | 指定IDの画面を表示し他を非表示にする |
| `getCurrentScreen()` | `string \| null` | 現在表示中の画面ID |
| `onScreenChange(callback)` | `void` | 画面変更時コールバックを登録（複数可） |

### CSS制御

- `.screen` → `display: none`
- `.screen.active` → `display: flex; flex-direction: column; min-height: calc(100vh - 32px)`（flexboxでスティッキーフッターを実現）

---

## DataLoader

**ファイル**: `js/data-loader.js`
**責務**: `data/index.json` と各試験JSONを `fetch()` で読み込む。

### コンストラクタ

```js
new DataLoader(fetchFn?)
```

`fetchFn` を省略すると `globalThis.fetch` を使用（テスト時にモック差し替え可能）。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `loadIndex()` | `Promise<ExamIndex>` | `data/index.json` を読み込み内部キャッシュに保存 |
| `getAvailableExams()` | `ExamEntry[]` | キャッシュ済みインデックスから試験一覧を返す |
| `loadExamData(file)` | `Promise<QuizData>` | 指定ファイル名のJSONを読み込む |
| `loadMarkdownFile(filePath)` | `Promise<string>` | `data/${filePath}` のMarkdownファイルをテキストとして取得する |

### エラー処理

- HTTPステータスが `ok` でない場合は `Error` をスロー
- `loadIndex()` 未実行で `loadExamData()` を呼ぶとエラー
- `loadMarkdownFile()` でファイルが存在しない場合は `Error` をスロー（QuizView で捕捉しエラーメッセージを表示）

---

## QuizEngine

**ファイル**: `js/quiz-engine.js`
**責務**: 出題順制御・回答判定・状態管理のコアロジック。UIに依存しない。

### コンストラクタ

```js
new QuizEngine()
```

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `init(data, settings)` | `void` | クイズを初期化。設定に応じてシャッフルを適用 |
| `getCurrentQuestion()` | `Question` | 現在の問題を返す |
| `getQuestionNumber()` | `QuestionNumber` | 現在の問題番号と総数 |
| `submitAnswer(index)` | `AnswerResult` | 回答を記録し正誤判定結果を返す |
| `nextQuestion()` | `boolean` | 次の問題に進む。次がある場合 `true`、完了なら `false` |
| `prevQuestion()` | `boolean` | 前の問題に戻る。前がある場合 `true`、先頭なら `false` |
| `getAnswerAt(index)` | `AnswerResult \| null` | 指定インデックスの回答結果を返す（未回答なら `null`） |
| `getCurrentAnswer()` | `AnswerResult \| null` | 現在の問題の回答結果を返す（未回答なら `null`） |
| `isComplete()` | `boolean` | 全問回答済みなら `true` |
| `getResults()` | `QuizResult` | 全回答の集計結果を返す |

### シャッフルロジック

1. `shuffleChoices: true` の場合、各問題の選択肢をFisher-Yatesでシャッフルし `correctIndex` を更新
2. `shuffleQuestions: true` の場合、問題配列全体をシャッフル
3. シャッフルは元データを破壊しないようディープコピー上で実行

---

## HomeView

**ファイル**: `js/home-view.js`
**責務**: ホーム画面のレンダリングと試験選択イベントの管理。

### コンストラクタ

```js
new HomeView(section)
```

`section`: `<section id="home">` 要素。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `render(exams)` | `void` | 試験一覧を表示（タイトル・概要・注意書き含む） |
| `onExamSelect(callback)` | `void` | 試験選択時コールバック登録。引数: `ExamEntry` |

### 表示要素

- サイトタイトル: 「電気通信主任技術者 過去問クイズ」
- 概要説明テキスト
- リロード注意書き（`.notice` クラス）
- 試験一覧（`.exam-list` > `.exam-item`）

---

## SetupView

**ファイル**: `js/setup-view.js`
**責務**: クイズ設定画面のレンダリングと設定値の管理。

### コンストラクタ

```js
new SetupView(section)
```

`section`: `<section id="setup">` 要素。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `render(examLabel)` | `void` | 設定画面を表示。デフォルト: 一問一答モード・ランダム化オフ |
| `getSettings()` | `QuizSettings` | 現在の設定値を返す |
| `onStart(callback)` | `void` | 開始ボタン押下時コールバック登録。引数: `QuizSettings` |

### デフォルト設定

```js
{ mode: 'one-by-one', shuffleQuestions: false, shuffleChoices: false }
```

---

## QuizView

**ファイル**: `js/quiz-view.js`
**責務**: クイズ画面のレンダリングと操作イベントの管理。

### コンストラクタ

```js
new QuizView(section)
```

`section`: `<section id="quiz">` 要素。コンストラクタ内でイベント委譲を設定する。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `renderQuestion(question, number, answerState, mode)` | `Promise<void>` | 問題文・選択肢・進捗を表示。Markdownエリアの非同期レンダリングを含む |
| `showResult(result)` | `void` | 正誤ラベルを表示（一問一答モード用） |
| `showExplanation(explanation)` | `void` | 解説とAI誘導テキスト・コピーボタンを表示 |
| `showNextButton(isLast)` | `void` | 次ボタンを表示。`isLast=true` で「結果を見る」 |
| `setMarkdownRenderer(renderer)` | `void` | MarkdownRenderer を注入する |
| `setDataLoader(dataLoader)` | `void` | DataLoader を注入する（markdown_file 取得用） |
| `onAnswer(callback)` | `void` | 選択肢クリック時コールバック登録。引数: 選択インデックス |
| `onNext(callback)` | `void` | 次ボタン押下時コールバック登録 |
| `onPrev(callback)` | `void` | 前ボタン押下時コールバック登録 |

### 選択肢レイアウト

選択肢の個数に応じてレイアウトを自動調整する:

| 選択肢数 | レイアウト |
|---|---|
| 1〜5個 | 1列表示（デフォルト） |
| 6〜7個 | 2列グリッド表示（`choice-list--two-col`） |
| 8個以上 | 2列グリッド表示 + コンパクトフォント（`choice-list--two-col choice-list--compact`） |

### キーボードショートカット

クイズ画面がアクティブな場合に以下のキーボード操作が有効になる:

| キー | 動作 |
|---|---|
| `↑` | 選択肢フォーカスを1つ上に移動（先頭でラップ） |
| `↓` | 選択肢フォーカスを1つ下に移動（末尾でラップ） |
| `Space` | フォーカス中の選択肢を回答として確定 |
| `←` | 前の問題へ移動 |
| `→` | 次の問題へ移動 |

フォーカス状態は `_focusedIndex` 内部プロパティで管理し、`choice-item--focused` CSSクラスで視覚的にハイライトする。問題の切り替え時にフォーカスはリセットされる。

### 回答状態の復元

`renderQuestion` に `answerState`（`AnswerResult | null`）と `mode` を渡すことで、前後移動時の選択済み状態を復元する。

- `answerState` が `null` の場合: 未回答状態で表示
- `mode === 'one-by-one'` かつ `answerState` あり: 選択肢をハイライトし正誤・解説を表示、選択をロック（`_answered = true`）
- `mode === 'all-at-once'` かつ `answerState` あり: 選択肢をハイライトのみ（再選択可）

### 二重回答防止

`_answered` フラグにより、同一問題に対して2回以上のコールバック発火を防止する。一問一答モードで回答済み問題に戻った場合もフラグが設定され選択不可となる。

### イベント委譲

`section` 要素全体に1つの `click` リスナを登録し、`.choice-item`・`#next-btn`・`#prev-btn` を `closest()` で識別する。innerHTML置換後もリスナは有効。

---

## ResultView

**ファイル**: `js/result-view.js`
**責務**: 結果サマリー画面のレンダリング。

### コンストラクタ

```js
new ResultView(section)
```

`section`: `<section id="result">` 要素。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `render(result)` | `void` | 正答数・正答率・各問題の解説一覧を表示 |
| `onBackToHome(callback)` | `void` | トップに戻るボタン押下時コールバック登録 |

### 表示要素

- 試験ラベル・正答数/総問題数・正答率（%）
- 各問題ごと: 正誤・正解の選択肢テキスト・解説・AI誘導テキスト・コピーボタン

---

## MarkdownRenderer

**ファイル**: `js/markdown-renderer.js`
**責務**: GFMテキストをサニタイズ済みHTMLに変換する。KaTeX数式統合・Mermaid後処理を提供する。

### コンストラクタ

```js
new MarkdownRenderer(deps?)
```

| フィールド | 型 | 説明 |
|---|---|---|
| `deps.markedLib` | object | markedライブラリオブジェクト（named export `{ marked }`） |
| `deps.markedKatexLib` | Function | marked-katex-extensionファクトリ関数（default export） |

`deps` を省略またはライブラリが渡されない場合、`render()` は入力テキストをそのまま返す（フォールバック）。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `render(markdownText)` | `string` | GFM文字列をHTMLに変換。`<script>` タグを除去してXSS対策済み |
| `renderMermaidIn(container)` | `Promise<void>` | DOM要素内の ` ```mermaid ``` ` ブロックをMermaid図に変換する |

### レンダリング仕様

- **GFM**: marked v17 で処理（テーブル・コードブロック・強調 等）
- **KaTeX**: `$...$`（インライン）と `$$...$$`（ブロック）を変換。`throwOnError: false` でエラー時はソーステキストを表示
- **Mermaid**: `renderMermaidIn()` でグローバルの `mermaid` オブジェクトを使用。未読み込み・エラー時は何もしない
- **XSS対策**: `<script>` タグを正規表現で除去

### CDN読み込みの注意

importmap でのライブラリ解決が必要:

```html
<script type="importmap">
{
  "imports": {
    "marked": "https://cdn.jsdelivr.net/npm/marked@17/lib/marked.esm.js",
    "marked-katex-extension": "https://cdn.jsdelivr.net/npm/marked-katex-extension/+esm"
  }
}
</script>
```

`marked` は **named export** なので `import { marked } from 'marked'`、`marked-katex-extension` は **default export** なので `import markedKatex from 'marked-katex-extension'` で取得する。

---

## CopyHelper

**ファイル**: `js/copy-helper.js`
**責務**: AI向けプロンプトテキストの生成とクリップボードへのコピー。

### コンストラクタ

```js
new CopyHelper(env?)
```

`env` にてブラウザAPI（`clipboard`、`execCommand` 等）をDI。省略時はブラウザネイティブAPIを使用。

### メソッド

| メソッド | 戻り値 | 説明 |
|---|---|---|
| `generatePrompt(question, explanation)` | `string` | `question.aiPromptTemplate` をそのまま返す |
| `copyToClipboard(text)` | `Promise<boolean>` | Clipboard API → `execCommand` フォールバックでコピー |

### コピー戦略

1. `navigator.clipboard.writeText(text)` を試みる
2. 失敗（例外 or 非対応）の場合、`<textarea>` を一時生成して `document.execCommand('copy')` を実行
3. どちらも失敗した場合 `false` を返す
