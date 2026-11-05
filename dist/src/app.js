import { loadState, saveState, getPersistenceMode } from "./storage/store.js";
import { DEFAULT_CONFIG, validateSettings, validateConfig } from "./config/defaults.js";
import { generateLesson } from "./core/lesson-engine.js";
import { checkAnswer } from "./core/answer-checker.js";
import { escapeHtml, formatDate, getMeaningCount } from "./core/utils.js";
import { recordAnswer, finishLesson, getLevelProgress, localDateKey } from "./progress/progression.js";
import { isDue } from "./review/scheduler.js";
import { parseMasterPlan, compareMasterPlan, applyMasterPlan } from "./importer/master-plan.js";
import { createBackup, validateBackup } from "./backup/backup.js";

const root = document.querySelector("#app");
let state;
let screen = "home";
let lesson = null;
let lessonIndex = 0;
let lessonCorrect = 0;
let feedback = null;
let importPreview = null;
let importRaw = "";
let importArchiveMissing = false;
let wordSearch = "";
let wordFilter = "all";
let wordTab = "words";
let toastTimer;

const safe = escapeHtml;
const progressFor = (word, meaning) => state.learner.wordProgress?.[`${word.id}:${meaning.id}`];
const dueCount = () => state.course.words.reduce((sum, word) => sum + word.meanings.filter((meaning) => { const progress = progressFor(word, meaning); return Boolean(progress && isDue(progress)); }).length, 0);
const masteredCount = () => state.course.words.reduce((sum, word) => sum + word.meanings.filter((meaning) => (progressFor(word, meaning)?.mastery ?? 0) >= 80).length, 0);
const totalMeaningCount = () => getMeaningCount(state.course);
const levelProgress = () => getLevelProgress(state.learner.xp, state.config?.progression?.xpPerLevel ?? 100);

async function persist() {
  state = await saveState(state);
  applySettings();
}

function applySettings() {
  state.settings = validateSettings(state.settings);
  const settings = state.settings;
  const dark = settings.theme === "dark" || (settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const colors = dark ? {
    background: "#151d17", card: "#1e2a21", text: "#e8f0e5", muted: "#a2b09f"
  } : {
    background: settings.background, card: settings.card, text: settings.text, muted: settings.muted
  };
  document.documentElement.style.setProperty("--accent", settings.accent);
  document.documentElement.style.setProperty("--accent-dark", settings.accentDark);
  document.documentElement.style.setProperty("--page-bg", colors.background);
  document.documentElement.style.setProperty("--card", colors.card);
  document.documentElement.style.setProperty("--text", colors.text);
  document.documentElement.style.setProperty("--muted", colors.muted);
  document.documentElement.style.setProperty("--font-scale", String(settings.fontScale));
  document.documentElement.classList.toggle("no-motion", !settings.animations);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.background);
  document.title = settings.appName || "Karlun Learn";
}

function showToast(message, type = "success") {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 3000);
}

function navIcon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 8 12 13l9.2-5L12 3Z"/><path d="M5 10v5c4 3 10 3 14 0v-5M21 8v7"/></svg>',
    words: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 2M4 15l2 2a7 7 0 0 0 12-2"/></svg>',
    stats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
  };
  return icons[name] ?? "";
}

function header() {
  return `
    <header class="topbar">
      <a class="brand" href="#home" data-nav="home" aria-label="Karlun Learn home"><span class="brand-mark">K</span><span>${safe(state.settings.appName)}</span></a>
      <div class="top-metrics">
        ${state.settings.showStreak ? `<span class="metric" title="Day streak"><span class="metric-emoji">🔥</span>${state.learner.streak}</span>` : ""}
        ${state.settings.showXp ? `<span class="metric" title="Experience points"><span class="metric-emoji">⚡</span>${state.learner.xp} XP</span>` : ""}
        ${state.settings.heartsEnabled ? `<span class="metric" title="Practice is always unlimited"><span class="metric-emoji">♥</span>${state.learner.hearts}/${state.config?.progression?.maxHearts ?? 5}</span>` : ""}
        <button class="icon-button" data-action="settings" aria-label="Open settings" title="Settings">⚙</button>
      </div>
    </header>`;
}

function bottomNav() {
  const items = [
    ["home", "Home"], ["learn", "Path"], ["words", "Words"], ["review", "Review"], ["stats", "Stats"]
  ];
  return `<nav class="bottom-nav" aria-label="Main navigation">${items.map(([id, label]) => `
    <button class="nav-item ${screen === id ? "active" : ""}" data-nav="${id}" aria-current="${screen === id ? "page" : "false"}">
      ${navIcon(id)}<span>${label}</span>${id === "review" && dueCount() ? `<i class="nav-dot">${Math.min(99, dueCount())}</i>` : ""}
    </button>`).join("")}</nav>`;
}

function shell(content) {
  root.innerHTML = `${header()}<main class="main-content">${content}</main>${screen !== "lesson" && screen !== "result" ? bottomNav() : ""}<div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  applySettings();
}

function renderHome() {
  const total = totalMeaningCount();
  const mastered = masteredCount();
  const percent = total ? Math.round(mastered / total * 100) : 0;
  const todayKey = localDateKey();
  const dailyXp = state.learner.lessonHistory.filter((item) => item.date && localDateKey(new Date(item.date)) === todayKey).reduce((sum, item) => sum + item.xpEarned, 0);
  shell(`
    <section class="welcome-row">
      <div><p class="eyebrow">YOUR KARLUN COURSE</p><h1>Ready to learn?</h1><p class="subheading">A little practice goes a long way.</p></div>
      <div class="welcome-orb" aria-hidden="true">✦</div>
    </section>
    <section class="hero-card">
      <div class="hero-copy"><span class="pill pill-light">${safe(state.course.name)} · Beginner path</span><h2>Your next step<br>starts here.</h2><p>Learn new words, keep your progress and build your Karlun skills.</p><button class="button button-white" data-action="start-lesson">Start learning <span>→</span></button></div>
      <div class="hero-art" aria-hidden="true"><div class="art-circle circle-one"></div><div class="art-circle circle-two"></div><div class="art-letter">K</div><span class="spark spark-one">✦</span><span class="spark spark-two">✧</span></div>
    </section>
    <section class="stat-grid">
      <article class="mini-stat"><span class="stat-icon lime">⚡</span><strong>${state.learner.xp}</strong><span>Total XP</span></article>
      <article class="mini-stat"><span class="stat-icon orange">🔥</span><strong>${state.learner.streak}</strong><span>Day streak</span></article>
      <article class="mini-stat"><span class="stat-icon aqua">🎯</span><strong>${mastered}/${total}</strong><span>Meanings mastered</span></article>
    </section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">YOUR PROGRESS</p><h2>Course overview</h2></div><button class="text-button" data-nav="learn">View path →</button></div>
      <div class="progress-card"><div class="progress-heading"><div><strong>${percent}% mastered</strong><p>${mastered} of ${total} meanings at strong mastery</p></div><span class="progress-badge">Level ${levelProgress().level}</span></div><div class="progress-track"><span style="width:${percent}%"></span></div><div class="progress-foot"><span>Daily goal: ${dailyXp}/${state.settings.dailyGoal} XP</span><span>${dueCount()} due for review</span></div></div>
    </section>
    <section class="section-block two-cards">
      <button class="action-card" data-nav="review"><span class="action-emoji">🧠</span><span><strong>Review words</strong><small>Keep older words fresh</small></span><b>→</b></button>
      <button class="action-card" data-nav="words"><span class="action-emoji">📚</span><span><strong>Word index</strong><small>Explore approved vocabulary</small></span><b>→</b></button>
    </section>
    <p class="quiet-note">No subscriptions. No locked lessons. Your course and progress stay on this device.</p>
  `);
}

function renderPath() {
  const units = [...state.course.units].sort((a, b) => a.order - b.order);
  const unitCards = units.map((unit, index) => {
    const words = state.course.words.filter((word) => word.unitId === unit.id);
    const learned = words.reduce((count, word) => count + word.meanings.filter((meaning) => progressFor(word, meaning)).length, 0);
    const total = words.reduce((count, word) => count + word.meanings.length, 0);
    const complete = total > 0 && learned === total;
    return `<article class="unit-card ${complete ? "unit-complete" : ""}">
      <div class="unit-number">${complete ? "✓" : String(index + 1).padStart(2, "0")}</div>
      <div class="unit-body"><div class="unit-title-row"><h3>${safe(unit.title)}</h3><span>${learned}/${total} studied</span></div><p>${safe(unit.description ?? "")}</p><div class="progress-track small"><span style="width:${total ? learned / total * 100 : 0}%"></span></div></div>
      <button class="unit-play" data-action="start-unit" data-unit="${safe(unit.id)}" aria-label="Start lesson for ${safe(unit.title)}">${complete ? "↻" : "▶"}</button>
    </article>`;
  }).join("");
  shell(`<section class="page-intro"><p class="eyebrow">LEARNING PATH</p><h1>Your Karlun journey</h1><p class="subheading">Work through the units at your own pace. You can always revisit earlier words.</p></section>
    <div class="path-top-card"><div><strong>${state.course.words.length} approved words</strong><span>${totalMeaningCount()} individual meanings to explore</span></div><button class="button button-primary" data-action="start-lesson">Continue <span>→</span></button></div>
    <div class="unit-list">${unitCards}<article class="unit-card imported-unit"><div class="unit-number">＋</div><div class="unit-body"><h3>New words</h3><p>Words added through your master plan imports.</p><span class="unit-count">${state.course.words.filter((word) => word.unitId === "imported").length} words</span></div><button class="unit-play" data-nav="import">＋</button></article></div>`);
}

function renderWords() {
  const words = [...state.course.words].sort((a, b) => a.term.localeCompare(b.term));
  const filtered = words.filter((word) => {
    const searchMatch = !wordSearch || `${word.term} ${(word.aliases ?? []).join(" ")} ${(word.meanings ?? []).map((m) => m.text).join(" ")}`.toLocaleLowerCase().includes(wordSearch.toLocaleLowerCase());
    const learned = word.meanings.some((meaning) => progressFor(word, meaning));
    return searchMatch && (wordFilter === "all" || (wordFilter === "learned" && learned) || (wordFilter === "new" && !learned));
  });
  const list = filtered.map((word) => {
    const learned = word.meanings.filter((meaning) => progressFor(word, meaning)).length;
    const aliases = (word.aliases ?? []).length ? `<small class="word-alias">Also: ${safe((word.aliases ?? []).join(", "))}</small>` : "";
    return `<article class="word-row"><div class="word-term">${safe(word.term)}</div><div class="word-meaning"><strong>${safe(word.meanings[0]?.text ?? "")}</strong><span>${word.meanings.slice(1, 4).map((m) => safe(m.text)).join(" · ")}</span>${aliases}</div><div class="word-mastery"><span>${learned}/${word.meanings.length}</span><i class="mastery-track"><b style="width:${word.meanings.length ? learned / word.meanings.length * 100 : 0}%"></b></i></div></article>`;
  }).join("");
  const grammar = state.course.grammar.map((rule) => `<article class="grammar-row"><div><strong>${safe(rule.title)}</strong><p>${safe(rule.text)}</p></div><span class="status-chip ${rule.approved ? "approved" : "tentative"}">${rule.approved ? "Approved" : "Tentative"}</span></article>`).join("");
  const examples = (state.course.examples ?? []).map((example) => `<article class="example-row"><div><strong>${safe(example.karlun)}</strong><span>${safe(example.english)}</span></div><small>${safe(example.note ?? "")}</small></article>`).join("");
  shell(`<section class="page-intro"><p class="eyebrow">COURSE LIBRARY</p><h1>Words & grammar</h1><p class="subheading">Only approved Karlun vocabulary is used for lessons.</p></section>
    <div class="tabs"><button class="tab ${wordTab === "words" ? "active" : ""}" data-word-tab="words">Vocabulary <span>${words.length}</span></button><button class="tab ${wordTab === "grammar" ? "active" : ""}" data-word-tab="grammar">Grammar <span>${state.course.grammar.length}</span></button></div>
    ${wordTab === "words" ? `<div class="search-box"><span>⌕</span><input id="word-search" placeholder="Search Karlun or English…" value="${safe(wordSearch)}" autocomplete="off"></div><div class="filter-row"><button class="filter-chip ${wordFilter === "all" ? "active" : ""}" data-word-filter="all">All words</button><button class="filter-chip ${wordFilter === "new" ? "active" : ""}" data-word-filter="new">Not studied</button><button class="filter-chip ${wordFilter === "learned" ? "active" : ""}" data-word-filter="learned">Studied</button></div><div class="word-list">${list || `<div class="empty-state">No words match that search.</div>`}</div>` : `<div class="grammar-list">${grammar}</div>${examples ? `<section class="section-block example-section"><div class="section-heading"><div><p class="eyebrow">APPROVED EXAMPLES</p><h2>Karlun in context</h2></div></div><div class="example-list">${examples}</div></section>` : ""}`}
    <div class="library-footer"><span>Master plan snapshot · ${safe(state.course.sourceVersion)}</span><button class="text-button" data-nav="import">Update course →</button></div>`);
  const search = document.querySelector("#word-search");
  if (search) {
    search.addEventListener("input", (event) => { wordSearch = event.target.value; const cursor = search.selectionStart; renderWords(); const next = document.querySelector("#word-search"); next?.focus(); next?.setSelectionRange(cursor, cursor); });
  }
}

function renderReview() {
  const due = dueCount();
  const unresolved = state.learner.mistakes.filter((mistake) => !mistake.resolved).length;
  shell(`<section class="page-intro"><p class="eyebrow">SMART REVISION</p><h1>Keep it fresh</h1><p class="subheading">Review brings older words back so they have a chance to stick.</p></section>
    <div class="review-hero"><div class="review-illustration">🧠</div><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>${due} meanings due</h2><p>${due ? "A short review session will help reinforce what you've learned." : "Nothing is due right now. You can still practise whenever you like."}</p><button class="button button-primary" data-action="start-review">${due ? "Start review" : "Practise anyway"} <span>→</span></button></div></div>
    <section class="section-block"><div class="section-heading"><div><p class="eyebrow">YOUR WEAK SPOTS</p><h2>Mistake notebook</h2></div><span class="count-pill">${unresolved} open</span></div>
      ${unresolved ? state.learner.mistakes.filter((m) => !m.resolved).slice(0, 8).map((mistake) => { const word = state.course.words.find((item) => item.id === mistake.wordId); return `<div class="mistake-row"><span class="mistake-mark">↺</span><div><strong>${safe(word?.term ?? "Archived word")}</strong><small>You answered “${safe(mistake.given)}” · expected “${safe(mistake.expected)}”</small></div></div>`; }).join("") : `<div class="empty-state compact">No mistakes saved yet. That's a good start.</div>`}
    </section>
    <div class="practice-note"><strong>Practice is always unlimited.</strong><p>Hearts are cosmetic motivation only. You can restart lessons and practise without waiting or paying.</p></div>`);
}

function renderStats() {
  const total = totalMeaningCount();
  const mastered = masteredCount();
  const accuracy = state.learner.totalAnswered ? Math.round(state.learner.totalCorrect / state.learner.totalAnswered * 100) : 0;
  const history = state.learner.lessonHistory.slice(0, 8).map((item) => `<div class="history-row"><span class="history-dot">✓</span><div><strong>Lesson completed</strong><small>${formatDate(item.date)} · ${item.correctCount}/${item.answeredCount} correct</small></div><b>+${item.xpEarned} XP</b></div>`).join("");
  shell(`<section class="page-intro"><p class="eyebrow">YOUR ACTIVITY</p><h1>Look at you go.</h1><p class="subheading">Your progress, without the pressure.</p></section>
    <div class="stats-feature"><div><span class="eyebrow">TOTAL EXPERIENCE</span><strong>${state.learner.xp} <small>XP</small></strong><p>Level ${levelProgress().level}</p></div><div class="level-ring"><span>${levelProgress().level}</span><small>LEVEL</small></div></div>
    <div class="stat-grid stats-grid-four"><article class="mini-stat"><span class="stat-icon lime">🎯</span><strong>${accuracy}%</strong><span>Accuracy</span></article><article class="mini-stat"><span class="stat-icon aqua">📖</span><strong>${mastered}</strong><span>Mastered</span></article><article class="mini-stat"><span class="stat-icon orange">🔥</span><strong>${state.learner.streak}</strong><span>Streak</span></article><article class="mini-stat"><span class="stat-icon purple">✓</span><strong>${state.learner.completedLessons}</strong><span>Lessons</span></article></div>
    <section class="section-block"><div class="section-heading"><div><p class="eyebrow">LEARNING HISTORY</p><h2>Recent lessons</h2></div></div>${history || `<div class="empty-state compact">Your completed lessons will show here.</div>`}</section>
    <div class="progress-card"><div class="progress-heading"><div><strong>${mastered} / ${total} meanings mastered</strong><p>Mastery is tracked per meaning, not just per word.</p></div><span class="progress-badge">${total ? Math.round(mastered / total * 100) : 0}%</span></div><div class="progress-track"><span style="width:${total ? mastered / total * 100 : 0}%"></span></div></div>`);
}

function renderSettings() {
  const s = state.settings;
  shell(`<section class="page-intro"><p class="eyebrow">MAKE IT YOURS</p><h1>Settings</h1><p class="subheading">Customise the experience. More theme and layout options can be added without changing the learning engine.</p></section>
    <section class="settings-section"><h2>Appearance</h2><label class="setting-row"><span><strong>Theme</strong><small>Choose light, dark or follow your device.</small></span><select id="setting-theme"><option value="light" ${s.theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${s.theme === "dark" ? "selected" : ""}>Dark</option><option value="system" ${s.theme === "system" ? "selected" : ""}>System</option></select></label>
      <label class="setting-row"><span><strong>Accent colour</strong><small>Your main action colour.</small></span><input id="setting-accent" type="color" value="${safe(s.accent)}"></label>
      <label class="setting-row"><span><strong>Background colour</strong><small>Page background.</small></span><input id="setting-background" type="color" value="${safe(s.background)}"></label>
      <label class="setting-row"><span><strong>Card colour</strong><small>Lesson and content surfaces.</small></span><input id="setting-card" type="color" value="${safe(s.card)}"></label>
      <label class="setting-row"><span><strong>Text colour</strong><small>Main text colour.</small></span><input id="setting-text" type="color" value="${safe(s.text)}"></label>
      <label class="setting-row"><span><strong>Muted text colour</strong><small>Secondary labels and helper text.</small></span><input id="setting-muted" type="color" value="${safe(s.muted)}"></label>
      <label class="setting-row"><span><strong>Dark accent colour</strong><small>Pressed and highlighted states.</small></span><input id="setting-accent-dark" type="color" value="${safe(s.accentDark)}"></label>
      <label class="setting-row"><span><strong>Text size</strong><small>Adjust overall text scale.</small></span><input id="setting-font" type="range" min="0.85" max="1.25" step="0.05" value="${s.fontScale}"></label>
      <label class="setting-row"><span><strong>Animations</strong><small>Reduce movement on the interface.</small></span><input id="setting-motion" type="checkbox" ${s.animations ? "checked" : ""}></label>
    </section>
    <section class="settings-section"><h2>Learning preferences</h2>
      <label class="setting-row"><span><strong>Daily XP goal</strong><small>Your personal target, not a limit.</small></span><select id="setting-goal">${[5,10,15,20,30,45,60,90,120].map((n) => `<option value="${n}" ${s.dailyGoal === n ? "selected" : ""}>${n} XP</option>`).join("")}</select></label>
      <label class="setting-row"><span><strong>Questions per lesson</strong><small>Choose a comfortable lesson length.</small></span><select id="setting-count">${[4,6,8,10,12,16,20].map((n) => `<option value="${n}" ${state.config.lesson.questionCount === n ? "selected" : ""}>${n} questions</option>`).join("")}</select></label>
      <label class="setting-row"><span><strong>Typed-answer frequency</strong><small>How often you type instead of choosing.</small></span><select id="setting-typed"><option value="0" ${state.config.lesson.typedQuestionRatio === 0 ? "selected" : ""}>Never</option><option value="0.3" ${state.config.lesson.typedQuestionRatio === 0.3 ? "selected" : ""}>Sometimes</option><option value="0.6" ${state.config.lesson.typedQuestionRatio === 0.6 ? "selected" : ""}>Often</option><option value="1" ${state.config.lesson.typedQuestionRatio === 1 ? "selected" : ""}>Always</option></select></label>
      <label class="setting-row"><span><strong>Show hearts</strong><small>Hearts never restrict practice.</small></span><input id="setting-hearts" type="checkbox" ${s.heartsEnabled ? "checked" : ""}></label>
      <label class="setting-row"><span><strong>Show XP</strong><small>Display XP in the top bar.</small></span><input id="setting-xp" type="checkbox" ${s.showXp ? "checked" : ""}></label>
      <label class="setting-row"><span><strong>Show streak</strong><small>Display your active streak.</small></span><input id="setting-streak" type="checkbox" ${s.showStreak ? "checked" : ""}></label>
      <label class="setting-row"><span><strong>App name</strong><small>Change the name shown in the header.</small></span><input id="setting-name" class="text-input small-input" maxlength="32" value="${safe(s.appName)}"></label>
      <button class="button button-primary full-width" data-action="save-settings">Save preferences</button><button class="text-button reset-link" data-action="reset-settings">Reset appearance and preferences</button>
    </section>
    <section class="settings-section"><h2>Course management</h2><button class="action-card full-width" data-nav="import"><span class="action-emoji">📥</span><span><strong>Import master plan</strong><small>Compare new vocabulary with your current course.</small></span><b>→</b></button><button class="action-card full-width" data-action="show-archive"><span class="action-emoji">🗃️</span><span><strong>Archived words</strong><small>${state.course.archivedWords.length} archived entries.</small></span><b>→</b></button>
    </section>
    <section class="settings-section"><h2>Backup & restore</h2><p class="section-hint">Your progress is stored on this device. Export a backup before switching phones or clearing browser data.</p><div class="backup-actions"><button class="button button-primary" data-action="export-backup">Export backup</button><label class="button button-secondary file-button">Restore backup<input id="backup-file" type="file" accept="application/json,.json" hidden></label></div><p class="tiny-note">Restoring replaces this device's current course, progress and settings after you confirm.</p></section>
    <p class="version-note">Karlun Learn · Version 0.2.0 · Local-first · No account required</p>`);
}

function renderImport() {
  const result = importPreview;
  const listDiff = (items, kind, label) => items.length ? `<div class="diff-group"><h4>${label} <span>${items.length}</span></h4>${items.slice(0, 20).map((item) => `<div class="diff-row"><strong>${safe(item.after?.term ?? item.before?.term)}</strong><small>${kind === "modified" ? `${safe(item.before.meanings.map((m) => m.text).join(", "))} → ${safe(item.after.meanings.map((m) => m.text).join(", "))}` : safe((item.after ?? item.before).meanings.map((m) => m.text).join(", "))}</small></div>`).join("")}${items.length > 20 ? `<p class="tiny-note">And ${items.length - 20} more…</p>` : ""}</div>` : "";
  shell(`<section class="page-intro"><p class="eyebrow">COURSE EDITOR</p><h1>Update Karlun</h1><p class="subheading">Paste your complete master plan. The importer compares vocabulary and shows changes before applying them.</p></section>
    <div class="import-warning"><strong>Your master plan stays in charge.</strong><p>Only words explicitly included in your plan can become approved course vocabulary. Unclear lines are never guessed into new words.</p></div>
    <section class="settings-section import-box"><label for="master-plan"><strong>Complete master plan</strong></label><textarea id="master-plan" class="master-textarea" placeholder="Paste your Karlun master plan here…">${safe(importRaw)}</textarea><label class="checkbox-line"><input id="archive-missing" type="checkbox" ${importArchiveMissing ? "checked" : ""}> This is the complete plan. Archive words missing from it.</label><p class="tiny-note">Archiving is optional. Leave this unchecked when testing a partial list. Archived words keep their learning history.</p><button class="button button-primary full-width" data-action="preview-import">Compare master plan</button></section>
    ${result ? `<section class="settings-section diff-preview"><div class="section-heading"><div><p class="eyebrow">IMPORT PREVIEW</p><h2>Review changes</h2></div><span class="status-chip ${result.diff.canApply ? "approved" : "tentative"}">${result.diff.canApply ? "Ready to apply" : "Cannot apply"}</span></div>
      <div class="diff-summary"><div><strong>${result.diff.additions.length}</strong><span>New</span></div><div><strong>${result.diff.unchanged.length}</strong><span>Unchanged</span></div><div><strong>${result.diff.modified.length}</strong><span>Changed</span></div><div><strong>${result.diff.removed.length}</strong><span>Archive</span></div></div>
      ${listDiff(result.diff.additions, "added", "New words")}${listDiff(result.diff.modified, "modified", "Modified words")}${listDiff(result.diff.removed, "removed", "Words to archive")}
      ${result.parsed.unparsed.length || result.parsed.diagnostics.length ? `<div class="parser-warnings"><strong>Needs a look</strong><p>${result.parsed.unparsed.length} unrecognised line(s), ${result.parsed.diagnostics.length} parser note(s). These have not been applied.</p>${result.parsed.unparsed.slice(0, 8).map((item) => `<small>Line ${item.line}: ${safe(item.text)}</small>`).join("")}${result.parsed.diagnostics.map((d) => `<small>${safe(d)}</small>`).join("")}</div>` : ""}
      <p class="tiny-note">Grammar is not automatically changed by this vocabulary importer yet. Your existing grammar rules will remain intact.</p>
      <div class="backup-actions"><button class="button button-primary" data-action="apply-import" ${result.diff.canApply ? "" : "disabled"}>Apply vocabulary changes</button><button class="button button-secondary" data-action="cancel-import">Cancel</button></div>
    </section>` : ""}
    <p class="quiet-note">Tip: entries such as <code>sopo = say / talk / ask</code> are recognised. Plain-text headings and explanatory notes can remain in your plan.</p>`);
  const textarea = document.querySelector("#master-plan");
  textarea?.addEventListener("input", () => { importRaw = textarea.value; importPreview = null; });
  document.querySelector("#archive-missing")?.addEventListener("change", (event) => { importArchiveMissing = event.target.checked; importPreview = null; });
}

function renderArchive() {
  const entries = state.course.archivedWords ?? [];
  shell(`<section class="page-intro"><p class="eyebrow">COURSE HISTORY</p><h1>Archived words</h1><p class="subheading">Archived entries are removed from new lessons but their learning history is retained.</p></section>
    ${entries.length ? entries.map((word) => `<article class="archive-row"><div><strong>${safe(word.term)}</strong><small>${safe(word.meanings.map((m) => m.text).join(" · "))}</small></div><button class="button button-small button-secondary" data-restore-word="${safe(word.id)}">Restore</button></article>`).join("") : `<div class="empty-state">No archived words.</div>`}
    <button class="text-button" data-action="settings">← Back to settings</button>`);
}

function renderLesson() {
  if (!lesson || !lesson.questions.length) { screen = "home"; renderHome(); return; }
  const q = lesson.questions[lessonIndex];
  const percent = Math.round((lessonIndex / lesson.questions.length) * 100);
  const choiceButtons = q.type === "choice" ? q.options.map((option) => `<button class="answer-option" data-answer="${safe(option)}" ${feedback ? "disabled" : ""}>${safe(option)}</button>`).join("") : "";
  shell(`<div class="lesson-top"><button class="icon-button close-lesson" data-action="exit-lesson" aria-label="Exit lesson">✕</button><div class="lesson-progress"><div class="progress-track"><span style="width:${percent}%"></span></div><span>${lessonIndex + 1}/${lesson.questions.length}</span></div><span class="lesson-heart">♥ ${state.settings.heartsEnabled ? `${state.learner.hearts}/${state.config?.progression?.maxHearts ?? 5}` : "∞"}</span></div>
    <section class="lesson-stage"><p class="eyebrow">${lesson.reviewOnly ? "REVIEW SESSION" : "QUICK PRACTICE"}</p><h1>${safe(q.prompt)}</h1><div class="question-hint">${q.direction === "english-to-karlun" ? "Choose or type the Karlun word." : "Choose or type the English meaning."}</div>
      ${q.type === "choice" ? `<div class="answer-options">${choiceButtons}</div>` : `<form id="answer-form" class="typed-answer-form"><input id="typed-answer" class="typed-answer" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Your answer…" ${feedback ? "disabled" : ""}><button class="button button-primary full-width" type="submit" ${feedback ? "disabled" : ""}>Check answer</button></form>`}
      ${feedback ? `<div class="answer-feedback ${feedback.correct ? "correct" : "incorrect"}"><div class="feedback-icon">${feedback.correct ? "✓" : "↻"}</div><div><strong>${feedback.correct ? "Lovely! That's right." : "Not quite — keep going."}</strong><p>${feedback.correct ? "Correct answer saved." : `Correct answer: ${safe(q.acceptedAnswers[0])}`}</p></div></div><button class="button ${feedback.correct ? "button-primary" : "button-dark"} full-width continue-button" data-action="next-question">${lessonIndex === lesson.questions.length - 1 ? "Finish lesson" : "Continue"} <span>→</span></button>` : ""}
    </section><p class="lesson-footer">Mistakes are part of learning. Practice is always unlimited.</p>`);
}

function renderResult() {
  const percent = lesson?.questions.length ? Math.round(lessonCorrect / lesson.questions.length * 100) : 0;
  shell(`<section class="result-screen"><div class="result-confetti">✦ ✧ ✦</div><div class="result-medal">🏅</div><p class="eyebrow">SESSION COMPLETE</p><h1>Nice work!</h1><p class="subheading">Every bit of practice counts.</p><div class="result-stats"><div><strong>+${state.lastEarnedXp ?? 0}</strong><span>XP earned</span></div><div><strong>${lessonCorrect}/${lesson?.questions.length ?? 0}</strong><span>Correct</span></div><div><strong>${percent}%</strong><span>Accuracy</span></div></div><div class="result-message">${percent >= 80 ? "You're building a solid foundation. Keep that momentum." : "Mistakes are useful data. Your review list will help you revisit them."}</div><button class="button button-primary full-width" data-action="start-lesson">Keep learning <span>→</span></button><button class="text-button" data-nav="home">Back to home</button></section>`);
}

function render() {
  if (!state) return;
  if (screen === "home") renderHome();
  else if (screen === "learn") renderPath();
  else if (screen === "words") renderWords();
  else if (screen === "review") renderReview();
  else if (screen === "stats") renderStats();
  else if (screen === "settings") renderSettings();
  else if (screen === "import") renderImport();
  else if (screen === "archive") renderArchive();
  else if (screen === "lesson") renderLesson();
  else if (screen === "result") renderResult();
  else { screen = "home"; renderHome(); }
}

function startLesson(reviewOnly = false, unitId = null) {
  lesson = generateLesson(state.course, state.learner, {
    questionCount: state.config?.lesson?.questionCount ?? DEFAULT_CONFIG.lesson.questionCount,
    typedQuestionRatio: state.config?.lesson?.typedQuestionRatio ?? DEFAULT_CONFIG.lesson.typedQuestionRatio,
    reviewOnly,
    unitId
  });
  if (!lesson.questions.length) { showToast(lesson.unavailableReason ?? "No exercises available yet.", "error"); return; }
  lessonIndex = 0;
  lessonCorrect = 0;
  feedback = null;
  screen = "lesson";
  render();
}

async function answerQuestion(rawAnswer) {
  if (feedback || !lesson) return;
  const question = lesson.questions[lessonIndex];
  const result = checkAnswer(rawAnswer, question.acceptedAnswers);
  if (result.empty) { showToast("Type an answer first.", "error"); return; }
  feedback = result;
  if (result.correct) lessonCorrect += 1;
  state.learner = recordAnswer(state.learner, question, rawAnswer, result.correct, new Date(), state.config?.review?.intervalsDays, state.config?.progression?.maxHearts ?? 5);
  await persist();
  renderLesson();
}

async function nextQuestion() {
  if (!feedback) return;
  if (lessonIndex < lesson.questions.length - 1) {
    lessonIndex += 1;
    feedback = null;
    renderLesson();
    return;
  }
  const progression = state.config?.progression ?? DEFAULT_CONFIG.progression;
  const finished = finishLesson(state.learner, {
    correctCount: lessonCorrect,
    answeredCount: lesson.questions.length,
    xpBonus: progression.xpLessonBonus,
    xpPerCorrect: progression.xpPerCorrect,
    xpPerLevel: progression.xpPerLevel,
    maxHearts: progression.maxHearts
  });
  state.learner = finished.learner;
  state.lastEarnedXp = finished.earned;
  await persist();
  screen = "result";
  render();
}

function previewImport() {
  const textarea = document.querySelector("#master-plan");
  const check = document.querySelector("#archive-missing");
  importRaw = textarea?.value ?? importRaw;
  importArchiveMissing = Boolean(check?.checked);
  const parsed = parseMasterPlan(importRaw);
  const diff = compareMasterPlan(state.course, parsed, { archiveMissing: importArchiveMissing });
  importPreview = { parsed, diff };
  renderImport();
  if (!parsed.valid) showToast("I couldn't find any vocabulary entries. Check the format.", "error");
}

async function applyImport() {
  if (!importPreview?.diff.canApply) return;
  if (importPreview.diff.removed.length && !confirm(`Archive ${importPreview.diff.removed.length} word(s) missing from this plan? Their learning history will be kept.`)) return;
  const nextCourse = applyMasterPlan(state.course, importPreview.diff, { sourceText: importRaw });
  state.course = nextCourse;
  await persist();
  importPreview = null;
  screen = "words";
  wordTab = "words";
  render();
  showToast(`Course updated: ${nextCourse.words.length} active words.`);
}

function savePreferences() {
  const get = (id) => document.querySelector(`#${id}`);
  state.settings = validateSettings({
    ...state.settings,
    theme: get("setting-theme")?.value,
    accent: get("setting-accent")?.value,
    background: get("setting-background")?.value,
    card: get("setting-card")?.value,
    text: get("setting-text")?.value,
    muted: get("setting-muted")?.value,
    accentDark: get("setting-accent-dark")?.value,
    fontScale: Number(get("setting-font")?.value ?? 1),
    animations: Boolean(get("setting-motion")?.checked),
    dailyGoal: Number(get("setting-goal")?.value ?? 15),
    heartsEnabled: Boolean(get("setting-hearts")?.checked),
    showXp: Boolean(get("setting-xp")?.checked),
    showStreak: Boolean(get("setting-streak")?.checked),
    appName: get("setting-name")?.value ?? state.settings.appName
  });
  state.config = validateConfig({
    ...state.config,
    lesson: {
      ...state.config.lesson,
      questionCount: Number(get("setting-count")?.value ?? state.config.lesson.questionCount),
      typedQuestionRatio: Number(get("setting-typed")?.value ?? state.config.lesson.typedQuestionRatio)
    }
  });
  persist().then(() => { renderSettings(); showToast("Preferences saved."); }).catch((error) => showToast(error.message, "error"));
}

function downloadBackup() {
  const json = createBackup(state);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `karlun-learn-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Backup exported.");
}

async function restoreBackup(file) {
  const raw = await file.text();
  const result = validateBackup(raw);
  if (!result.valid) { showToast(result.error, "error"); return; }
  const active = result.state.course.words.length;
  if (!confirm(`Restore this backup? It contains ${active} active words and will replace the current local course, progress and settings.`)) return;
  state = result.state;
  state.settings = validateSettings(state.settings);
  state.config = validateConfig(state.config);
  await persist();
  screen = "home";
  render();
  showToast("Backup restored.");
}

root.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    screen = nav.dataset.nav;
    if (screen === "import") { importPreview = null; importRaw = ""; }
    render();
    return;
  }
  const wordTabButton = event.target.closest("[data-word-tab]");
  if (wordTabButton) { wordTab = wordTabButton.dataset.wordTab; renderWords(); return; }
  const unitButton = event.target.closest('[data-action="start-unit"]');
  if (unitButton) { startLesson(false, unitButton.dataset.unit || null); return; }
  const filterButton = event.target.closest("[data-word-filter]");
  if (filterButton) { wordFilter = filterButton.dataset.wordFilter; renderWords(); return; }
  const answer = event.target.closest("[data-answer]");
  if (answer) { await answerQuestion(answer.dataset.answer); return; }
  const restoreWord = event.target.closest("[data-restore-word]");
  if (restoreWord) {
    const word = state.course.archivedWords.find((entry) => entry.id === restoreWord.dataset.restoreWord);
    if (word) {
      state.course.archivedWords = state.course.archivedWords.filter((entry) => entry.id !== word.id);
      state.course.words.push({ ...word, status: "approved" });
      await persist(); renderArchive(); showToast(`${word.term} restored.`);
    }
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "settings") { screen = "settings"; render(); }
  else if (action === "start-lesson") startLesson(false);
  else if (action === "start-review") startLesson(true);
  else if (action === "next-question") await nextQuestion();
  else if (action === "exit-lesson") { if (confirm("Leave this lesson? Your answers so far are saved, but the session won't earn its completion bonus.")) { lesson = null; screen = "home"; render(); } }
  else if (action === "preview-import") previewImport();
  else if (action === "apply-import") await applyImport();
  else if (action === "cancel-import") { importPreview = null; renderImport(); }
  else if (action === "save-settings") savePreferences();
  else if (action === "reset-settings") { if (confirm("Reset all appearance and learning preferences?")) { state.settings = validateSettings({}); state.config = validateConfig({}); await persist(); renderSettings(); showToast("Settings reset."); } }
  else if (action === "export-backup") downloadBackup();
  else if (action === "show-archive") { screen = "archive"; render(); }
});

root.addEventListener("submit", async (event) => {
  if (event.target.id === "answer-form") {
    event.preventDefault();
    await answerQuestion(document.querySelector("#typed-answer")?.value ?? "");
  }
});

root.addEventListener("change", async (event) => {
  if (event.target.id === "backup-file" && event.target.files?.[0]) await restoreBackup(event.target.files[0]);
});

async function boot() {
  try {
    state = await loadState();
    state.settings = validateSettings(state.settings);
    applySettings();
    renderHome();
    if (getPersistenceMode() === "session") {
      showToast("Temporary browser storage is active here. Progress may not survive closing this tab; export a backup if needed.", "error");
    }
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch(() => showToast("Offline caching could not start in this browser.", "error"));
    }
  } catch (error) {
    root.innerHTML = `<div class="fatal-error"><h1>Karlun Learn couldn't start</h1><p>${safe(error.message)}</p><button onclick="location.reload()" class="button button-primary">Try again</button></div>`;
  }
}

boot();
