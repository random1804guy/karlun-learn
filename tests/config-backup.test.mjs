import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, DEFAULT_CONFIG, validateSettings, validateConfig } from '../src/config/defaults.js';
import { createDefaultState } from '../src/storage/store.js';
import { createBackup, validateBackup } from '../src/backup/backup.js';

test('settings validation clamps unsafe or out-of-range customisations', () => {
  const settings = validateSettings({ accent: 'url(javascript:alert(1))', dailyGoal: 999, fontScale: 5, theme: 'neon' });
  assert.equal(settings.accent, DEFAULT_SETTINGS.accent);
  assert.equal(settings.dailyGoal, 120);
  assert.equal(settings.fontScale, 1.25);
  assert.equal(settings.theme, 'light');
});

test('lesson and progression configuration is bounded and has safe defaults', () => {
  const config = validateConfig({ lesson: { questionCount: 500, typedQuestionRatio: -2 }, progression: { xpPerCorrect: 15 } });
  assert.equal(config.lesson.questionCount, 20);
  assert.equal(config.lesson.typedQuestionRatio, 0);
  assert.equal(config.progression.xpPerCorrect, 15);
  assert.equal(validateConfig().lesson.questionCount, DEFAULT_CONFIG.lesson.questionCount);
});

test('default app state contains independent course, learner, settings and config data', () => {
  const one = createDefaultState();
  const two = createDefaultState();
  one.course.words.pop();
  one.settings.accent = '#000000';
  assert.notEqual(one.course.words.length, two.course.words.length);
  assert.notEqual(one.settings.accent, two.settings.accent);
  assert.equal(two.course.words.some((word) => word.term === 'sopo'), true);
});

test('backup export round-trips and rejects malformed data', () => {
  const state = createDefaultState();
  const raw = createBackup(state, new Date('2026-11-05T12:00:00Z'));
  const result = validateBackup(raw);
  assert.equal(result.valid, true);
  assert.equal(result.state.course.words.length, state.course.words.length);
  assert.equal(validateBackup('{bad json').valid, false);
  assert.equal(validateBackup({ format: 'wrong', version: 1 }).valid, false);
});
