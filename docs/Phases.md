# ChoiceMirror — Delivery Phases

**Version:** 0.1 · **Prepared:** 2026-11-13
**Hard deadline:** Monday 2026-12-07 at 17:00 EST / 22:00 GMT (Devpost displayed time; verify when submitting).
There are ~24 calendar days after Nov 13. Plan deliberately with a buffer.

## Workflow principles
Each phase produces a demonstrable vertical slice, tests, screenshots or other verifiable evidence, a short merge note and a `Memory.md` update. No phase is considered complete because it has been described.

## Phase 0 — Initiate and align (Nov 13–14)
**Deliverables:** Repository initialized; `README.md`, `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `Memory.md`; first GitHub project issue.
**Exit gate:** Team approves project direction; Devpost eligibility and rubric discrepancies recorded; MVP scope is frozen enough to code.
**Status:** Complete (2026-11-13). Direction accepted for implementation; external event verification remains recorded as an open item.

## Phase 1 — Runnable skeleton + UX shell (Nov 14–17)
**Status:** Complete (2026-11-14).
- Set up pnpm, strict TypeScript, Next.js app and shared contracts.
- Create homepage with fixture selection; comparison view with real loading/empty/error states.
- Add .env.example, gitignore, formatting/lint, minimal CI.
- Create simple benchmark app with two paired flows, seeded reset behaviour.
**Exit gate evidence (2026-11-14):** frozen-lockfile install succeeds; strict typecheck passes workspace-wide; lint passes workspace-wide; 24 unit tests pass across 5 files; 8 Playwright tests pass against ports 3000 and 3001 (keyboard, focus, malformed-ID 404, honest states, fixture index); production builds succeed for both apps. Fresh-clone setup is documented in `README.md`.

## Phase 2 — Browser execution and evidence (Nov 18–22)
**Status:** Complete (2026-11-15).
- Implement Playwright worker with isolated contexts and fixed settings.
- Build event schema: proposed action vs executed action, screenshot checkpoints and result state.
- Implement bounded safe navigation actions, domain allowlist and stop conditions.
- Execute both paths independently from matching state.
**Exit gate:** Tests prove paired flow and reproducible, inspectable traces; no API dependency required yet.
**Exit gate evidence (2026-11-15):** `npx pnpm install --frozen-lockfile` succeeds; strict typecheck passes workspace-wide; lint passes workspace-wide with zero warnings; 77 unit tests pass across 14 files; 21 Playwright tests pass (8 Phase 1 + 6 Phase 2 + 4 runner integration + 3 origin guard) covering all four scenarios completing both goals with documented action counts, equivalent starting conditions, trace ordering, screenshot creation/retrieval (PNG magic bytes verified), invalid and missing inputs, request-layer origin prevention (off-origin subresource, single-hop redirect, and a same-origin-first-hop redirect chain each proven never to reach an external server), single-flight concurrency (one `202` + one `429`), and the full UI run flow; production builds succeed for both apps (`/comparisons/[id]` and all API routes render dynamically). Fresh-clone setup including `pnpm exec playwright install chromium` is documented in `README.md`.

## Phase 3 — Real AI navigation (Nov 23–27)
**Status:** Complete (2026-11-15) — implemented and verified offline against a local mock model; **live inference verified (2026-11-16)**: `pnpm test:live` with real credentials completed **8/8 journeys** (run 2, after a diagnosed output-cap truncation fix — D-022).
- Add one model provider adapter with structured action outputs — `packages/agent` (config/prompt/client/agent): typed-fetch Nebius Token Factory client, constant versioned system prompt, temperature-0 structured JSON `click`/`stop` proposals, bounded retries, error taxonomy, per-journey token budgets.
- Build observation summarization from accessible page state — driver collection → pure `buildObservation` → bounded, redacted, origin-checked `PageObservation` with stable `element-N` ids; raw HTML never reaches the model.
- Apply policy guard before all proposed actions and prevent prompt-injection effects — Zod `actionProposalSchema` → `validateProposal` policy gate before every execution, fixed rejection budget with recorded feedback, and a controlled injection E2E proving injected page text can neither complete the journey nor escape the origin.
- Show actual AI-driven actions clearly and distinguish fallback runs — launcher mode selector (Deterministic | AI (Nebius)), `Mode: AI · <model>` header badge, per-event proposed/validated action chips with model-reported justification, inference-call and token counters, and verbatim 503 "not configured" errors (never a silent fallback).
**Exit gate:** Repeated model-driven journeys complete safely on controlled fixtures; capture model version and failures.
**Exit gate evidence (2026-11-15):** `npx pnpm@12.18.0 install --frozen-lockfile` succeeds; strict typecheck passes workspace-wide; lint passes workspace-wide with zero warnings; 162 unit tests pass across 23 files; 28 Playwright tests pass (21 Phase 1–2 regression + 5 AI-loop + 2 AI-UI) covering all four scenarios × both goals completing from live observations alone with exact event order (navigate → goal-selected → N clicks → complete), `inferenceCalls = N+1`, screenshots ≥ N+3 per journey, plan-field leak canaries, the controlled prompt-injection negative control (bounded 3 inference calls, one rejected proposal, honest failure), blocked origin before any model call, and the UI AI run (`mode: "ai"`, model badge, AI-decisions evidence, rendered screenshots) plus the deterministic run staying explicitly labelled; production builds succeed for both apps; `npx pnpm@12.18.0 test:live` reports `1 skipped` (not run — no `NEBIUS_API_KEY`). **Review-pass evidence (2026-11-16, PR #4):** observation ids bound to exact DOM nodes (element-binding fixture + driver spec, red→green) and the response-body deadline covered by a stalled-body unit test; gates re-run — typecheck ✓, lint ✓ (zero warnings), **163 unit tests (23 files)**, **30 E2E tests (28 + 2 element-binding)**, both builds ✓; **live evaluation with real credentials — run 1 (300-token cap): 7/8 with one `finish_reason=length` truncation, diagnosed and cap raised to 2048 (D-022); run 2: 8/8 journeys completed, 0 errors, 20 inference calls, 11,084 input / 2,804 output tokens, latency 3.1–13.0s (median 3.6s), model `zai-org/GLM-5.3-Flash`.**

## Phase 4 — Compare, explain and polish (Nov 28–Dec 2)
**Status:** Complete (2026-11-17).
- Implement deterministic metrics and evidence-linked findings.
- Build visual side-by-side timeline and screenshot inspector.
- Add accessible design system, clear uncertainty labels and replay/compare only as time permits.
- Test at least three fresh runs on fair and asymmetric examples, log actual outcomes.
**Exit gate:** Usable end-to-end demo supports a specific, defensible story about paired choice friction.
**Exit gate evidence (2026-11-17):** `npx pnpm@12.18.0 install --frozen-lockfile` succeeds; strict typecheck passes workspace-wide; lint passes workspace-wide with zero warnings; **205 unit tests pass across 30 files** (metrics engine, finding copy pins, evidence validation and degradation, selection helpers, WCAG AA contrast); **49 Playwright tests pass** (30 Phase 1–3 regression + 15 dashboard + 4 repeatability); production builds succeed for both apps. The dashboard ships: scenario-name header with status banner and mode badge; a main finding card with observed/calculated/interpreted separated and an **Inspect supporting evidence** action that moves focus to the inspector; metric cards with units and definitions (friction metrics separated from AI execution metadata); teal/violet mirrored Goal A/B tracks in equal desktop columns that stack on mobile, labelled and badged so colour is never the sole carrier; an evidence inspector (real screenshot, step number, timestamp, label, outcome, counted-as-action, model-reported justification block, previous/next stepper, keyboard-operable with focus management); a static methodology panel; and honest states for running, partial/failed, legacy Phase 2 records, corrupt evidence (validation strip, findings withheld), and a failing status poll with retry. Repeatability (three fresh deterministic runs per goal path, printed verbatim by `tests/e2e/repeatability.spec.ts`):
```text
repeatability membership-balanced/join: 3 runs → statuses [completed×3], actions [1,1,1]
repeatability membership-balanced/leave: 3 runs → statuses [completed×3], actions [1,1,1]
repeatability membership-asymmetric/join: 3 runs → statuses [completed×3], actions [1,1,1]
repeatability membership-asymmetric/leave: 3 runs → statuses [completed×3], actions [3,3,3]
repeatability consent-balanced/accept: 3 runs → statuses [completed×3], actions [1,1,1]
repeatability consent-balanced/reject: 3 runs → statuses [completed×3], actions [1,1,1]
repeatability consent-asymmetric/accept: 3 runs → statuses [completed×3], actions [1,1,1]
repeatability consent-asymmetric/reject: 3 runs → statuses [completed×3], actions [3,3,3]
```
Observed result: zero action-count variance across all 8 goal paths (24 runs, all `completed`); catalog `expectedActions` matched every run as validation only. **Honesty note:** these are deterministic-runner repeats. Live-model repeat runs were **not** performed in Phase 4 (no `NEBIUS_API_KEY` available in this environment); the AI path is covered only by mocked-model integration, which is never presented as real-model performance. The exit gate's "defensible story" is the asymmetric headline ("Leaving required 2 more actions than joining") backed by inspectable event/screenshot evidence and explicit limitations — a descriptive measurement, never a manipulation verdict.

**Review-fix evidence (2026-11-17, PR #5 — all four owner findings verified in code, then fixed test-first, red→green):**
1. **Comparative fields gated on matching conditions (blocking).** `computeComparisonMetrics` computes `actionDifference`/`heavierJourney`/`actionRatio` only when both journeys completed with counts **and** `reasons.length === 0`, so `result: "inconclusive"` can no longer coexist with a number (D-029). Per-journey raw counts and the comparability reasons always survive. Evidence: extended mismatched-conditions unit test (asserts nulls + counts 1/3 preserved) and dashboard E2E `mismatched conditions withhold the action difference but keep raw counts` on new seeded fixture `cmp_5eed000000000005` (both journeys completed, seeds differ) — the Action difference card shows `—` + `Not available`, never `2`, while the Journey A/B cards still show 1 and 3.
2. **Degraded reports are always inconclusive (blocking).** `degradeReport` now forces `result: "inconclusive"` and nulls all three comparative fields while keeping journey metrics and conditions (D-029). Evidence: `report.test.ts`'s contradiction assertion (previously asserted `observed-asymmetry` for a degraded report) now asserts inconclusive + nulls + preserved counts + `comparable: true`; dashboard regression test `a degraded report withholds comparative numbers from a parseable detail` on fixture `cmp_5eed000000000007` (a counted action cites a never-stored screenshot → finding validation fails on an otherwise parseable detail that would otherwise show a 2-action difference) — validation strip visible, difference `—`/`Not available`, raw count still 1.
3. **Evidence chips resolve by journey id (blocking).** New pure helper `apps/web/lib/evidence-chips.ts` (`goalLetterByJourneyId` maps journey id → Goal A/B via `comparison.goalIds`; `evidenceChipLabel` labels by that map) with unit tests (out-of-order storage, multi-step labels, honest unknown-journey fallback); `FindingCard` takes the map as a prop and colours the chip by the resolved letter (D-031). Evidence: unit tests + dashboard E2E `an evidence chip names the goal by journey id, not by array position` on fixture `cmp_5eed000000000006` (goal A completed with **zero** counted actions, goal B with one) — the finding's single chip reads `Goal B · steps 2` and no `Goal A · steps …` chip exists; the pre-fix code labelled it `Goal A` by array index.
4. **Counting rule and banner copy (recommended).** One shared predicate `isCountedAction` (`type === "click"` ∧ flag ∧ success) plus `countedActionEvents` (deduplicated by step number) now drives `actionCount`, `citeJourney`, the inspector's "Counted as an action" line, the timeline badge, and the inspect-evidence jump (D-030). Negative unit test: flagged non-clicks, a duplicated counted step, a flagged-out click and a failed click — only the single unique successful click counts (5 → 1), and a findings test proves a flagged navigate event is neither counted nor cited. The completed banner claims complete evidence only when both journeys completed with every screenshot resolving (D-032); the corrupt-fixture E2E now asserts the incomplete copy and that the old claim is absent. Methodology panel and Action-difference card definition updated to state that differences appear only under matching conditions.

Re-run after the fixes: frozen install ✓, typecheck ✓, lint ✓ (zero warnings), **212 unit tests (31 files)**, **52 Playwright tests** (30 Phase 1–3 + 18 dashboard + 4 repeatability), both production builds ✓; the 8 repeatability lines above are unchanged (zero variance). New fixtures are seeded through the same `globalSetup` path (D-025); no production test hooks were added.

## Phase 5 — Validate and submit (Dec 3–7)
**Status:** Complete (2026-11-18) — validation complete; submission awaits owner actions.
- Run regression tests, fix failures, security review, document limitations.
- Capture real screenshots and a 2–4 minute demo.
- Create Devpost write-up with problem, solution, AI implementation, repo and live/local demo access.
- Verify final eligibility, submission format, judging criteria and deadline on official site.
- Submit **before** Dec 7 cutoff, preferably by Dec 6.
**Exit gate:** Submitted project with working demo, reproducible code and required materials.
**Exit gate evidence (2026-11-18):** the validation half of the exit gate is complete with real numbers (branch `feat/phase-5-final-validation`; PR to be opened at plan Task 12):
- **Live inference (real Nebius API, 2026-11-18):** authentication smoke 3/3 passed (endpoint auth HTTP 200, bounded chat completion, Zod-validated structured proposal); eight-journey evaluation **8/8 completed**, 20 inference calls, 13,590 tokens (11,084 input / 2,506 output), journey latency 2,391 / 3,013 / 7,697 ms (min/median/max), 0 errors, single attempt — `docs/submission/LIVE_TEST_RESULTS.md` §4.
- **Live repeatability (opt-in, 2026-11-18):** 4 scenarios × 1 pair × 3 rounds = **12/12 pairs / 24 journeys**, every scenario × goal combination producing an identical action count round over round, `errors: []`, 61 inference calls, 40,619 tokens — `LIVE_TEST_RESULTS.md` §6.
- **Real UI AI runs through the web app:** `cmp_04cbef31ed3a44c7` (membership-asymmetric, join 1 / leave 3, difference 2) and `cmp_dfe25737c0937557` (membership-balanced, 1 / 1), both `mode: "ai"` verified from stored records; UI/UX validation **22/22 spec §8 bullets PASS** on the real running app — `VALIDATION_REPORT.md`.
- **Security & reliability audit:** **30/30 spec §7 bullets VERIFIED**, zero defects, including probe evidence (P1 unit re-run 212/212; P2 service-worker ×2 runs; P3 context isolation) — `SECURITY_REVIEW.md`.
- **Test baseline:** 212 unit tests (31 files), 52 Playwright E2E tests, both production builds — the 2026-11-17 verified baseline re-confirmed credential-free during the audit (P1); the full final gate chain re-run is plan Task 11.
- **Assets & materials:** 7 genuine screenshots + `assets/PROVENANCE.md`; `DEMO_SCRIPT.md` (screen recording honestly unavailable — script-only demo, D-034); `DEVPOST_DRAFT.md` + `SUBMISSION_CHECKLIST.md` (competition facts verified against the official pages 2026-11-18).
- **Not claimed:** the "submitted project" half of the exit gate — nothing is submitted; owner actions O1–O5 (eligibility/team registration, rubric verification with organizers, demo-link and video decisions, final approval) remain open in `SUBMISSION_CHECKLIST.md`.

## Must-have vs cut list
**Must have:** two opposite goals; controlled fair/asymmetric fixture; actual AI navigation; event evidence; deterministic measurements; usable comparison; source and demo.

**First to cut:** live third-party site crawling, user accounts, collaboration, export formats, animation, multi-model comparisons, deployment complexity, extra choices.

## Quality checkpoints
- **Nov 17:** Met early on 2026-11-14: both apps run, all four fixtures are navigable, and automated smoke tests pass.
- **Nov 22:** Two fully traced deterministic browser runs — met early (2026-11-15): all four scenarios execute both goals with stored traces and screenshots.
- **Nov 27:** At least one successful safe AI-driven paired run — met by mock on 2026-11-15: all 8 AI journeys (4 scenarios × 2 goals) completed through the real driver against the local mock model, and the UI AI run finished `mode: "ai"` with labelled evidence; **met by the live model on 2026-11-16: 8/8 journeys completed against the real Nebius API (D-022).**
- **Dec 2:** Evidence-grounded result screen and repeatability report — met early (2026-11-17): dashboard with evidence-linked finding, inspector and methodology panel; 8 repeatability lines with zero variance recorded above.
- **Dec 6:** All presentation assets ready; submission tested — assets met early (2026-11-18): 7 provenance-backed screenshots, demo script, Devpost draft and checklist all ready under `docs/submission/`; the submission itself is prepared but intentionally **not** submitted — it awaits owner approval (O1–O5) ahead of the 2026-12-07 cutoff.

## Current blocker register
- Phase 1–4: no open implementation blockers after the verified exit-gate commands. Phase 5: validation complete (2026-11-18); no implementation blockers.
- Verify participant eligibility: event listing indicates students only, age of majority — **sourced (2026-11-18):** verified competition facts and owner action O1 in `docs/submission/SUBMISSION_CHECKLIST.md` (F2/F3); still open, owner-side.
- Verify competing rubric versions on event page vs rules — **sourced (2026-11-18):** both rubric variants recorded (F6 25/25/20/15/15 vs F7 30/30/20/20); owner action O2 asks the organizers which governs; still open, owner-side.
- ~~Live Nebius credentials~~ **Resolved (2026-11-16):** the live evaluation ran with real credentials — 8/8 journeys completed (D-022); re-used for the Phase 5 live evaluation and repeatability sweep (2026-11-18). A browser-worker host for any hosted demo is still unselected (owner action O3).
- Team assignments not yet confirmed — **sourced:** owner action O1 in `SUBMISSION_CHECKLIST.md`.

## Update convention
Mark each phase `Planned`, `In progress`, `Blocked` or `Complete` with completion date and links to PRs or demo. Record any slippage and new scope in `Memory.md`.
