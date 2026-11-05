# Karlun Learn — Developer Guide

This guide explains where features live and how to extend the project without coupling the course data, learning logic and interface together.

## The basic architecture

Karlun Learn is intentionally dependency-light. It is plain browser JavaScript using ES modules, CSS, IndexedDB and a small Node-only local server/build script. There is no compile step for the app code and no third-party runtime service.

The key boundary is:

- **Course data** says what Karlun officially contains.
- **Domain/learning modules** decide how a lesson, answer or progress update works.
- **UI screens** show those results and collect the learner's input.
- **Storage** saves the course copy and learner state independently of the UI.

Keep these boundaries intact. A button should not contain language rules, and a vocabulary file should not contain HTML.

## Where to edit things

| Goal | File or folder |
|---|---|
| Add or edit bundled vocabulary | `src/course/initial-course.js` → `INITIAL_WORDS` |
| Add or edit a learning unit | `src/course/initial-course.js` → `INITIAL_UNITS` |
| Add or edit an approved grammar rule | `src/course/initial-course.js` → `INITIAL_GRAMMAR` |
| Add an approved example | `src/course/initial-course.js` → `INITIAL_COURSE.examples` |
| Change default colours and preferences | `src/config/defaults.js` → `DEFAULT_SETTINGS` |
| Change lesson/progression defaults | `src/config/defaults.js` → `DEFAULT_CONFIG` |
| Generate lesson questions | `src/core/lesson-engine.js` |
| Check submitted answers | `src/core/answer-checker.js` |
| XP, streaks, hearts and mastery | `src/progress/progression.js` |
| Review intervals | `src/review/scheduler.js` |
| Import parsing and change comparison | `src/importer/master-plan.js` |
| Save and load data | `src/storage/store.js` |
| Backup validation/export | `src/backup/backup.js` |
| Screen markup and interactions | `src/app.js` |
| Visual style and responsive breakpoints | `styles.css` |
| Offline cache list | `sw.js` |

## Add vocabulary the safe way

For normal course updates, do not edit source code. Open **Settings → Import master plan**, paste the complete, latest master plan, compare it, inspect warnings and apply it. This is the preferred path because it compares the new plan with the course already saved in the browser.

A simple vocabulary entry can be written as:

```text
sopo = say / talk / ask
bera / bura = because
salo: hello / greeting
```

The left side is the official term and any accepted spelling variants. The right side is split into individual translation/meaning records. The importer keeps stable IDs for unchanged terms and unchanged meaning text. It does not guess what an unknown line means. If two words claim the same spelling/alias, it blocks the import until the conflict is resolved.

Only enable **Archive words missing from it** when the pasted text is the complete authoritative plan. Archiving removes words from new lessons but retains their data and previous learning history.

### Add vocabulary to the first-install course in code

Edit an item in `INITIAL_WORDS`:

```js
word("w-example", "example", ["first meaning", "another meaning"], "unit-id")
```

Use a permanent, unique ID. Do not use an array index or rename an existing ID merely because its spelling/meaning changed. Add a matching unit to `INITIAL_UNITS` if it needs a dedicated path section. Use only translations and rules approved by Huw.

Important: `INITIAL_WORDS` is the starter snapshot for a fresh browser. Existing browsers already have a saved course copy. For your normal updates, use the in-app importer; do not expect editing the starter file to overwrite local learner data.

## Add grammar or examples

Add grammar records to `INITIAL_GRAMMAR` with unique IDs and an explicit approval state:

```js
{
  id: "g-example",
  title: "Rule title",
  text: "Plain-English explanation based on the approved master plan.",
  status: "approved",
  approved: true
}
```

Unconfirmed ideas must be `status: "tentative"` and `approved: false`. Lesson generators must never use tentative rules.

Add examples to `INITIAL_COURSE.examples` with a unique ID, Karlun text, English translation, note and status. Do not make up examples to create more exercises. The current vocabulary importer intentionally does not rewrite grammar or examples from free-form prose.

## Add a new exercise type

The existing lesson engine generates typed and multiple-choice translation prompts. When a new exercise has enough approved source material, add it in this order:

1. **Define its data contract** in `src/core/lesson-engine.js`. Include a stable question ID, type, prompt, expected/accepted answer(s), and the relevant word/meaning IDs.
2. **Generate only from approved data.** If the course lacks the facts or examples needed, return no question for that template rather than inventing content.
3. **Render the type** in `renderLesson()` in `src/app.js`. Keep the UI markup separate from question generation.
4. **Handle the response** through the existing delegated click/submit handlers or add a clearly scoped handler.
5. **Track the correct source meaning** through `recordAnswer()` so progress and review remain attached to the right item.
6. **Add automated tests** in `tests/learning.test.mjs` for generation, accepted answers, missing data and progress updates.
7. **Run `npm run verify`** before considering the exercise finished.

Keep answer checking deterministic. Do not silently accept guessed synonyms, unapproved word-order patterns or mechanically derived forms.

## Customise appearance and behaviour

The Settings screen saves the learner's appearance and practice preferences locally. It currently supports light/dark/system themes, accent/background/card/text colours, text scale, reduced motion, daily XP goal, lesson length, typed-answer frequency, app name and display toggles for hearts/XP/streak.

For default values and future global settings, edit `src/config/defaults.js`. Values must also be added to the corresponding validation function so imported or corrupted settings cannot crash the app. Keep CSS values in `styles.css` and expose new theme values as CSS variables in `applySettings()` rather than scattering hardcoded colours throughout individual screens.

Progression values (XP per answer, lesson bonus, XP per level, starting/max hearts and review intervals) are configurable in `DEFAULT_CONFIG` even when not all are exposed as Settings controls yet.

## Add a new screen

1. Add a `renderYourScreen()` function in `src/app.js`.
2. Add a screen key to the `render()` switch.
3. Add navigation only if the screen should be permanently accessible; update `bottomNav()` for a bottom-tab destination.
4. Use existing shared CSS patterns for page headings, cards, buttons, settings rows and empty states.
5. Make interactive controls use `data-action`, `data-nav` or a clearly named data attribute handled by the root event listener.
6. Check the screen at phone and desktop widths and ensure all controls work by keyboard as well as touch.

## Data and identity rules

- Course definitions and learner progress are stored separately.
- Word IDs and meaning IDs are permanent references. Preserve IDs when the underlying meaning is unchanged.
- Do not use array indexes as IDs.
- A changed meaning gets a new meaning ID unless you have strong evidence it is exactly the same sense; the old progress record remains in the data but does not automatically transfer to a different meaning.
- Removed words are archived, not erased.
- Validate backups before restoring. Never silently merge an unknown backup format.
- If an import is ambiguous, stop and ask the user rather than guessing.

## Offline support and releases

`sw.js` contains the app-shell cache. When a new runtime file is added, add its relative path to `APP_SHELL` and increment `CACHE_NAME`. The static build copies `index.html`, CSS, manifest, service worker, `src/` and `public/` into `dist/`.

The app needs an HTTPS origin (or localhost) for reliable service-worker/PWA installation. GitHub Pages deployment is preconfigured in `.github/workflows/pages.yml`.

## Test before sharing a change

Run:

```bash
npm run verify
```

This checks JavaScript syntax and required offline files, runs the automated tests and builds `dist/`. Add tests alongside every new learning rule, importer behaviour, progression mechanic or persistence change. For interface changes, also manually test a complete lesson, a typed answer, importing a new word, exporting/restoring a backup and a narrow phone viewport.

## Current v1 boundaries

This build currently has multiple-choice and typed translation lessons, vocabulary and grammar reference screens, unit path, review/mistake notebook, stats, configurable appearance/preferences, master-plan vocabulary importer, archive, backup/restore and PWA caching. It does not yet have matching, sentence construction, a full grammar editor, FSRS, cloud accounts/sync, online leaderboards, voice features or a placement test. Those are extensions, not hidden or partially working buttons.
