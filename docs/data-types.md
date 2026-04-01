# データ型定義

アプリケーション全体で使用するデータ型の定義。

---

## ExamIndex

`data/index.json` のルート型。

```js
{
  exams: ExamEntry[]
}
```

---

## ExamEntry

試験一覧の各エントリ。

```js
{
  year: number,    // 年度（例: 2025）
  round: number,   // 回次（例: 1）
  kind: string,    // 試験種別（例: "電気通信主任技術者.法規"）
  label: string,   // 表示名（例: "2025年度第1回 電気通信主任技術者法規"）
  file: string     // データファイル名（例: "2025-1.json"）
}
```

---

## QuizData

`data/YYYY-N.json` のルート型。

```js
{
  year: number,
  round: number,
  kind: string,       // 試験種別（例: "電気通信主任技術者.法規"）
  label: string,
  questions: Question[]
}
```

---

## Question

個々の問題。

```js
{
  id: number,                // 問題ID（1始まりの連番を推奨）
  text: string,              // 問題文
  markdown_text?: string,    // 問題文の補足Markdown（インライン文字列、オプショナル）
  markdown_file?: string,    // 補足Markdownの外部ファイルパス（data/ からの相対パス、オプショナル）
  choices: string[],         // 選択肢（1〜16個）
  correctIndex: number,      // 正解の選択肢インデックス（0始まり）
  explanation: string,       // 解説テキスト
  aiPromptTemplate: string,  // AI向けプロンプトテキスト
  figure?: QuestionFigure    // 図表（オプショナル）
}
```

**`markdown_text` と `markdown_file` の優先順位**: 両方指定された場合は `markdown_file` が優先される。レンダリングは問題文（`text`）と選択肢（`choices`）の間に表示される。

---

## QuestionFigure

問題に添付する図表。`Question` の `figure` フィールドで使用する（オプショナル）。

```js
{
  type: "mermaid" | "svg" | "png",
  // type === "mermaid" の場合
  content?: string,   // Mermaid記法テキスト
  // type === "svg" | "png" の場合
  src?: string,        // 画像パス（data/images/ 配下のファイル名）
  alt?: string         // アクセシビリティ用代替テキスト
}
```

---

## QuizSettings

SetupView から QuizEngine に渡す設定。

```js
{
  mode: "one-by-one" | "all-at-once",
  shuffleQuestions: boolean,
  shuffleChoices: boolean
}
```

---

## AnswerResult

`QuizEngine.submitAnswer()` の戻り値。

```js
{
  questionId: number,    // 問題ID
  selectedIndex: number, // ユーザーが選んだ選択肢のインデックス
  correctIndex: number,  // 正解の選択肢のインデックス
  isCorrect: boolean     // 正誤
}
```

---

## QuizResult

`QuizEngine.getResults()` の戻り値。ResultView に渡す。

```js
{
  examLabel: string,        // 試験ラベル
  totalQuestions: number,   // 総問題数
  correctCount: number,     // 正答数
  percentage: number,       // 正答率（0〜100の整数）
  details: AnswerResult[],  // 各問題の回答詳細（問題順）
  questions: Question[]     // 問題データ（details と同じ順序）
}
```

---

## QuestionNumber

`QuizEngine.getQuestionNumber()` の戻り値。QuizView に渡す。

```js
{
  current: number, // 現在の問題番号（1始まり）
  total: number    // 総問題数
}
```
