import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function createSampleQuestion() {
  return {
    id: 1,
    text: 'テスト問題文',
    choices: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'テスト解説',
    aiPromptTemplate: '「{question}」について、{explanation}とありますが、詳しく解説してください',
  };
}

describe('CopyHelper', () => {
  let CopyHelper;

  beforeEach(async () => {
    const mod = await import('../js/copy-helper.js');
    CopyHelper = mod.CopyHelper;
  });

  describe('generatePrompt', () => {
    it('テンプレートがそのまま返される', () => {
      const helper = new CopyHelper();
      const q = createSampleQuestion();
      const result = helper.generatePrompt(q, q.explanation);
      assert.equal(result, q.aiPromptTemplate);
    });

    it('aiPromptTemplateが空の場合は空文字を返す', () => {
      const helper = new CopyHelper();
      const q = createSampleQuestion();
      q.aiPromptTemplate = '';
      const result = helper.generatePrompt(q, q.explanation);
      assert.equal(result, '');
    });
  });

  describe('copyToClipboard', () => {
    it('Clipboard APIが利用可能な場合、trueを返す', async () => {
      const helper = new CopyHelper({
        clipboard: { writeText: async () => {} },
      });
      const result = await helper.copyToClipboard('テスト');
      assert.equal(result, true);
    });

    it('Clipboard APIが失敗した場合、フォールバックを試行する', async () => {
      let fallbackCalled = false;
      const helper = new CopyHelper({
        clipboard: null,
        execCommand: (cmd) => {
          if (cmd === 'copy') {
            fallbackCalled = true;
            return true;
          }
          return false;
        },
        createElement: () => ({
          value: '',
          style: {},
          select() {},
          setSelectionRange() {},
        }),
        appendChild: () => {},
        removeChild: () => {},
      });
      const result = await helper.copyToClipboard('テスト');
      assert.equal(fallbackCalled, true);
      assert.equal(result, true);
    });

    it('Clipboard APIもフォールバックも失敗した場合、falseを返す', async () => {
      const helper = new CopyHelper({
        clipboard: null,
        execCommand: () => false,
        createElement: () => ({
          value: '',
          style: {},
          select() {},
          setSelectionRange() {},
        }),
        appendChild: () => {},
        removeChild: () => {},
      });
      const result = await helper.copyToClipboard('テスト');
      assert.equal(result, false);
    });

    it('Clipboard API writeTextが例外をスローした場合フォールバックを試行する', async () => {
      let fallbackCalled = false;
      const helper = new CopyHelper({
        clipboard: {
          writeText: async () => { throw new Error('not allowed'); },
        },
        execCommand: (cmd) => {
          if (cmd === 'copy') {
            fallbackCalled = true;
            return true;
          }
          return false;
        },
        createElement: () => ({
          value: '',
          style: {},
          select() {},
          setSelectionRange() {},
        }),
        appendChild: () => {},
        removeChild: () => {},
      });
      const result = await helper.copyToClipboard('テスト');
      assert.equal(fallbackCalled, true);
      assert.equal(result, true);
    });
  });
});
