# ChoiceMirror — Living Project Memory

**Last updated:** 2026-11-15 · **Version:** 0.6
**Instruction for contributors/AI assistants:** Read this file at the start of each work session. Update it after each completed phase, design/architecture decision, blocker resolution, or notable change. Keep facts, assumptions and planned work clearly distinct; never rewrite history silently.

## 1. Canonical identity
- **Name:** ChoiceMirror
- **Tagline:** See both sides of the click.
- **Repository:** https://github.com/1tsDaksh/choiceMirror
- **Event:** SLAY HACKS 2026
- **Deadline (Devpost displayed):** 2026-12-07 17:00 EST / 22:00 GMT
- **Current status:** Phase 3 implemented on `feat/phase-3-ai-navigation`: `packages/agent` (Nebius Token Factory adapter), `runAiJourney` observe → decide → Zod-validate → policy-validate → execute → app-side-completion loop, AI-mode launcher with explicitly labelled evidence (`Mode: AI · <model>`, per-event proposed/validated actions with model-reported justification, token/usage counters, no silent fallback), and an opt-in `test:live` evaluation. Verified offline against a local mock model through the production client path; **live inference unverified** (no `NEBIUS_API_KEY` in this environment). Deterministic Phase 1–2 behavior is unchanged and remains the default. Metrics and explanations remain unbuilt (Phase 4).
- **Tracking:** https://github.com/1tsDaksh/choiceMirror/issues/1

## 2. Core proposition
AI-assisted paired user journeys reveal **observed friction asymmetry** by running opposing tasks from equivalent controlled starting states. Differentiate from screenshot-only scanners through browser actions, auditable evidence, deterministic metrics and careful explanations.

## 3. Confirmed decisions
- Use the user-provided `1tsDaksh/choiceMirror` repository.
- Prepare six root planning files: `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `Memory.md`.
- Focus on a realistic Dec 7 hackathon prototype, not a production-scale service.
- Do not overwrite unrelated repository content.
- Build on original controlled benchmark pages before considering third-party sites.
- Never present synthetic/illustrative results as observed production evidence.

## 4. Proposed technical decisions (not final)
- Strict TypeScript; Next.js/React/Tailwind UI; Playwright; Zod; Vitest; SQLite/local artifact storage.
- Model-provider-neutral structured action planner; single real model adapter selected during implementation.
- Explicit separation of AI actions, browser execution, event logging, deterministic evaluation, and UI.
- Local reliable demo first; browser-capable deployment only when verified.

## 5. In scope
- Controlled benchmark with balanced/asymmetric designs.
- Join vs leave and accept vs reject comparison.
- Clean-context paired browser runs.
- AI-assisted navigation with safe action policy.
- Event trace, screenshot capture, measured metrics and evidence-linked comparison screen.

## 6. Excluded for MVP
Real third-party account actions; purchases; payments; arbitrary public-site crawling; legally definitive dark-pattern labels; complex multi-agent architecture; production-scale authentication and data collection.

## 7. Work completed
| Date | Item | Evidence |
|---|---|---|
| 2026-11-13 | Verified accessible repository and write permissions; repo initially empty | GitHub repository |
| 2026-11-13 | Created original README and project outline on `main` | Initial commit `c18a11249b98873cd2e2c0d5b9840458deda853f` |
| 2026-11-13 | Opened project kickoff checklist | GitHub issue #1 |
| 2026-11-13 | Committed initial specifications and phase plan | Six root Markdown files on main |
| 2026-11-14 | Added strict pnpm/TypeScript workspace and shared Zod scenario contracts | 8 contract/catalog unit tests |
| 2026-11-14 | Added web launcher, comparison states, APIs, and four controlled benchmark fixtures | 5 flow-definition and 2 API unit tests |
| 2026-11-14 | Added two-server Playwright acceptance coverage and CI workflow | 5 E2E tests covering 8 goal paths, reset, keyboard use, 404s, and external requests |
| 2026-11-14 | Verified the Phase 1 exit gate | typecheck, lint, 15 unit tests, 5 E2E tests, and both production builds passed locally |
| 2026-11-14 | Completed review-fix pass: 3 Important and 10 Minor findings fixed test-first, 4 recommendations adopted, 0 minors deferred | fresh run: typecheck, lint, 24 unit tests (5 files), 8 E2E tests, both production builds passed |
| 2026-11-14 | Moved six spec documents into `docs/` and updated all references | `git mv` to `docs/`; README links, `docs/Architecture.md` tree, and plan file paths updated |
| 2026-11-15 | Committed the Phase 2 implementation plan and executed Tasks 1–9 (contracts evidence schemas, flows→`buildJourneyPlan`, `packages/storage`, `packages/browser-runner`, real-browser integration spec, POST/status/artifact APIs, evidence UI, E2E suite) | plan `docs/superpowers/plans/2026-11-14-phase-2-browser-runner.md`; commits `611b112`…`d93e6ce`; live smoke: 3 completed comparisons with 8–10 screenshots each; E2E 17/17 |
| 2026-11-15 | Verified the Phase 2 exit gate | frozen install, typecheck, lint (zero warnings), 68 unit tests (14 files), 17 E2E tests (8 Phase 1 + 5 Phase 2 + 4 integration), both production builds passed |
| 2026-11-15 | Completed the PR #3 review-fix pass: request-layer origin guard (fail-closed interception, hop-by-hop redirect walk, query-free `blocked` evidence) and atomic single-flight start reservation, with prevention and concurrency tests | frozen install, typecheck, lint (zero warnings), 77 unit tests (14 files), 21 E2E tests (incl. 3 origin-guard prevention tests, each proving zero external hits), both production builds passed; pushed to PR #3 for re-review |
| 2026-11-15 | Committed the Phase 3 plan and executed Tasks 1–12: agent contracts/policy (`packages/contracts`), `packages/agent` adapter, observation pipeline + `runAiJourney`, web mode plumbing (503 no-silent-fallback), AI evidence UI, mock-model E2E (8-journey sweep with exact event-order/inference-call/screenshot pins, plan-leak canaries, controlled injection, blocked origin), AI UI E2E, opt-in `test:live`, and docs | plan `docs/superpowers/plans/2026-11-15-phase-3-ai-navigation.md`; frozen install, typecheck, lint (zero warnings), 162 unit tests (23 files), 28 E2E tests (21 Phase 1–2 + 5 ai-loop + 2 ai-web), both production builds passed; `pnpm test:live` → 1 skipped (no key) |

## 8. Known unknowns / verification
1. **Eligibility:** public event listing specifies students only and age of majority. Check actual participant status.
2. **Rubric conflict:** event rules give Innovation 25, Technical 25, Impact 20, AI & Responsible Use 15, UX & Presentation 15; public event judging area may show different categories/weights. Confirm governing rubric with organisers. Build to satisfy both.
3. Confirm maximum team size, whether original work during event window is required and any AI/disclosure rules.
4. Nebius is the selected provider (D-015); live usage cost remains unverified until a real `pnpm test:live` run against a credited account. Hosting and team ownership still undecided.
5. Current repository has a tested Phase 1 foundation, Phase 2 deterministic browser execution with storage and screenshot evidence, and Phase 3 AI navigation verified offline against a local mock model, but no metrics or explanations; mark later features complete only after tested implementation.
6. **Phase 3 outstanding risks:** live Nebius inference is unverified (no `NEBIUS_API_KEY` in this environment) — all AI verification used the local mock model through the production client path; OpenAI `response_format` enforcement is deliberately omitted pending a live check that the endpoint honours it; model-provided justifications are reported, not verified evidence.

## 9. Immediate next actions
- Push `feat/phase-3-ai-navigation`, open the Phase 3 PR, and await owner review — never self-merge.
- Provision `NEBIUS_API_KEY` and run `pnpm test:live` to verify live inference; the DoD live-inference item stays unchecked until real numbers exist.
- Resolve event eligibility and rubric.
- Record each PR and tested milestone here.

## 10. Decision log
| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-001 | 2026-11-13 | Use ChoiceMirror repo as canonical workspace | Explicitly supplied by project owner | Confirmed |
| D-002 | 2026-11-13 | Prioritize paired browser evidence over generic chat | Innovation and demonstrated technical substance | Proposed |
| D-003 | 2026-11-13 | Controlled fixture first | Reliability, safety, realistic delivery | Proposed |
| D-004 | 2026-11-13 | Preserve unknown/failed states visibly | Responsible AI and scientific honesty | Proposed |
| D-005 | 2026-11-14 | Pin TypeScript 6.0.3 | Current typescript-eslint supports TypeScript <6.1 | Confirmed |
| D-006 | 2026-11-14 | Pin ESLint 9.39.5 | Next 16 lint plugins declare support only through ESLint 9 | Confirmed |
| D-007 | 2026-11-14 | Server-render the static launcher catalog | Avoids effect-reachable state updates and keeps the retry API path | Confirmed |
| D-008 | 2026-11-14 | Keep `README.md` at root; move the six spec documents to `docs/` | Owner instruction plus GitHub landing-page convention | Confirmed |
| D-009 | 2026-11-14 | Selecting the initial goal does NOT count as an action | Matches fixture copy "Completed in N actions" and catalog `expectedActions`; recorded as a non-counting `goal-selected` event | Confirmed |
| D-010 | 2026-11-14 | File-backed JSON records + PNG screenshots behind `ComparisonStore` | No database setup for the local MVP; one interface keeps storage swappable (e.g. SQLite later) | Confirmed |
| D-011 | 2026-11-14 | Async `202` + polling status model with a single-flight `429` guard | Browser runs take seconds and must not block the request; one run at a time keeps evidence and browser resources sane | Confirmed |
| D-012 | 2026-11-14 | Injectable driver seam in `browser-runner` | Unit tests stay browser-free; the real Playwright driver is covered by integration/E2E tests | Confirmed |
| D-013 | 2026-11-15 | Origin safety enforced at the request layer: fail-closed `context.route` installed before page creation, exact trusted-origin match, service workers blocked, redirect chains walked hop-by-hop with `route.fetch({maxRedirects:0})`, delivered via `route.continue()` (`route.fulfill()` breaks hydration), violations recorded query-free as `blocked` | PR review requirement: prevent off-origin requests (navigation, subresources, clicks, redirects) before any byte leaves the browser, without leaking query strings into evidence | Confirmed |
| D-014 | 2026-11-15 | Single-flight start guard is an atomic in-process reservation (`tryReserveRun`/`releaseRun`) taken before the first `await` and released on every failure path | Closes the check-then-act race: two concurrent starts must yield exactly one `202` and one `429` | Confirmed |
| D-015 | 2026-11-15 | `packages/agent` uses a typed `fetch` adapter, no provider SDK; base URL configurable via `NEBIUS_BASE_URL` | Zero new runtime dependencies; the exact production client path is verified against a local mock, so CI never needs credentials | Confirmed |
| D-016 | 2026-11-15 | The model receives only the goal description and the bounded `PageObservation` — never `buildJourneyPlan()` action lists or fixture/flow definitions | Forces genuine interface interpretation (e.g. discovering the asymmetric "Leave" route); plan-field leak canaries asserted in E2E | Confirmed |
| D-017 | 2026-11-15 | The app alone determines completion (fixture heading + completion-text check after each executed action); a model `stop` ends the journey as an honest failure; goal selection stays a non-counting `goal-selected` event (D-009 applies to AI) | The model can never declare success, and prompt injection cannot fabricate completion | Confirmed |
| D-018 | 2026-11-15 | Byte-constant system prompt (versioned `phase3-v1`); goal, observation, and rejection feedback travel only in the user message inside a delimited untrusted block; controlled injection E2E proves page text cannot override the goal or origin | Prompt-injection resistance with a reproducible negative control | Confirmed |
| D-019 | 2026-11-15 | Hard AI budgets: 12 decisions and 6 rejected proposals per journey, 50k tokens per journey, 300 output tokens per call, temperature 0, 2 transient retries with backoff, 20s per-call timeout | Bounded cost and bounded failure: no unlimited model calls on any path | Confirmed |
| D-020 | 2026-11-15 | `mode` and per-journey/per-event `ai` evidence fields are optional | Every pre-Phase-3 record still validates; legacy runs display as deterministic | Confirmed |
| D-021 | 2026-11-15 | Live evaluation isolated in `pnpm test:live` (`playwright.live.config.ts`, `tests/live/`), gated on `NEBIUS_LIVE=1` **and** `NEBIUS_API_KEY`, never wired into `test:e2e` or CI | CI and default runs stay credential-free; live numbers can only come from real API calls | Confirmed |

## 11. Change log
- **2026-11-15 v0.6:** Implemented Phase 3 on `feat/phase-3-ai-navigation`: `packages/agent` Nebius adapter (env config, constant versioned system prompt, typed-fetch client with error taxonomy/bounded retries/token budgets, proposal-producing agent), observation pipeline (driver collection → pure `buildObservation` → bounded/redacted `PageObservation` with stable `element-N` ids), `runAiJourney` loop (observe → decide → Zod → `validateProposal` policy → execute → app-side completion), web `mode` plumbing with 503 no-silent-fallback, AI evidence UI (mode badge, AI-decisions section, proposed/validated chips, usage counters), mock-model E2E (8-journey sweep with exact event-order/inference-call/screenshot pins, plan-leak canaries, controlled injection, blocked origin), AI UI E2E, and opt-in `test:live`. Empirical findings: (1) ESM-style `./x.js` relative imports typecheck under Bundler resolution and pass vitest but fail Turbopack (`Module not found`) — the repo convention is extensionless relative imports; (2) with parallel Playwright workers the single-flight `POST /api/comparisons` lock made cross-file runs collide (429) — `workers: 1` added to the E2E config (deferred Phase 2 minor, now demonstrated and fixed). Verified: frozen install, typecheck, lint (zero warnings), 162 unit tests (23 files), 28 E2E tests (21 Phase 1–2 + 5 ai-loop + 2 ai-web), both production builds; `pnpm test:live` → 1 skipped (not run — no `NEBIUS_API_KEY`; live inference unverified).
- **2026-11-15 v0.5:** PR #3 review-fix pass on `feat/phase-2-browser-runner`: (1) request-layer origin guard — fail-closed context interception installed before page creation (exact trusted origin, service workers blocked, hop-by-hop redirect walk, query-free `blocked` evidence) with three prevention E2E tests proving an external server is never contacted; (2) atomic single-flight reservation in the start route (one `202` + one `429` under concurrency, unit + E2E). Empirical finding: `route.fulfill()` on document responses silently breaks Next.js hydration despite byte-identical HTML — delivery must use `route.continue()` after inspection (D-013, D-014). Verified: frozen install, typecheck, lint (zero warnings), 77 unit tests (14 files), 21 E2E tests (8 Phase 1 + 6 Phase 2 + 4 integration + 3 origin guard), both production builds.
- **2026-11-15 v0.4:** Implemented Phase 2 on `feat/phase-2-browser-runner`: deterministic Playwright runner (isolated contexts, domain allowlist, fixed limits, honest failure/timeout/blocked states, guaranteed cleanup), evidence schemas in `contracts`, file-backed `ComparisonStore` in `packages/storage`, Zod-validated start/status/artifact APIs with a single-flight 429 guard, and the evidence UI (enabled run action, live polling status, per-goal panels). Goal selection does not count as an action (D-009). Verified: frozen install, typecheck, lint (zero warnings), 68 unit tests (14 files), 17 E2E tests (8 Phase 1 + 5 Phase 2 + 4 integration), both production builds.
- **2026-11-14 v0.3:** Review-fix pass on `feat/phase-1-foundation` completed (all 3 Important and 10 Minor findings fixed test-first, 4 recommendations adopted, comparison page keeps status 200 with `noindex` per documented Next 16 streaming behavior); relocated `PRD.md`, `Architecture.md`, `Rules.md`, `Design.md`, `Phases.md`, `Memory.md` into `docs/` and updated every reference. Verified: frozen install, typecheck, lint, 24 unit tests, 8 E2E tests, both production builds.
- **2026-11-14 v0.2:** Implemented and verified the Phase 1 vertical slice: workspace, contracts, web launcher, four benchmark fixtures, API boundaries, E2E coverage, CI workflow, and setup documentation.
- **2026-11-13 v0.1:** Initialized repository; committed six planning documents and established product scope, phase gates and decisions.

## 12. Update template
After a meaningful work session, update:
```md
### YYYY-MM-DD — [Change summary]
- Completed (with commit/PR or test evidence):
- Changed decisions:
- Tests run and outcomes:
- Current blockers:
- Next concrete task:
```
Never claim a change was committed without verifying its successful GitHub response.
