# 2.0.0 — 2026-10-17

- Add name-only student account creation with generated private login codes and a separate teacher account.
- Add server-enforced roles, salted credential hashing, hashed expiring sessions, first-use teacher password change and student code replacement.
- Store learning progress, quiz history and written work in D1 with local offline recovery and revision-conflict handling.
- Replace file-based hand-in in the connected UI with direct submission, live student roster and published teacher feedback.
- Preserve existing GitHub browser progress through explicit account migration.
- Migrate editable browser source from dist/ to web/; add a Vinext Worker backend while keeping GitHub Pages as the frontend URL.
- Verify 36 learning, account-service and DOM/event tests.

# 1.1.0 — 2026-10-17

- Adapt 25 classroom files into 18 study-first lessons across six topic groups, with 108 explained objective questions and 18 teacher-marked written tasks.
- Add study/practice gates, quiz history, targeted review, classroom recommendations and non-duplicating XP.
- Add a working offline student–teacher file exchange with four manual rubric scores, written feedback, validation and marked-answer snapshots.
- Preserve foundation progress and add classroom/teacher drafts to browser storage and backups.
- Add source coverage, Arabic guidance and responsive classroom/teacher interfaces.
- Enable automatic GitHub Pages deployment on main pushes; document public application URLs.
- Expand automated verification to 27 engine and DOM/event tests.

# Changelog

## 1.0.0 — 2026-10-17

- Added four complete skill units with eight lessons and 48 explained questions.
- Added original reading texts, vocabulary cards and guided writing tasks.
- Implemented grading, saved sessions, retry history, focused review and rule-based recommendations.
- Added authentic XP and achievement milestones without duplicate retry rewards.
- Added light/dark themes, optional Arabic explanations and responsive keyboard-accessible UI.
- Added local progress export/restore, storage-error handling and documentation.
- Added automated content, scoring, persistence and application-render checks.
- Prepared static hosting and an optional GitHub Pages workflow.
- Published the private Sites application and created the private `Httxi991/english12` GitHub repository.
- Added automated GitHub checks; kept optional Pages publication manually triggered until Pages is configured.
