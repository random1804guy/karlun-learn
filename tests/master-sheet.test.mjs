import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_COURSE } from '../src/course/initial-course.js';

const expectedTerms = [
  'sa', 'sata', 'ta', 'neta', 'ne',
  'salo', 'nero', 'mara', 'lena', 'sima',
  'kema', 'loma', 'kesa',
  'sopa',
  'sato', 'nesato',
  'soma', 'sako', 'neko', 'ko',
  'dela', 'nedela',
  'tora', 'netora',
  'mi', 'mu', 'mo', 're', 'le', 'la',
  'kato',
  'bera', 'bur', 'en', 'ori',
  'tima', 'naro', 'lora', 'tara', 'mosa', 'mone',
  'sena', 'mena', 'hora', 'dana', 'mona', 'yara',
  'rira', 'balo', 'grogu', 'yopa', 'boka', 'wopa'
];

test('course vocabulary contains exactly the unique words in the current Master Sheet', () => {
  const actualTerms = INITIAL_COURSE.words.map((word) => word.term).sort();
  assert.equal(INITIAL_COURSE.words.length, 53);
  assert.deepEqual(actualTerms, [...expectedTerms].sort());
  assert.ok(INITIAL_COURSE.words.every((word) => word.status === 'approved'));
  assert.ok(INITIAL_COURSE.words.every((word) => (word.aliases ?? []).length === 0));
});

test('old or incorrect vocabulary is not present in the starter course', () => {
  const terms = new Set(INITIAL_COURSE.words.map((word) => word.term));
  for (const retired of ['sopo', 'pira', 'galo', 'fema', 'boda', 'doka', 'hopa', 'nara']) {
    assert.equal(terms.has(retired), false, retired + ' must not be in the current course');
  }
  assert.deepEqual(INITIAL_COURSE.words.find((word) => word.term === 'bera').aliases, []);
  assert.deepEqual(INITIAL_COURSE.words.find((word) => word.term === 'bur').aliases, []);
});

test('corrected meanings and section assignments match the Master Sheet', () => {
  const byTerm = new Map(INITIAL_COURSE.words.map((word) => [word.term, word]));
  assert.deepEqual(byTerm.get('kesa').meanings.map((item) => item.text), [
    'do', 'make', 'create', 'act', 'perform', 'work', 'carry out', 'cause', 'move'
  ]);
  assert.deepEqual(byTerm.get('kato').meanings.map((item) => item.text), ['confused', 'questioning', 'how']);
  assert.deepEqual(byTerm.get('sopa').meanings.map((item) => item.text), [
    'say', 'speak', 'talk', 'chat', 'ask', 'tell', 'communicate', 'converse', 'discuss'
  ]);
  assert.deepEqual(byTerm.get('tara').meanings.map((item) => item.text), ['today']);
  assert.deepEqual(byTerm.get('tima').meanings.map((item) => item.text), ['time']);
  assert.deepEqual(byTerm.get('lora').meanings.map((item) => item.text), ['location', 'place']);
  assert.equal(byTerm.get('ko').unitId, 'pronouns');
  assert.equal(INITIAL_COURSE.units.length, 14);
});

test('grammar, question system, examples and general principles are all supplied by the Master Sheet', () => {
  assert.deepEqual(INITIAL_COURSE.grammar.map((rule) => rule.title), [
    'Sentence Structure',
    'Meaning Modifiers',
    'Plurals',
    'Possession',
    'English Fallback',
    'Capitalisation',
    'Pronunciation'
  ]);
  assert.ok(INITIAL_COURSE.grammar.every((rule) => rule.status === 'approved' && rule.approved === true));
  assert.ok(INITIAL_COURSE.grammar.every((rule) => !rule.title.toLowerCase().includes('tentative')));
  const questionGuide = INITIAL_COURSE.languageNotes.find((note) => note.id === 'note-questions');
  for (const phrase of ['soma kato', 'ko kato', 'lora kato', 'tima kato', 'karlun kato']) {
    assert.ok(questionGuide.text.includes(phrase), phrase + ' question guidance is missing');
  }
  assert.equal(INITIAL_COURSE.languagePrinciples, undefined);
  assert.equal(INITIAL_COURSE.principles.length, 10);
  assert.ok(INITIAL_COURSE.examples.some((example) => example.karlun === 'mi kesa sa' && example.english === 'I jump.'));
  assert.ok(!INITIAL_COURSE.examples.some((example) => example.karlun === 'soma kesa'));
});
