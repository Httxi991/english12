# English12 validation — 17 October 2026

## Executed checks

The connected release passes **36 automated tests**, JavaScript syntax checks and the Vinext Worker build.

### Learning regression (27 tests)

- Original foundation inventory: four units, eight lessons, 48 unique questions, two original passages, two writing tasks and 24 vocabulary cards.
- Classroom inventory: 25 mapped sources, 18 lessons, 55 English/Arabic study parts, 108 objective questions and 18 manual tasks.
- Correct answer keys, rejected distractors, study/practice/quiz gates, full completion, partial progress restoration, retries, mistake review and no duplicate XP.
- All four original question controls through LinkeDOM events; complete learning and writing paths, vocabulary controls, themes and backup validation.
- Version-1 progress migration and retained offline exchange protocol regression checks.

### Account service checks (6 tests, real in-memory SQLite schema)

- Name-only registration, duplicate names with separate identities, student login, invalid names and role-forging rejection. Generated codes are not stored in plaintext.
- Unauthenticated access rejection; student access denied to teacher APIs; teacher access denied to student-only records; mandatory initial teacher password change and session invalidation.
- Progress storage across login sessions; account-ID query tampering cannot read another student's progress; stale revisions rejected; student-supplied teacher feedback stripped.
- Direct submission, teacher roster/detail, four-score validation, manual feedback publication and student inbox retrieval. Repeated submission requests are idempotent; grade version conflicts are rejected.
- Replacement student codes invalidate old credentials/sessions while preserving learning records. Logout revokes its session.
- Exact-origin CORS, request-size limits, auth rate limits and hashed rate-limit keys without raw IP storage.

### Connected UI checks (3 tests, LinkeDOM + account service)

- The registration form contains exactly one input (name). Legacy local work is imported only after an explicit choice and preserved in the server record.
- Student creates an account, reads a lesson, answers practice and quiz, writes and directly submits. Teacher signs in, changes the temporary password, sees the student, assigns scores/comments and publishes. A fresh student session on a separate simulated browser retrieves both progress and grade.
- Offline drafts survive reload and sync on reconnection. A concurrent online revision triggers a conflict choice and is not silently overwritten.

## Verification boundary

LinkeDOM does not perform visual layout, mobile rendering, touch or screen-reader QA. The supported Sites browser-preview capability was unavailable, so no alternate preview server/browser path was substituted. Responsive breakpoints, semantic controls, RTL guidance, focus styling and reduced-motion rules are implemented; real-device visual acceptance remains unverified.

Production deployment and database provisioning are checked separately through the Sites result and database tools. Production API smoke checks, when executed, are reported in the delivery message; isolated tests do not substitute for them. Temporary test student records are not inserted into the live teacher roster.

## Real-device follow-up

Open the published app on desktop and phone, create a name-only student account, retain the code, complete a lesson and send a response. Sign in as the teacher, publish feedback, then reopen the student account on another device. Check both themes, Arabic layout, keyboard navigation, online-save indicators and the same result after refresh.
