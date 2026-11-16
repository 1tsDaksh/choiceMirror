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
**Status:** Planned.
- Implement deterministic metrics and evidence-linked findings.
- Build visual side-by-side timeline and screenshot inspector.
- Add accessible design system, clear uncertainty labels and replay/compare only as time permits.
- Test at least three fresh runs on fair and asymmetric examples, log actual outcomes.
**Exit gate:** Usable end-to-end demo supports a specific, defensible story about paired choice friction.

## Phase 5 — Validate and submit (Dec 3–7)
**Status:** Planned.
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
- **Nov 17:** Met early on 2026-11-14: both apps run, all four fixtures are navigable, and automated smoke tests pass.
- **Nov 22:** Two fully traced deterministic browser runs — met early (2026-11-15): all four scenarios execute both goals with stored traces and screenshots.
- **Nov 27:** At least one successful safe AI-driven paired run — met by mock on 2026-11-15: all 8 AI journeys (4 scenarios × 2 goals) completed through the real driver against the local mock model, and the UI AI run finished `mode: "ai"` with labelled evidence; **met by the live model on 2026-11-16: 8/8 journeys completed against the real Nebius API (D-022).**
- **Dec 2:** Evidence-grounded result screen and repeatability report.
- **Dec 6:** All presentation assets ready; submission tested.

## Current blocker register
- Phase 1–2: no open implementation blockers after the verified exit-gate commands.
- Verify participant eligibility: event listing indicates students only, age of majority.
- Verify competing rubric versions on event page vs rules.
- ~~Live Nebius credentials~~ **Resolved (2026-11-16):** the live evaluation ran with real credentials — 8/8 journeys completed (D-022). A browser-worker host for any hosted demo is still unselected.
- Team assignments not yet confirmed.

## Update convention
Mark each phase `Planned`, `In progress`, `Blocked` or `Complete` with completion date and links to PRs or demo. Record any slippage and new scope in `Memory.md`.
