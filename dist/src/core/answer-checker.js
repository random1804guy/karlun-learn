export function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-GB")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

export function checkAnswer(rawAnswer, acceptedAnswers = []) {
  const answer = normalizeAnswer(rawAnswer);
  if (!answer) return { correct: false, empty: true };
  const accepted = acceptedAnswers.map(normalizeAnswer).filter(Boolean);
  return { correct: accepted.includes(answer), empty: false };
}

export function acceptedKarlunSpellings(word) {
  return [word.term, ...(word.aliases ?? [])].map(normalizeAnswer);
}
