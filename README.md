# English12

A connected Grade 12 English classroom: study, practise, take a quiz, and send a written response directly to the teacher. Student accounts ask for a name only; the app generates a private login code. No age, email address, phone number or other profile details are requested.

- **Student app:** https://httxi991.github.io/english12/
- **Teacher sign-in:** https://httxi991.github.io/english12/#/teacher
- **Full-stack host / API:** https://english12-learning.jauntydaisy1.chatgpt.site
- **Public source:** https://github.com/Httxi991/english12

## Accounts and saved work

Create a student account by entering a name. Save the generated login card/code, then sign in on any device with the same name and code. Duplicate names create separate accounts and codes. The teacher's account is provisioned separately; students cannot choose a teacher role.

Progress, quiz results and writing drafts sync to Cloudflare D1 through authenticated server endpoints. A browser copy protects unsynced edits while offline. The save indicator distinguishes local pending work from confirmed online storage. Sign-out waits for pending student changes to save. Concurrent device updates use revisions: a conflicting save pauses and asks which version to keep, with backup downloads, instead of silently replacing either draft.

When upgrading from the original local-only app on GitHub Pages, the app preserves the old local state and offers **Save my previous progress** after account creation. Import is explicit so a shared computer's old work is not silently assigned to a different student. Use the same app URL/browser for that migration, or restore a progress backup in Settings. After migration, online work is shared between the two hostnames through the same account service.

## Teacher workflow

The teacher uses a separate account and temporary password delivered privately to the project owner. The first sign-in requires a new password of at least 16 characters. There is no public teacher registration form.

- Registered students appear automatically in the roster, refreshed every 10 seconds while the roster is visible.
- Open a student to see saved lesson completion, quiz results and submitted written responses.
- Grade each written response using four criteria, each 0–2, and a feedback comment. Publish it directly to the student's account.
- Students receive grades and comments in **My submissions**, with the exact submitted answer. Changes to a draft do not change the answer already marked.
- A teacher can issue a replacement student login code. This revokes the old code and sessions while preserving learning records.
- Teacher marking drafts are retained locally until **Publish feedback** is pressed; published grades are stored centrally. Conflicting grade edits are rejected until refreshed.

No file exchange is required in the connected interface. The old offline exchange engine is retained for version-1 compatibility and regression tests, but the public teacher routes use server-enforced account permissions.

## Learning content

The owner's 25 classroom files are adapted into 18 lessons across Beowulf, Half a Day, language/style, Macbeth/tragedy, IELTS introduction and activity-club projects. Each lesson contains explanations, examples, optional Arabic guidance, two practice questions, four quiz questions and one teacher-marked response: **108 objective questions and 18 manual tasks** in total.

The original foundation course remains: four units, eight lessons, 48 questions, two original reading passages, two writing prompts with models, and 24 vocabulary cards. Light/dark themes, keyboard controls, responsive layouts, RTL Arabic guidance, retries, mistake review, XP and foundation achievement badges remain available.

Study parts unlock practice; completing practice unlocks the quiz; completing the quiz unlocks the written response. Objective answers receive instant explanations. Each unique correct question earns 10 XP once, and a completed classroom quiz earns 20 XP once. Teacher grades are separate and do not award automatic XP. Recommendations prioritise a latest full quiz below 70%, then unfinished work. Practice scores are learning records, not tamper-proof examinations.

Raw supplied PDFs, slide decks and worksheets are not redistributed. The coverage page maps all 25 filenames to the adapted lessons. Repeated slides are combined; open interpretations remain teacher-assessed. No official curriculum endorsement or IELTS band prediction is claimed.

## Architecture

The browser runs dependency-free ES modules from `web/`. GitHub Pages serves these files, and the Sites Vinext/Cloudflare Worker serves the same UI plus `/api/v1/*`. GitHub Pages itself does not run server code or store student records. The browser calls the full-stack host over HTTPS with an opaque account session token.

| Path | Purpose |
| --- | --- |
| `web/app.js`, `web/style.css` | Shared learning shell and responsive design |
| `web/accounts.js` | Registration/login, sync, roster and direct marking UI |
| `web/content.js`, `web/engine.js` | Foundation content and learning rules |
| `web/school-*.js` | Classroom content, source manifest and learning UI/rules |
| `server/api.mjs`, `server/security.mjs` | Authorised account, progress and marking endpoints |
| `app/api/v1/[[...path]]/route.ts` | Vinext API routing to the account service |
| `app/route.ts` | Existing learning HTML at the root URL |
| `db/schema.ts`, `drizzle/` | D1 schema and immutable generated migrations |
| `scripts/prepare-web.mjs` | Copies browser assets into framework public output |
| `tests/` | Learning, DOM/event, account service and sync regression checks |
| `.openai/hosting.json` | Existing Sites project and `DB` binding |
| `.github/workflows/` | CI and Pages frontend publication |

`web/` is editable source. `public/` and `dist/` are generated and ignored. The Sites starter's platform auth integration is retained. The requested name-only classroom accounts operate at the application layer on the existing public Site; they do not replace dispatch-owned ChatGPT routes or change the Site audience.

## Run and verify locally

Requires Node.js **22.13+** (including `node:sqlite` for service tests).

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

The standalone portable development server prints its URL. In the managed Sites environment, use the supported Sites preview workflow instead. Apply pending D1 migrations to the local database before exercising accounts through a local server; see the starter migration command below. Local preview databases and production databases are separate.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_faithful_living_lightning.sql
```

For local server testing, supply untracked local Worker environment values using the supported runtime configuration. The unit and DOM tests use an isolated in-memory SQLite database and test-only credentials; they need no production secrets.

## Deployment and runtime configuration

The production Sites manifest preserves the existing project ID, declares `d1: "DB"`, and has no `static` field. Sites provisions D1 and applies the committed schema migrations before deploying the Worker. Build and publish through the Sites source/version/deployment workflow. Do not modify already-applied migration files; generate an additional migration for later schema changes.

Set these **secret** runtime keys through Sites settings/tools; never put values in source, the browser bundle, GitHub secrets output or the hosting manifest:

- `TEACHER_INITIAL_HASH`: PBKDF2-SHA-256 hash in the format produced by `server/security.mjs`. The initial teacher password is randomly generated and delivered privately. The teacher account is initialised on its first successful authenticated sign-in and must then change that password. After initialisation, changing this environment value alone does not reset the stored teacher password.
- `ACCOUNT_RATE_SECRET`: random secret used to hash short-lived rate-limit buckets. Raw IP addresses are not stored by application code.

The current production values are already configured. No student setup is required beyond their name and saving their generated code.

GitHub Pages publishes **`web/`** on pushes to main or manual workflow dispatch. It uses the existing full-stack host for API requests. Backend code changes also require a Sites deployment; a Pages push alone does not deploy the Worker. If moving to another backend domain, update the public API origin in `web/accounts.js`, the exact CORS allowlist in `server/api.mjs`, and the CSP in `web/index.html` together.

## Security and data scope

The server determines the account and role from a validated session, never from a client-supplied student ID or role. Students can access only their own saved work and results. Teacher endpoints require the teacher role. Progress uploads cannot create teacher feedback. Scores and comments are validated server-side, and marked answer snapshots are preserved.

Generated student codes have 96 bits of random secret material; server credentials use salted PBKDF2-SHA-256. Session tokens have 256 random bits, expire after 30 days and are stored as hashes server-side. Browser tokens are stored on the device to permit cross-origin GitHub Pages access; protect shared devices and sign out after use. The UI escapes user content, uses a content security policy and permits CORS only for the two known origins. Authentication/registration have rate limits. No passwords, codes, tokens or student records belong in Git commits or logs.

Profile information is limited to a name and generated account identifier. Functional records also include learning progress, submitted answers, teacher feedback and save timestamps. The app has no advertising analytics or AI grading. Hosting services may maintain their own operational logs. The teacher sees the entire classroom roster; this release is a single-classroom/single-teacher system, not a multi-school tenant service.

## Content changes

Add classroom lessons in `web/school-content.js` and source filenames in `web/school-sources.js`. Keep existing lesson/question IDs stable. A lesson has English/Arabic study sections, six questions, a written task and assessment guidance. The first two questions become practice, and the remaining four become the quiz. Multiple-choice helpers rotate answers deterministically. Foundation content lives in `web/content.js`.

Changes to answer keys, IDs, course version or grading criteria require a deliberate progress/submission migration. Keep `COURSE_VERSION` compatible with existing submitted work. Update inventory labels and content tests before publication. Original source and adapted content were prepared for the project owner; no public reuse licence has been selected.

See `QUICKSTART-AR.md` for usage and `VALIDATION.md` for checks and verification limits.
