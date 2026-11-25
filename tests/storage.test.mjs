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

test('old saved language is replaced by the Master Sheet while matching progress survives', async () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = makeMemoryStorage();
  try {
    await clearStateForTests();
    const oldState = createDefaultState();
    delete oldState.course.masterSheetVersion;
    oldState.course.words = [
      { id: 'old-sa', term: 'sa', meanings: [{ id: 'old-sa-m1', text: 'yes' }] },
      { id: 'old-sopo', term: 'sopo', meanings: [{ id: 'old-sopo-m1', text: 'say' }] }
    ];
    oldState.course.units = [{ id: 'legacy', title: 'Old unit' }];
    oldState.course.grammar = [{ id: 'legacy-rule', title: 'Old rule', text: 'Outdated', status: 'tentative', approved: false }];
    oldState.course.examples = [{ id: 'old-example', karlun: 'soma kesa', english: 'Who?' }];
    oldState.course.archivedWords = [{ id: 'archived-old', term: 'pira', meanings: [] }];
    oldState.learner.xp = 88;
    oldState.learner.wordProgress = {
      'old-sa:old-sa-m1': { mastery: 60, correct: 3 },
      'old-sopo:old-sopo-m1': { mastery: 80, correct: 4 }
    };
    oldState.learner.mistakes = [
      { id: 'mistake-sa', wordId: 'old-sa', meaningId: 'old-sa-m1', expected: 'yes', resolved: false },
      { id: 'mistake-sopo', wordId: 'old-sopo', meaningId: 'old-sopo-m1', expected: 'say', resolved: false }
    ];
    globalThis.localStorage.setItem('karlun-learn-state', JSON.stringify(oldState));

    const loaded = await loadState();
    const terms = loaded.course.words.map((word) => word.term);
    assert.equal(terms.length, 53);
    assert.ok(terms.includes('sopa'));
    assert.ok(!terms.includes('sopo'));
    assert.ok(terms.includes('tara'));
    assert.ok(!terms.includes('nara'));
    assert.ok(terms.includes('rira'));
    assert.ok(!terms.includes('pira'));
    assert.ok(!loaded.course.archivedWords.length);
    assert.equal(loaded.course.units.length, 14);
    assert.equal(loaded.course.grammar.length, 7);
    assert.equal(loaded.course.examples.some((example) => example.karlun === 'soma kesa'), false);
    assert.equal(loaded.learner.xp, 88);
    assert.equal(loaded.learner.wordProgress['w-sa:w-sa-m1'].mastery, 60);
    assert.equal(Object.keys(loaded.learner.wordProgress).length, 1);
    assert.equal(loaded.learner.mistakes.length, 1);
    assert.equal(loaded.learner.mistakes[0].wordId, 'w-sa');

    await saveState(loaded);
    const savedAgain = await loadState();
    assert.equal(savedAgain.course.masterSheetVersion, '2026-11-25');
    assert.equal(savedAgain.course.words.length, 53);
    assert.equal(savedAgain.learner.xp, 88);
  } finally {
    await clearStateForTests();
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
