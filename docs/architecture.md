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
  ← 前の問題ボタン（最初の問題では確認ダイアログ → TOPへ）
  → 次の問題ボタン（最後の問題では確認ダイアログ → 結果へ）
  回答・前後移動を繰り返す
     ↓（最後の問題 → 次へ → 確認OK）
[結果サマリー画面]
  トップに戻る
     ↓
[ホーム画面] ← ループ
```

---

## コンポーネント依存関係

```
App (エントリーポイント・フロー制御)
  ├── ScreenManager      画面切り替え
  ├── DataLoader         JSONデータ読み込み・Markdownファイル取得
  ├── HomeView           ホーム画面UI
  ├── SetupView          設定画面UI
  ├── QuizEngine         クイズロジック（コア）
  ├── QuizView           クイズ画面UI
  │     ├── MarkdownRenderer  Markdown→HTML変換・Mermaid後処理
  │     └── DataLoader        Markdownファイル取得（共有インスタンス）
  ├── ResultView         結果画面UI
  ├── CopyHelper         クリップボードコピー
  └── MarkdownRenderer   Markdown→HTML変換（CDN: marked + KaTeX）
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
│   ├── copy-helper.js      # CopyHelper
│   └── markdown-renderer.js # MarkdownRenderer（GFM/KaTeX/Mermaid）
├── data/
│   ├── index.json          # 試験一覧インデックス
│   ├── 2025-1.json         # 試験ごとのクイズデータ
│   ├── images/             # 問題の図表用画像ファイル
│   └── md/                 # 問題補足用Markdownファイル（markdown_file 参照先）
├── docs/                   # ドキュメント（このフォルダ）
└── tests/                  # Node.js テストファイル
```

---

## 技術方針

| 方針 | 内容 |
|---|---|
| CDN限定依存 | 追加ライブラリはCDN経由のみ（marked / KaTeX / Mermaid）。ビルドステップ不要 |
| ビルドレス | npm build 不要、ファイルをそのままデプロイ |
| モバイルファースト | スマホ（375px〜）を基準にUI設計 |
| 静的完結 | 全ロジックをクライアントサイドで完結 |
| データ分離 | クイズコンテンツはJSONファイルに外出し。補足コンテンツはMarkdownファイルに外出し |

---

## モジュール読み込み

ブラウザでは ES Modules（`type="module"`）を使用。`index.html` のインラインスクリプトがすべてのクラスをインポートし `App` を初期化する。

CDNライブラリ（marked・KaTeX・Mermaid）は `<script type="importmap">` でESMパスをマッピングし、動的 `import()` で読み込む。CDN読み込み失敗時もアプリは起動する（Markdownレンダリング機能のみ無効化）。

```html
<script type="importmap">
{
  "imports": {
    "marked": "https://cdn.jsdelivr.net/npm/marked@17/lib/marked.esm.js",
    "marked-katex-extension": "https://cdn.jsdelivr.net/npm/marked-katex-extension/+esm"
  }
}
</script>
<script type="module">
  import { MarkdownRenderer } from './js/markdown-renderer.js';
  // CDN読み込み失敗時でもアプリが起動するよう try/catch で動的import
  let markdownRenderer;
  try {
    const { marked } = await import('marked');
    const { default: markedKatex } = await import('marked-katex-extension');
    markdownRenderer = new MarkdownRenderer({ markedLib: marked, markedKatexLib: markedKatex });
  } catch (_e) {
    markdownRenderer = new MarkdownRenderer(); // Markdownなしでフォールバック
  }
  const app = new App({ ..., markdownRenderer });
  app.init();
</script>
```

テスト環境では Node.js 22+ の `node:test` モジュールを使用し、`node --test tests/*.test.js` で実行する。
