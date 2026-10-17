# English12

A complete, dependency-free English learning app for Grade 12. Original practice content, optional Arabic explanations, and progress that stays on the learner’s device.

- Live application (owner-private): https://english12-learning.jauntydaisy1.chatgpt.site
- Source repository (private): https://github.com/Httxi991/english12

## What is included

- Four units: vocabulary, grammar, reading and writing.
- Eight short lessons and 48 distinct, explained questions: 30 multiple choice, 9 fill-in-the-gap, 3 matching and 6 sentence-building activities.
- Two original reading passages; each appears beside its questions.
- Two writing prompts, model answers, word counts and transparent self-review criteria.
- A searchable bank of 24 vocabulary cards with meanings, Arabic translations and usage examples.
- Unit quizzes, complete answer review, unlimited retries and focused review of mistakes.
- Local persistence of drafts, partial activities, checked answers, results and preferences.
- A progress dashboard, rule-based recommendations, earned XP and five achievement badges.
- Light/dark themes, responsive layouts, keyboard-operable interactions, reduced-motion support and RTL Arabic explanations.
- Export/restore of progress as JSON, with validation and confirmation before replacement.

The app does not use AI grading, analytics, accounts or a database. It contains no secrets and makes no application-level network calls after loading its static files. Hosting may require the owner to sign in to access a private preview; that is separate from the learner app.

## Run locally

Requirements: Python 3 for the static server. Node.js 20+ for the optional automated checks. The running application has no package dependencies or build step.

```sh
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/` in a modern browser. Do not open `index.html` directly with `file://`, because ES modules need an HTTP server.

```sh
npm ci
npm run check
npm test
```

`npm ci` installs only the development dependency LinkeDOM and its dependencies for DOM/event tests. It is not loaded by the deployed app.

## Project structure

| File | Role |
| --- | --- |
| `dist/index.html` | Accessible application entry point |
| `dist/app.js` | Route rendering, UI components and event handlers |
| `dist/content.js` | All units, lessons, questions, passages, words and writing prompts |
| `dist/engine.js` | Grading, progression, recommendations and persistence |
| `dist/style.css` | Responsive design and light/dark themes |
| `tests/learning.test.mjs` | Content and learning-flow regression tests |
| `tests/ui.test.mjs` | UI render/event smoke tests using LinkeDOM |
| `scripts/export-source.mjs` | Creates a clean source archive without Git metadata or credentials |
| `.github/workflows/pages.yml` | Optional GitHub Pages deployment workflow |
| `.github/workflows/ci.yml` | Automated checks on pushes and pull requests |
| `.openai/hosting.json` | Existing Sites identity and static hosting configuration |

`dist/` is the actual editable, deployable source; there is no compiled bundle or build step. Keep content independent of UI code. All assets are local. Hash routes such as `/#/lesson/r1` support direct navigation and refresh on static hosting and repository subpaths.

## Add or update content

1. Add a unit to `units` in `dist/content.js` with a unique ID, title, skill, colour, lesson IDs and quiz question IDs.
2. Add lessons to `lessons`. Each includes `intro`, `points`, `example`, optional `arabic`/`passage`/`writing`, and the `practice` question IDs.
3. Add questions to `questions`, using a globally unique ID and one of the four types below. Include an explanation that teaches the concept, not just the answer.
4. Add optional passages, vocabulary cards or writing prompts to their exported collections. Provide only original or appropriately licensed content. Preserve existing IDs to retain learners’ progress.
5. Update displayed inventory counts and the content contract tests when expanding the curriculum; run the checks before publishing.

Question shapes:

```js
// Multiple choice: answer is a zero-based option index.
{ id: 'new-mc', unit: 'grammar', type: 'mc', prompt: '...',
  options: ['A', 'B', 'C', 'D'], answer: 1, explanation: '...' }

// Fill: list all genuinely acceptable exact answers.
{ id: 'new-fill', unit: 'grammar', type: 'fill', prompt: '...',
  answers: ['written'], explanation: '...' }

// Matching: each pair is [term, meaning]. Each activity earns one point
// only when all pairs are correct. The UI reorders the meanings.
{ id: 'new-match', unit: 'vocabulary', type: 'match', prompt: '...',
  pairs: [['word', 'meaning'], ['other word', 'other meaning']], explanation: '...' }

// Ordering: tokens are the scrambled choices. answer is the full correct sequence.
{ id: 'new-order', unit: 'grammar', type: 'order', prompt: 'Start with “We”.',
  tokens: ['learn.', 'We'], answer: ['We', 'learn.'], explanation: '...' }
```

Reading questions use a `passage` ID. Fill answers ignore case, surrounding/repeated spaces and trailing `. ! ?`. Other spelling changes are not silently accepted. Make prompts constrain any sentence ordering that would otherwise have multiple valid answers.

The current material is independently authored general Grade 12 practice, not a claim of alignment with a UAE or other official curriculum. When a school syllabus is supplied, map its objectives to units and document that source before claiming alignment.

## Scoring and recommendations

- One score point per question. Compound matching questions are all-or-nothing, disclosed in the interface.
- 10 XP per unique question answered correctly, once; 20 XP per lesson practice completed, once; 30 XP per writing self-review completed, once.
- Finishing all three lesson practice questions completes the lesson even when some answers are incorrect. Accuracy and quizzes remain separate.
- Retry creates a separate attempt and does not erase previous results. Latest answers determine current skill accuracy. The most recent 80 attempts are retained.
- Recommendation priority: a skill with at least three answers and below 70% accuracy; next unfinished lesson; first unattempted unit quiz; unfinished writing task; vocabulary refresh.
- Writing completion requires the prompt’s word range and all four review areas checked. This is self-reported revision, not a judgement of writing quality or an examination grade. Model answers are examples, not the only acceptable responses.

## Persistence and privacy

State is stored under `english12.progress.v1` in local storage. It survives ordinary refresh and browser reopening. It is specific to the origin and browser, does not sync, and may be cleared by private browsing or deletion of site data. Changing hosts creates a different storage origin. Export and restore progress to transfer it.

Storage failures produce a visible warning. Malformed saved state is rejected safely. The app uses escaped text for user content and validates imported progress. No credentials, API keys or student drafts belong in the repository. Local-storage state is a learning aid, not a secure examination record.

## Deploy

### Existing Sites publication

The project is configured as a static Site serving `dist/`. Keep the existing opaque `project_id` when updating that same Site. Use the Sites source/version/publish workflow; the repository contains no write credential. New Sites publications are owner-private until their sharing is explicitly changed.

### GitHub repository and GitHub Pages

The private source repository is `Httxi991/english12`. The app is already published through Sites; enabling GitHub Pages is optional. Use the existing repository for this project rather than creating a duplicate.

```sh
git clone https://github.com/Httxi991/english12.git
cd english12
python3 -m http.server 8000 --directory dist
```

For a separate copy under a different account, authenticate GitHub CLI on your own computer and run these commands inside the extracted source. They create a new private repository; choose public only if you intend to share the source.

```sh
git init -b main
git add .
git commit -m "feat: launch English12 learning platform"
gh repo create english12 --private --source=. --remote=github --push
```

If using an existing checkout already synced with Sites, skip `git init` and the initial commit; keep its existing remote and add GitHub as a separate remote. Never overwrite another project’s repository.

For Pages, the included optional workflow uploads `dist/` and deploys it when run manually from Actions. First select GitHub Actions as the Pages source in repository settings. It is manual so it will not fail on every source push while Pages is disabled. A separate CI workflow checks the code on pushes and pull requests. Pages availability depends on repository visibility and account plan. A free public repository is the usual no-cost Pages path; source visibility should be a deliberate choice. The app also works on any static host with `dist/` as its document root. No environment variables or server functions are required.

## Validation and limitations

See `VALIDATION.md` for what was tested and what requires a real browser check. The current execution environment did not provide the Sites-supported browser-preview capability, so no claim is made of completed visual/mobile browser QA. The responsive styles are implemented for desktop, tablet and phone; perform the documented visual check on the deployed link.

## License and content

Original English12 source and learning content prepared for the project owner. No third-party teaching passages, stock images or external font dependencies are included. A public-source licence has not been selected; choose one before inviting public reuse.
