import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, loadState, saveState, clearStateForTests } from '../src/storage/store.js';

function makeMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test('localStorage fallback persists learner progress when IndexedDB is unavailable', async () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = makeMemoryStorage();
  try {
    await clearStateForTests();
    const state = createDefaultState();
    state.learner.xp = 125;
    state.learner.wordProgress['w-sa:w-sa-m1'] = { mastery: 60, correct: 3 };
    await saveState(state);
    const loaded = await loadState();
    assert.equal(loaded.learner.xp, 125);
    assert.equal(loaded.learner.wordProgress['w-sa:w-sa-m1'].mastery, 60);
    await clearStateForTests();
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('in-memory fallback keeps the app usable when browser storage is denied', async () => {
  const previous = globalThis.localStorage;
  delete globalThis.localStorage;
  try {
    await clearStateForTests();
    const state = createDefaultState();
    state.learner.xp = 42;
    await saveState(state);
    const loaded = await loadState();
    assert.equal(loaded.learner.xp, 42);
  } finally {
    await clearStateForTests();
    if (previous !== undefined) globalThis.localStorage = previous;
  }
});


test('existing saved courses receive the current seven approved grammar rules', async () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = makeMemoryStorage();
  try {
    await clearStateForTests();
    const oldState = createDefaultState();
    oldState.course.grammar = [{ id: 'legacy-rule', title: 'Old rule', text: 'Outdated', status: 'tentative', approved: false }];
    oldState.learner.xp = 88;
    oldState.learner.wordProgress['w-sa:w-sa-m1'] = { mastery: 60, correct: 3 };
    globalThis.localStorage.setItem('karlun-learn-state', JSON.stringify(oldState));

    const loaded = await loadState();
    assert.equal(loaded.learner.xp, 88);
    assert.equal(loaded.learner.wordProgress['w-sa:w-sa-m1'].mastery, 60);
    assert.deepEqual(loaded.course.grammar.map((rule) => rule.title), [
      'Sentence Structure',
      'Meaning Modifiers',
      'Plurals',
      'Possession',
      'English Fallback',
      'Capitalisation',
      'Pronunciation'
    ]);
    assert.ok(loaded.course.grammar.every((rule) => rule.approved === true));

    await saveState(loaded);
    const savedAgain = await loadState();
    assert.equal(savedAgain.course.grammar.length, 7);
    assert.equal(savedAgain.learner.xp, 88);
  } finally {
    await clearStateForTests();
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
