import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_COURSE } from '../src/course/initial-course.js';
import { parseMasterPlan, compareMasterPlan, applyMasterPlan } from '../src/importer/master-plan.js';

test('master-plan parser reads ordinary Markdown vocabulary entries and spelling variants', () => {
  const parsed = parseMasterPlan(`## Connectors\n- \`bera / bura\` = because\n- **sopo** = say / talk / ask\nThis is an explanatory paragraph.`);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.entries.length, 2);
  assert.deepEqual(parsed.entries[0], { term: 'bera', aliases: ['bura'], glosses: ['because'], line: 2 });
  assert.deepEqual(parsed.entries[1].glosses, ['say', 'talk', 'ask']);
});

test('unknown lines are reported rather than silently converted into vocabulary', () => {
  const parsed = parseMasterPlan('A sentence with = but no valid term');
  assert.equal(parsed.valid, false);
  assert.equal(parsed.unparsed.length, 1);
});

test('identical imports are idempotent and keep stable word and meaning IDs', () => {
  const source = '- `sopo` = say / talk / ask';
  const first = parseMasterPlan(source);
  const firstDiff = compareMasterPlan(INITIAL_COURSE, first);
  assert.equal(firstDiff.additions.length, 0);
  assert.equal(firstDiff.modified.length, 0);
  assert.equal(firstDiff.unchanged.length, 1);
  const next = applyMasterPlan(INITIAL_COURSE, firstDiff, { sourceText: source, version: 'test-v1' });
  const secondDiff = compareMasterPlan(next, parseMasterPlan(source));
  assert.equal(secondDiff.additions.length, 0);
  assert.equal(secondDiff.modified.length, 0);
  assert.equal(secondDiff.unchanged.length, 1);
  assert.equal(next.words.find((word) => word.term === 'sopo').id, 'w-sopo');
});

test('new words are added and missing words are archived only when requested', () => {
  const course = { ...INITIAL_COURSE, words: INITIAL_COURSE.words.slice(0, 1) };
  const parsed = parseMasterPlan('sopo = say / talk / ask');
  const diff = compareMasterPlan(course, parsed, { archiveMissing: true });
  assert.equal(diff.additions.length, 1);
  assert.equal(diff.removed.length, 1);
  const next = applyMasterPlan(course, diff, { sourceText: 'sopo = say / talk / ask' });
  assert.equal(next.words.some((word) => word.term === 'sopo'), true);
  assert.equal(next.words.some((word) => word.term === 'sa'), false);
  assert.equal(next.archivedWords.some((word) => word.term === 'sa'), true);
});


test('import removes aliases no longer present in the authoritative master plan', () => {
  const course = { words: [{ id: 'w-hello', term: 'hello', aliases: ['hullo'], meanings: [{ id: 'm1', text: 'greeting', order: 1 }] }], archivedWords: [], importHistory: [] };
  const parsed = parseMasterPlan('hello = greeting');
  const diff = compareMasterPlan(course, parsed);
  assert.equal(diff.modified.length, 1);
  assert.deepEqual(diff.modified[0].after.aliases, []);
});

test('import blocks spelling collisions between words and aliases', () => {
  const parsed = parseMasterPlan('bera / bura = because\nbura = another word');
  assert.equal(parsed.valid, false);
  assert.ok(parsed.diagnostics.some((message) => message.includes('used by more than one word')));
});
