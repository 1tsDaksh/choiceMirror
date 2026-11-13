# ChoiceMirror — Delivery Phases

**Version:** 0.1 · **Prepared:** 2026-11-13
**Hard deadline:** Monday 2026-12-07 at 17:00 EST / 22:00 GMT (Devpost displayed time; verify when submitting).
There are ~24 calendar days after Nov 13. Plan deliberately with a buffer.

## Workflow principles
Each phase produces a demonstrable vertical slice, tests, screenshots or other verifiable evidence, a short merge note and a `Memory.md` update. No phase is considered complete because it has been described.

## Phase 0 — Initiate and align (Nov 13–14)
**Deliverables:** Repository initialized; `README.md`, `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `Memory.md`; first GitHub project issue.
**Exit gate:** Team approves project direction; Devpost eligibility and rubric discrepancies recorded; MVP scope is frozen enough to code.
**Status:** In progress.

## Phase 1 — Runnable skeleton + UX shell (Nov 14–17)
- Set up pnpm, strict TypeScript, Next.js app and shared contracts.
- Create homepage with fixture selection; comparison view with real loading/empty/error states.
- Add .env.example, gitignore, formatting/lint, minimal CI.
- Create simple benchmark app with two paired flows, seeded reset behaviour.
**Exit gate:** Fresh clone starts locally; both controlled paths can be explored manually; basic smoke tests pass.

## Phase 2 — Browser execution and evidence (Nov 18–22)
- Implement Playwright worker with isolated contexts and fixed settings.
- Build event schema: proposed action vs executed action, screenshot checkpoints and result state.
- Implement bounded safe navigation actions, domain allowlist and stop conditions.
- Execute both paths independently from matching state.
**Exit gate:** Tests prove paired flow and reproducible, inspectable traces; no API dependency required yet.

## Phase 3 — Real AI navigation (Nov 23–27)
- Add one model provider adapter with structured action outputs.
- Build observation summarization from accessible page state.
- Apply policy guard before all proposed actions and prevent prompt-injection effects.
- Show actual AI-driven actions clearly and distinguish fallback runs.
**Exit gate:** Repeated model-driven journeys complete safely on controlled fixtures; capture model version and failures.

## Phase 4 — Compare, explain and polish (Nov 28–Dec 2)
- Implement deterministic metrics and evidence-linked findings.
- Build visual side-by-side timeline and screenshot inspector.
- Add accessible design system, clear uncertainty labels and replay/compare only as time permits.
- Test at least three fresh runs on fair and asymmetric examples, log actual outcomes.
**Exit gate:** Usable end-to-end demo supports a specific, defensible story about paired choice friction.

## Phase 5 — Validate and submit (Dec 3–7)
- Run regression tests, fix failures, security review, document limitations.
- Capture real screenshots and a 2–4 minute demo.
- Create Devpost write-up with problem, solution, AI implementation, repo and live/local demo access.
- Verify final eligibility, submission format, judging criteria and deadline on official site.
- Submit **before** Dec 7 cutoff, preferably by Dec 6.
**Exit gate:** Submitted project with working demo, reproducible code and required materials.

## Must-have vs cut list
**Must have:** two opposite goals; controlled fair/asymmetric fixture; actual AI navigation; event evidence; deterministic measurements; usable comparison; source and demo.

**First to cut:** live third-party site crawling, user accounts, collaboration, export formats, animation, multi-model comparisons, deployment complexity, extra choices.

## Quality checkpoints
- **Nov 17:** App runs and benchmark fixtures are navigable.
- **Nov 22:** Two fully traced deterministic browser runs.
- **Nov 27:** At least one successful safe AI-driven paired run.
- **Dec 2:** Evidence-grounded result screen and repeatability report.
- **Dec 6:** All presentation assets ready; submission tested.

## Current blocker register
- Verify participant eligibility: event listing indicates students only, age of majority.
- Verify competing rubric versions on event page vs rules.
- Model credentials, API budget and browser-worker host not yet selected.
- Team assignments not yet confirmed.

## Update convention
Mark each phase `Planned`, `In progress`, `Blocked` or `Complete` with completion date and links to PRs or demo. Record any slippage and new scope in `Memory.md`.
