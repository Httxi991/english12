# English12

Grade 12 English learning: study a short lesson, practise, take a quiz, and develop a written response for a teacher to mark. Optional Arabic explanations and local progress storage are built in.

- **Live app:** https://httxi991.github.io/english12/
- **Classroom lessons:** https://httxi991.github.io/english12/#/school
- **Teacher marking desk:** https://httxi991.github.io/english12/#/teacher
- **Public source:** https://github.com/Httxi991/english12
- Additional Sites publication: https://english12-learning.jauntydaisy1.chatgpt.site

## Included content

### Classroom course

The owner's 25 supplied classroom files are mapped to 18 lessons across six groups: Beowulf, Half a Day, language and style, Macbeth and tragedy, IELTS introduction, and activity-club projects. There are 108 newly written objective questions (two practice and four quiz questions per lesson), plus 18 teacher-marked written tasks. Each lesson has English explanations, examples and optional Arabic help.

The original files are adapted into the learning experience; raw textbook PDFs, slide decks and worksheets are not redistributed. The source-coverage page lists every filename and its associated lessons. Repeated slides are combined. Literary interpretations are assessed through evidence rather than forced into one multiple-choice answer. The large Beowulf textbook file is used for its Beowulf section; externally linked articles that were not supplied are not reproduced. No official curriculum endorsement is claimed.

### Foundation course

The existing four units remain available: vocabulary, grammar, reading and writing. They contain eight lessons and 48 explained questions using multiple choice, gap filling, matching and sentence ordering. There are also two original reading passages, two writing prompts with model answers and self-review, and 24 vocabulary cards.

Across both courses: saved progress, results, retries, mistake review, XP, responsive layouts, light/dark themes, keyboard controls, RTL Arabic explanations and reduced-motion support. Foundation achievement badges remain tied to actual foundation activity.

## Run locally

No build step or runtime dependencies. Use an HTTP server because ES modules do not run reliably from `file://`.

```sh
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`. For automated checks, use Node.js 20+:

```sh
npm ci
npm run check
npm test
```

LinkeDOM is a development-only dependency for DOM/event tests. It is never loaded by the deployed app.

## Study, practice and quiz rules

- Confirm each classroom study part in order to unlock two guided questions. Complete them to unlock the four-question quiz. Direct links respect these gates.
- Instant feedback explains every objective answer. Completion means finishing all questions, not necessarily answering them all correctly.
- A completed full quiz unlocks that lesson's written response. Its manual grade is separate from the objective quiz score.
- Full retries preserve previous results. Mistake review contains only missed questions. The most recent 60 classroom quiz/review attempts are retained.
- Each unique correctly answered classroom question earns 10 XP once; each completed classroom lesson quiz earns 20 XP once. Retries do not duplicate XP. Written teacher scores do not automatically award XP.
- Classroom recommendation priority: a latest full quiz below 70%, an unfinished last-opened lesson, then the next unfinished lesson. It uses full quiz results, not a partial review score.
- Foundation progress and its original scoring rules remain separate; total XP combines both courses. Existing version-1 progress migrates without dropping original drafts or results.

## Teacher marking: a working file exchange

There is no backend, login or automatic submission service. Teacher mode is a local workspace, not an authentication or security boundary.

1. The student completes a classroom quiz and writes its open-ended response.
2. In **My teacher submissions**, the student enters a name or classroom alias and downloads a JSON answer file containing all eligible written responses.
3. The student gives that file to the teacher through an agreed channel. The app does not send it.
4. The teacher opens **Teacher marking desk**, imports the file and grades each response using four criteria: understanding, evidence, reasoning/organisation, and language. Each receives 0–2 points, for a total of 8. A feedback comment is required.
5. The teacher downloads the marked file and returns it to the student.
6. The student imports it in **My teacher submissions**. The app checks the submission ID, student details, exact answer snapshots, score ranges and comments before saving the returned grades.

Both sides' drafts are saved locally. Five recent student submission snapshots are kept for matching returned files. If moving devices, restore the student's progress backup before importing returned feedback. Editing an answer after marking retains the original marked answer and labels the feedback as belonging to an earlier draft. Export the revision to request new marking. Clear the teacher workspace after finishing on a shared computer.

The eight-point rubric is classroom practice feedback, not an official school grade or IELTS band. There is no AI writing, speaking or pronunciation assessment, and no listening recording in the IELTS introduction. Teacher names in returned files are not cryptographically verified.

## Project structure

| File | Purpose |
| --- | --- |
| `dist/index.html`, `dist/style.css` | Entry point and responsive theme styles |
| `dist/app.js` | Shared shell, routing and foundation UI |
| `dist/content.js`, `dist/engine.js` | Foundation content, grading and persisted state |
| `dist/school-content.js` | Classroom groups, explanations, questions, writing tasks and rubric |
| `dist/school-sources.js` | The 25-source filename manifest |
| `dist/school-engine.js` | Gating, scoring, validation and teacher exchange protocol |
| `dist/school-ui.js` | Classroom and teacher interfaces |
| `tests/learning.test.mjs` | Foundation content and engine checks |
| `tests/school.test.mjs` | Classroom, migration and teacher exchange checks |
| `tests/ui.test.mjs` | DOM/event journeys, including student–teacher handoff |
| `.github/workflows/ci.yml` | Push/PR checks |
| `.github/workflows/pages.yml` | Pages deployment on main pushes or manual dispatch |
| `.openai/hosting.json` | Existing Sites identity and static directory |

`dist/` is editable source, not a generated bundle. All runtime assets are local. Hash routes work on repository subpaths and direct refreshes without server rewrites.

## Add content

For classroom content, add a `lesson(...)` entry in `school-content.js` with a stable ID, existing group ID, goal, numeric source references, study sections, six questions, a written task and assessment guidance. Each section has a title, explanation, example and Arabic help. The first two questions become practice; the remaining four become the quiz. `mc(...)` receives the correct answer first and three distinct distractors; the finalisation loop rotates options deterministically and assigns IDs. `fill(...)` accepts a string or an array of valid answers. Preserve IDs and question order for existing learners. Add source filenames to `school-sources.js` when needed.

For foundation content, extend the exported collections in `content.js`: units, lessons, questions, passages, vocabulary or writing prompts. Questions support `mc`, `fill`, `match` and `order`; follow the existing examples and include an explanation. Reading questions reference a passage ID. Matching and ordering use complete, unambiguous answers. Fill answers ignore case, repeated spaces and trailing sentence punctuation.

When changing an existing question's meaning or answer key, plan a course/state migration rather than silently reusing its ID. The teacher protocol uses `COURSE_VERSION` in `school-engine.js`; preserve compatibility with outstanding submission files. Update inventory labels and content tests after additions. Run all checks before publishing.

## Persistence and privacy

State is stored under `english12.progress.v1` in local storage. It survives ordinary browser reopening but is specific to the browser and origin. Private browsing, clearing site data or switching hosts can remove or separate it. Use Settings to export/restore a complete progress backup (up to 6 MB). Student/teacher exchange files are limited to 2 MB.

There are no application accounts, analytics, database calls or embedded secrets. User content is escaped and imported data is validated. Local storage and editable JSON files are learning aids, not tamper-proof exam records. Avoid sharing personal details beyond what the teacher needs. Student answers and names are never committed to this repository.

## Deployment

The public repository is already configured for GitHub Pages using GitHub Actions. A push to `main` runs checks and deploys `dist/`; **Actions → Deploy English12 to GitHub Pages → Run workflow** also works. Pages settings should use **GitHub Actions** as the source. The separate CI workflow also runs on pull requests.

The existing Sites publication serves the same `dist/` directory. Preserve `.openai/hosting.json` and its project ID when updating it, and use the Sites source/version/deploy workflow. Preserve its public audience. No environment variables, server functions, database or API key are required.

## Verification and content rights

See `VALIDATION.md` for executed checks and the browser-verification boundary. Source and explanations were prepared for the project owner. Classroom materials are adapted from the owner's supplied files; original binaries and full third-party passages are not included. A public reuse licence has not been selected.
