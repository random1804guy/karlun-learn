export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(date));
}

export function getMeaningCount(course) {
  return course.words.reduce((total, word) => total + word.meanings.length, 0);
}

export function findWord(course, wordId) {
  return course.words.find((word) => word.id === wordId) ?? course.archivedWords?.find((word) => word.id === wordId) ?? null;
}

export function cssText(value) {
  return escapeHtml(String(value).replace(/[;{}]/g, ""));
}


// Answers use only the approved spelling and explicitly listed aliases.
export function getAcceptedSpellings(word) {
  const values = [word?.term, ...(word?.aliases ?? [])]
    .filter(Boolean)
    .map((value) => String(value).trim());
  return [...new Set(values)];
}
