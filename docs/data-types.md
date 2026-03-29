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
  label: string,   // 表示名（例: "2025年度第1回"）
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
  label: string,
  questions: Question[]
}
```

---

## Question

個々の問題。

```js
{
  id: number,              // 問題ID（1始まりの連番を推奨）
  text: string,            // 問題文
  choices: string[],       // 選択肢（4〜5個）
  correctIndex: number,    // 正解の選択肢インデックス（0始まり）
  explanation: string,     // 解説テキスト
  aiPromptTemplate: string // AI向けプロンプトテキスト
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
