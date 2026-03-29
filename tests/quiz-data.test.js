import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

describe('data/index.json', () => {
  let index;

  it('ファイルが存在し、正しいJSONとして読み込める', async () => {
    const raw = await readFile(join(dataDir, 'index.json'), 'utf-8');
    index = JSON.parse(raw);
    assert.ok(index);
  });

  it('exams 配列を持つ', async () => {
    const raw = await readFile(join(dataDir, 'index.json'), 'utf-8');
    index = JSON.parse(raw);
    assert.ok(Array.isArray(index.exams));
    assert.ok(index.exams.length > 0, '少なくとも1件の試験データが必要');
  });

  it('各エントリが year, round, label, file を持つ', async () => {
    const raw = await readFile(join(dataDir, 'index.json'), 'utf-8');
    index = JSON.parse(raw);
    for (const exam of index.exams) {
      assert.equal(typeof exam.year, 'number');
      assert.equal(typeof exam.round, 'number');
      assert.equal(typeof exam.label, 'string');
      assert.equal(typeof exam.file, 'string');
      assert.match(exam.file, /^\d{4}-\d\.json$/);
    }
  });
});

describe('data/2025-1.json', () => {
  let quizData;

  it('ファイルが存在し、正しいJSONとして読み込める', async () => {
    const raw = await readFile(join(dataDir, '2025-1.json'), 'utf-8');
    quizData = JSON.parse(raw);
    assert.ok(quizData);
  });

  it('year, round, label, questions を持つ', async () => {
    const raw = await readFile(join(dataDir, '2025-1.json'), 'utf-8');
    quizData = JSON.parse(raw);
    assert.equal(quizData.year, 2025);
    assert.equal(quizData.round, 1);
    assert.equal(typeof quizData.label, 'string');
    assert.ok(Array.isArray(quizData.questions));
    assert.ok(quizData.questions.length >= 5, '5問以上のサンプルデータが必要');
  });

  it('各問題が必須フィールドを持つ', async () => {
    const raw = await readFile(join(dataDir, '2025-1.json'), 'utf-8');
    quizData = JSON.parse(raw);
    for (const q of quizData.questions) {
      assert.equal(typeof q.id, 'number');
      assert.equal(typeof q.text, 'string');
      assert.ok(Array.isArray(q.choices));
      assert.ok(q.choices.length >= 4, '選択肢は4つ以上');
      assert.ok(q.choices.length <= 5, '選択肢は5つ以下');
      assert.equal(typeof q.correctIndex, 'number');
      assert.ok(q.correctIndex >= 0 && q.correctIndex < q.choices.length);
      assert.equal(typeof q.explanation, 'string');
      assert.equal(typeof q.aiPromptTemplate, 'string');
    }
  });

  it('問題IDが一意である', async () => {
    const raw = await readFile(join(dataDir, '2025-1.json'), 'utf-8');
    quizData = JSON.parse(raw);
    const ids = quizData.questions.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, '問題IDが重複しています');
  });

  it('index.json から参照されている', async () => {
    const indexRaw = await readFile(join(dataDir, 'index.json'), 'utf-8');
    const index = JSON.parse(indexRaw);
    const entry = index.exams.find((e) => e.year === 2025 && e.round === 1);
    assert.ok(entry, 'index.json に 2025年度第1回のエントリが必要');
    assert.equal(entry.file, '2025-1.json');
  });
});
