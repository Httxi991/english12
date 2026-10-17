# English12 validation — 17 October 2026

## Completed checks

`npm run check` passes JavaScript syntax checks. `npm test` passes 17 automated tests.

- Verified the inventory: four units, eight lessons, 48 unique questions, two original passages, two writing tasks and 24 vocabulary cards. All lesson and quiz references resolve. Every question is used once in the initial course.
- Reviewed the content and answer keys. Every authored correct answer is accepted. Every multiple-choice distractor is rejected. Each question has a teaching explanation. Reading questions include their source text in the activity view.
- Checked all four scored interaction types through real DOM events in LinkeDOM: radio choices, typed answers, meaning selections and word ordering.
- Executed the full simulated UI path through every lesson and quiz, including explanation, answer, result, saved progress and restored state. All 48 correct responses produce 480 question XP, and the eight completed lessons add 160 XP.
- Verified incorrect-answer review, corrected latest skill accuracy, independent attempt history, quiz percentages, completion badges and deterministic recommendations.
- Verified that repeat submissions, repeated result completion and retries do not award duplicate XP or duplicate the same attempt.
- Verified storage round trips, partial matching/order selections, drafts, theme and Arabic preferences, corrupted JSON, unavailable storage and invalid backup data.
- Verified vocabulary filtering, card flips and known-word toggles.
- Verified writing word counts and that self-review cannot be completed until the word range and all four review areas are satisfied. Model answers contain 190 and 161 words and fit their respective ranges.
- Rendered every primary route and checked its internal links against valid route destinations. Invalid routes render a recovery page.
- Checked that user-entered text is escaped in rendered content, that there are no embedded credentials, and that assets use relative paths for deployment beneath a repository subpath.

## Verification boundary

LinkeDOM is a DOM implementation, not a browser layout engine. These tests do not certify visual appearance, screen-reader behaviour, touch behaviour or rendering at specific viewport sizes. The Sites-supported browser-preview skill was unavailable in this session. Per the Sites workflow, no alternate preview server or browser-control path was substituted.

Responsive styles include breakpoints at 1450, 1200, 1050, 760 and 480 pixels; the layout uses constrained grid columns, wrapping controls and a mobile navigation menu. Light/dark palettes, semantic forms, focus indicators, native keyboard controls and reduced-motion styles are implemented. They still need the real-browser acceptance check below.

## Real-browser acceptance checklist

1. Open the published link at desktop, tablet and 390px mobile widths; check for horizontal overflow and clipped controls in both themes.
2. Use keyboard Tab/Enter to navigate to a lesson, complete multiple choice, fill, matching and order activities, and check that feedback and focus are understandable.
3. Refresh mid-activity, complete it, close and reopen the browser, and confirm that progress remains.
4. Make an intentional mistake, inspect its explanation, review it, retry the unit quiz and check both results in My progress.
5. Write a draft, reopen it, compare the model and finish its self-review. Confirm the app never presents a machine-generated writing grade.
6. Enable Arabic help and inspect its RTL layout. Toggle dark mode and inspect contrast.
7. Export progress, restore that file after confirming the replacement, and check the restored results and writing draft.
8. Open a direct route such as `/#/lesson/r1` and refresh it. The hash route should work without server rewrite rules.

Deployment success is verified separately by the Sites deployment result. A successful deployment does not replace the real-browser checks above.
