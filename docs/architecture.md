# アーキテクチャ概要

## システム構成

本アプリは **サーバーレス静的Webアプリ** として設計されている。HTML / CSS / Vanilla JavaScript のみで動作し、外部ライブラリ・ビルドステップを一切持たない。

### パターン: セクション切り替え型SPA

`index.html` に全画面を `<section>` 要素として定義し、JavaScriptで表示/非表示を切り替える方式。URLルーティングなし。

```
index.html
  ├── <section id="home">   → ホーム画面
  ├── <section id="setup">  → クイズ設定画面
  ├── <section id="quiz">   → クイズ画面
  └── <section id="result"> → 結果サマリー画面
```

---

## 画面遷移フロー

```
[ホーム画面]
  試験選択
     ↓
[クイズ設定画面]
  モード・オプション選択 → クイズ開始
     ↓
[クイズ画面]
  回答繰り返し → 全問完了
     ↓
[結果サマリー画面]
  トップに戻る
     ↓
[ホーム画面] ← ループ
```

---

## コンポーネント依存関係

```
App (エントリーポイント・フロー制御)
  ├── ScreenManager   画面切り替え
  ├── DataLoader      JSONデータ読み込み
  ├── HomeView        ホーム画面UI
  ├── SetupView       設定画面UI
  ├── QuizEngine      クイズロジック（コア）
  ├── QuizView        クイズ画面UI
  ├── ResultView      結果画面UI
  └── CopyHelper      クリップボードコピー
```

`App` がすべてのコンポーネントを **依存性注入** で受け取るため、各コンポーネントは独立してテスト可能。

---

## ファイル構成

```
/
├── index.html              # 単一HTML（全画面セクション＋ES modules起動コード）
├── css/
│   └── style.css           # モバイルファーストCSS（375px〜）
├── js/
│   ├── app.js              # App（統合・フロー制御）
│   ├── screen-manager.js   # ScreenManager
│   ├── data-loader.js      # DataLoader
│   ├── quiz-engine.js      # QuizEngine
│   ├── home-view.js        # HomeView
│   ├── setup-view.js       # SetupView
│   ├── quiz-view.js        # QuizView
│   ├── result-view.js      # ResultView
│   └── copy-helper.js      # CopyHelper
├── data/
│   ├── index.json          # 試験一覧インデックス
│   └── 2025-1.json         # 試験ごとのクイズデータ
├── docs/                   # ドキュメント（このフォルダ）
└── tests/                  # Node.js テストファイル
```

---

## 技術方針

| 方針 | 内容 |
|---|---|
| ゼロ依存 | 外部ライブラリ・フレームワーク不使用 |
| ビルドレス | npm build 不要、ファイルをそのままデプロイ |
| モバイルファースト | スマホ（375px〜）を基準にUI設計 |
| 静的完結 | 全ロジックをクライアントサイドで完結 |
| データ分離 | クイズコンテンツはJSONファイルに外出し |

---

## モジュール読み込み

ブラウザでは ES Modules（`type="module"`）を使用。`index.html` のインラインスクリプトがすべてのクラスをインポートし `App` を初期化する。

```html
<script type="module">
  import { ScreenManager } from './js/screen-manager.js';
  // ... 他コンポーネントのインポート
  const app = new App({ screenManager, ... });
  app.init();
</script>
```

テスト環境では Node.js 22+ の `node:test` モジュールを使用し、`node --test tests/*.test.js` で実行する。
