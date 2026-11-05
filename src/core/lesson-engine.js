import { isDue } from "../review/scheduler.js";
import { getAcceptedSpellings } from "./utils.js";

function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Introduce each word's first approved meaning before unlocking its later meanings.
// A later meaning unlocks after the previous one reaches the mastery threshold.
export function getEligibleMeaningTargets(course, learner, unitId = null, unlockAt = 60) {
  return (course.words ?? [])
    .filter((word) => word.status === "approved" && (!unitId || word.unitId === unitId))
    .flatMap((word) => {
      const meanings = [...(word.meanings ?? [])]
        .filter((meaning) => meaning.status === "approved")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const eligible = [];
      for (let index = 0; index < meanings.length; index += 1) {
        const meaning = meanings[index];
        if (index > 0) {
          const previous = meanings[index - 1];
          const previousProgress = learner.wordProgress?.[`${word.id}:${previous.id}`];
          if ((previousProgress?.mastery ?? 0) < unlockAt) break;
        }
        eligible.push({ word, meaning });
      }
      return eligible;
    });
}

function buildOptions(target, targets, random) {
  const distractors = [...new Set(targets
    .filter((entry) => entry.word.id !== target.word.id)
    .map((entry) => entry.word.term))]
    .filter((term) => term !== target.word.term);
  return shuffle([target.word.term, ...shuffle(distractors, random).slice(0, 3)], random);
}

function buildMeaningOptions(target, targets, random) {
  const distractors = [...new Set(targets
    .filter((entry) => entry.meaning.id !== target.meaning.id)
    .map((entry) => entry.meaning.text))]
    .filter((text) => text !== target.meaning.text);
  return shuffle([target.meaning.text, ...shuffle(distractors, random).slice(0, 3)], random);
}

function weightedSample(targets, learner, count, now, random) {
  const pool = targets.map((entry) => {
    const key = `${entry.word.id}:${entry.meaning.id}`;
    const progress = learner.wordProgress?.[key];
    const mistake = learner.mistakes?.some((item) => !item.resolved && item.wordId === entry.word.id && item.meaningId === entry.meaning.id);
    const due = Boolean(progress && isDue(progress, now));
    const weight = mistake ? 8 : due ? 6 : !progress ? 5 : 1;
    return { ...entry, weight };
  });
  const selected = [];
  while (pool.length && selected.length < count) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let pick = random() * total;
    let index = 0;
    for (; index < pool.length - 1; index += 1) {
      pick -= pool[index].weight;
      if (pick < 0) break;
    }
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

export function generateLesson(course, learner, options = {}) {
  const random = options.random ?? Math.random;
  const count = Math.max(1, Math.min(20, options.questionCount ?? 8));
  const reviewOnly = Boolean(options.reviewOnly);
  const unitId = options.unitId ?? null;
  const now = options.now ?? new Date();
  const targets = getEligibleMeaningTargets(course, learner, unitId, options.unlockAt ?? 60);
  if (!targets.length) return { id: `lesson-${Date.now()}`, questions: [], unavailableReason: "No approved vocabulary is available in this section yet." };

  let pool = targets;
  if (reviewOnly) {
    const dueOrMistakes = targets.filter(({ word, meaning }) => {
      const progress = learner.wordProgress?.[`${word.id}:${meaning.id}`];
      return (progress && isDue(progress, now)) || learner.mistakes?.some((item) => !item.resolved && item.wordId === word.id && item.meaningId === meaning.id);
    });
    if (dueOrMistakes.length) pool = dueOrMistakes;
  }
  const selected = weightedSample(pool, learner, Math.min(count, pool.length), now, random);
  const typedRatio = Math.max(0, Math.min(1, Number(options.typedQuestionRatio ?? 0.3)));
  const questions = selected.map((target, index) => {
    const typed = random() < typedRatio;
    const reverse = random() < 0.5;
    if (reverse) {
      return {
        id: `q-${index}-${target.word.id}-${target.meaning.id}`,
        type: typed ? "typed" : "choice",
        direction: "karlun-to-english",
        prompt: `What does “${target.word.term}” mean?`,
        expected: target.meaning.text,
        acceptedAnswers: [target.meaning.text],
        options: typed ? [] : buildMeaningOptions(target, targets, random),
        wordId: target.word.id,
        meaningId: target.meaning.id,
        displayTerm: target.word.term
      };
    }
    return {
      id: `q-${index}-${target.word.id}-${target.meaning.id}`,
      type: typed ? "typed" : "choice",
      direction: "english-to-karlun",
      prompt: `How do you say “${target.meaning.text}” in Karlun?`,
      expected: target.word.term,
      acceptedAnswers: getAcceptedSpellings(target.word),
      options: typed ? [] : buildOptions(target, targets, random),
      wordId: target.word.id,
      meaningId: target.meaning.id,
      displayTerm: target.word.term
    };
  });
  return { id: `lesson-${Date.now()}`, questions, reviewOnly, unitId, createdAt: now.toISOString() };
}
