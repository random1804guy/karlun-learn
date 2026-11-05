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
