# Karlun Learn

Karlun Learn is a free, mobile-first Karlun learning app. This build is a dependency-light static website: it uses browser JavaScript modules, IndexedDB (with a localStorage fallback), and a service worker. There are no API keys, paid services, analytics, ads, accounts or runtime packages.

## Start it on Windows

**Once Node.js is installed, setup is basically two clicks.**

1. Download and extract the `Karlun Learn` folder.
2. Install the current Node.js LTS release from <https://nodejs.org/> if `node` is not already installed.
3. Double-click **`START-WINDOWS.bat`**.
4. Your browser opens at **<http://localhost:4173>**. Keep the black terminal window open while using the site.

There is no `npm install` step and no account to create. The app is served locally by Node's built-in HTTP server.

### Other commands

Open a terminal in the project folder and run:

```bash
npm run dev      # Start the local development server
npm run check    # Check JavaScript syntax and required assets
npm test         # Run the automated tests
npm run build    # Create the static production site in dist/
npm run verify   # Run checks, tests and production build
npm run preview  # Serve the built dist/ site locally
```

The project targets Node.js 18.17 or newer and is tested with Node.js 22. The launcher prints a local URL and a same-Wi-Fi URL for testing on another device.

## Use it on your Samsung phone

### Quick preview on the same Wi-Fi

1. Start the app on your laptop.
2. Make sure your phone and laptop are on the same Wi-Fi network.
3. Open the **Phone** address printed in the terminal (it looks like `http://192.168.x.x:4173`).

This is a convenient preview, but local-network HTTP is not a reliable PWA installation address.

### Install it as a proper phone app

The easiest free route is GitHub Pages, which provides the HTTPS address required for service workers and PWA installation.

1. Create a free GitHub repository called `karlun-learn`.
2. Upload the contents of this project to the repository's `main` branch (the files inside the folder, not an extra nested folder).
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. The included `.github/workflows/pages.yml` workflow will check, test, build and deploy the site when you push to `main`.
6. When the deployment completes, open the Pages URL on your Samsung in Chrome or Samsung Internet.
7. Use the browser menu and choose **Install app** or **Add to Home screen**.

The app caches its main interface and course files after the first successful load. Previously loaded lessons can then work offline. A brand-new phone still needs to load the site once while online.

## First steps inside Karlun Learn

The bundled course snapshot contains **53 approved words, 160 individually tracked meanings, 12 learning units, 10 approved grammar rules and 1 clearly labelled tentative idea**. It uses the Karlun master-plan material available on 5 November 2026, including `sopo` = say / talk / ask. Newer master plans should be imported in the app rather than assumed to be present in this starter snapshot.

- **Home:** start a lesson and see your progress.
- **Path:** work through the course units. A unit's play button starts a lesson using words from that unit.
- **Words:** search the approved vocabulary and filter words you have or have not studied.
- **Grammar:** read the current approved rules, see tentative ideas clearly labelled, and view approved examples.
- **Review:** practise due meanings and revisit mistakes. Hearts never lock or limit lessons.
- **Stats:** see XP, level, accuracy, streak and lesson history.
- **Settings:** customise the theme, colours, text scale, motion, daily goal, lesson length, typed-answer frequency, app name and visible progress indicators. Export or restore a backup here too.

## Add or update Karlun vocabulary

Your latest master plan remains the source of truth. In the app:

1. Open **Settings → Import master plan**.
2. Paste your complete, latest master plan as plain text.
3. Leave **Archive words missing from it** off unless the pasted text really is the complete current plan.
4. Select **Compare master plan** and check the additions, changes, warnings and possible archives.
5. Select **Apply vocabulary changes** only after the preview looks right.

The parser recognises simple entries in formats such as:

```text
sopo = say / talk / ask
bera / bura = because
salo: hello / greeting
```

Multiple meanings on the right are kept as separate meaning records. Spelling variants can be written on the left separated by `/`. Headings and explanatory prose are not turned into vocabulary. Lines it cannot confidently parse are shown for review; the importer does not make up words.

**Important:** the current importer updates vocabulary. It does not automatically rewrite grammar rules or examples from natural-language prose. Those remain unchanged during import. To change the bundled grammar/example data in this build, edit `INITIAL_GRAMMAR` or the `examples` array in `src/course/initial-course.js`, then rebuild/redeploy. Existing browsers keep their saved course data, so use an in-app backup before any manual data migration. A dedicated grammar/example editor can be added as a later feature without changing the vocabulary importer.

## Customise the learning experience

- **Visual theme and preferences:** use Settings inside the app. Preferences are saved locally.
- **Default look and app-wide settings:** edit `src/config/defaults.js`. `DEFAULT_SETTINGS` contains default colours, theme and display preferences. `DEFAULT_CONFIG` contains lesson length, exercise mix, XP/level values and review intervals. Values are validated before use.
- **Course vocabulary and units:** edit `src/course/initial-course.js` for the bundled first-install course. The app's import tool is the preferred way to add vocabulary to your existing local course.
- **Grammar and examples:** edit `INITIAL_GRAMMAR` and `INITIAL_COURSE.examples` in `src/course/initial-course.js`.
- **Lesson generation and answer checking:** `src/core/lesson-engine.js` and `src/core/answer-checker.js`.
- **XP, levels, streaks and mastery:** `src/progress/progression.js`.
- **Review intervals:** `src/review/scheduler.js` and `DEFAULT_CONFIG.review.intervalsDays`.
- **Persistent storage and migrations:** `src/storage/store.js`.
- **Import comparison and archive behaviour:** `src/importer/master-plan.js`.
- **Backup format:** `src/backup/backup.js`.
- **Screens and navigation:** `src/app.js`.
- **Design system and responsive styling:** `styles.css`.
- **Offline assets and cache version:** `sw.js`. When adding a new file needed offline, add it to `APP_SHELL` and increment `CACHE_NAME`.

When changing code, run `npm run verify`. The automated checks cover parsing, stable IDs, repeat imports, archiving, answer checking, lesson generation, unit isolation, tentative grammar protection, review scheduling, mastery, XP, settings validation and backup validation.

## Data, privacy and limitations

- Your progress and preferences are stored on the current browser/device in IndexedDB, with localStorage as a fallback. In unusually restricted preview contexts where both are blocked, the app stays usable in temporary tab memory and warns you that it may not survive closing the tab.
- There is no account, cloud sync or online leaderboard in this version. Your laptop and phone do not automatically share progress. Export a backup on one device and restore it on the other when you need to move progress.
- Backups contain your course, progress, settings and configuration. Keep the file somewhere private.
- The review scheduler is a simple, transparent interval ladder, not FSRS yet.
- Current lesson exercises are multiple-choice and typed translation in both directions. Matching, sentence-building, comprehension, conversation and a fuller grammar exercise system are future extensions; the app skips exercise types that do not have reliable approved content rather than inventing examples.
- There is no listening, speaking, speech recognition or pronunciation scoring feature in this build.
- The possible yes/no question pattern involving `sopo sa ori ne` remains tentative and is not taught as confirmed grammar.
- This is a tested foundation, not a promise of zero bugs or instant fluency. Browser and phone testing is still worthwhile after deployment.

## Project layout

```text
karlun-learn/
├── index.html
├── styles.css
├── manifest.webmanifest
├── sw.js
├── START-WINDOWS.bat
├── package.json
├── README.md
├── public/icons/             # Original app icons
├── scripts/                  # Local server, build and checks
├── tests/                    # Automated tests
├── src/
│   ├── app.js                # Screen composition and user interactions
│   ├── backup/               # Validated backup and restore data
│   ├── config/               # Customisable defaults and validation
│   ├── core/                 # Lesson selection, answer checking, utilities
│   ├── course/               # Approved starter Karlun content
│   ├── importer/              # Plain-text master-plan parser and diff
│   ├── progress/              # XP, streaks, mastery and mistake tracking
│   ├── review/                # Spaced-review scheduling
│   └── storage/               # IndexedDB/localStorage persistence
└── .github/workflows/         # Automated GitHub Pages deployment
```
