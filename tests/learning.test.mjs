import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_COURSE } from '../src/course/initial-course.js';
import { generateLesson, getEligibleMeaningTargets } from '../src/core/lesson-engine.js';
import { checkAnswer, normalizeAnswer } from '../src/core/answer-checker.js';
import { getAcceptedSpellings } from '../src/core/utils.js';
import { scheduleNextReview, isDue } from '../src/review/scheduler.js';
import { createLearner, recordAnswer, finishLesson, getLevelProgress } from '../src/progress/progression.js';

const fixedRandom = () => 0.17;

test('answer checking handles case and harmless outer punctuation', () => {
  assert.equal(checkAnswer('  HELLO! ', ['hello']).correct, true);
  assert.equal(checkAnswer('say   talk', ['say talk']).correct, true);
  assert.equal(checkAnswer('   ', ['hello']).empty, true);
  assert.equal(normalizeAnswer('SALO. '), 'salo');
});

test('lesson generator creates approved vocabulary questions only', () => {
  const lesson = generateLesson(INITIAL_COURSE, createLearner(), { questionCount: 8, random: fixedRandom, now: new Date('2026-11-05T12:00:00Z') });
  assert.equal(lesson.questions.length, 8);
  for (const question of lesson.questions) {
    assert.ok(INITIAL_COURSE.words.some((word) => word.id === question.wordId && word.meanings.some((meaning) => meaning.id === question.meaningId)));
    assert.ok(['choice', 'typed'].includes(question.type));
    assert.ok(Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0);
  }
});

test('unit lessons never pull vocabulary from another unit', () => {
  const lesson = generateLesson(INITIAL_COURSE, createLearner(), { unitId: 'social', questionCount: 12, random: fixedRandom });
  const socialIds = new Set(INITIAL_COURSE.words.filter((word) => word.unitId === 'social').map((word) => word.id));
  assert.ok(lesson.questions.length > 0);
  assert.ok(lesson.questions.every((question) => socialIds.has(question.wordId)));
});

test('the course contains only the seven approved grammar rules', () => {
  assert.deepEqual(INITIAL_COURSE.grammar.map((rule) => rule.title), [
    'Sentence Structure',
    'Meaning Modifiers',
    'Plurals',
    'Possession',
    'English Fallback',
    'Capitalisation',
    'Pronunciation'
  ]);
  assert.ok(INITIAL_COURSE.grammar.every((rule) => rule.approved === true));
});

test('review scheduling advances on success and resets after a miss', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const first = scheduleNextReview({ intervalIndex: -1 }, true, now);
  assert.equal(first.intervalDays, 1);
  const second = scheduleNextReview({ intervalIndex: 1 }, true, now);
  assert.equal(second.intervalDays, 4);
  const missed = scheduleNextReview({ intervalIndex: 5 }, false, now);
  assert.equal(missed.intervalIndex, 0);
  assert.equal(missed.intervalDays, 1);
  assert.equal(isDue({ dueAt: '2026-11-04T12:00:00Z' }, now), true);
});

test('answer recording updates mastery, mistakes and cosmetic hearts without gating practice', () => {
  const learner = createLearner();
  const exercise = { wordId: 'w-sa', meaningId: 'w-sa-m1', prompt: 'Say yes', acceptedAnswers: ['sa'] };
  const missed = recordAnswer(learner, exercise, 'nope', false, new Date('2026-11-05T12:00:00Z'));
  assert.equal(missed.hearts, 4);
  assert.equal(missed.mistakes.length, 1);
  const corrected = recordAnswer(missed, exercise, 'sa', true, new Date('2026-11-05T12:01:00Z'));
  assert.equal(corrected.hearts, 5);
  const capped = recordAnswer({ ...corrected, hearts: 1 }, exercise, 'sa', true, new Date('2026-11-05T12:02:00Z'), undefined, 2);
  assert.equal(capped.hearts, 2);
  assert.equal(corrected.mistakes[0].resolved, true);
  assert.ok(corrected.wordProgress['w-sa:w-sa-m1'].mastery > 0);
});

test('lesson completion applies configurable XP and levels', () => {
  const completed = finishLesson(createLearner(), {
    correctCount: 4,
    answeredCount: 4,
    now: new Date('2026-11-05T12:00:00Z'),
    xpPerCorrect: 7,
    xpBonus: 12,
    xpPerLevel: 50
  });
  assert.equal(completed.earned, 40);
  assert.equal(completed.learner.xp, 40);
  assert.equal(getLevelProgress(75, 50).level, 2);
});


test('secondary meanings unlock gradually after the first meaning is mastered', () => {
  const learner = createLearner();
  const word = INITIAL_COURSE.words.find((item) => item.term === 'sopa');
  let eligible = getEligibleMeaningTargets(INITIAL_COURSE, learner);
  assert.equal(eligible.some((entry) => entry.word.id === word.id && entry.meaning.order === 2), false);
  learner.wordProgress[`${word.id}:${word.meanings[0].id}`] = { mastery: 60 };
  eligible = getEligibleMeaningTargets(INITIAL_COURSE, learner);
  assert.equal(eligible.some((entry) => entry.word.id === word.id && entry.meaning.order === 2), true);
  assert.equal(eligible.some((entry) => entry.word.id === word.id && entry.meaning.order === 3), false);
});


test('starter vocabulary accepts only its approved spelling', () => {
  const word = INITIAL_COURSE.words.find((item) => item.term === 'tora');
  assert.deepEqual(getAcceptedSpellings(word), ['tora']);
});
