# ChoiceMirror — Living Project Memory

**Last updated:** 2026-11-15 · **Version:** 0.4
**Instruction for contributors/AI assistants:** Read this file at the start of each work session. Update it after each completed phase, design/architecture decision, blocker resolution, or notable change. Keep facts, assumptions and planned work clearly distinct; never rewrite history silently.

## 1. Canonical identity
- **Name:** ChoiceMirror
- **Tagline:** See both sides of the click.
- **Repository:** https://github.com/1tsDaksh/choiceMirror
- **Event:** SLAY HACKS 2026
- **Deadline (Devpost displayed):** 2026-12-07 17:00 EST / 22:00 GMT
- **Current status:** Phase 2 implemented on `feat/phase-2-browser-runner`: deterministic Playwright runner executes both goals of all four scenarios from equivalent starting conditions, structured evidence (ordered events, action counts, screenshots) is stored file-backed and served through Zod-validated APIs, and the UI runs comparisons with live status and evidence panels. AI navigation, metrics, and explanations remain unbuilt (Phases 3–4).
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

## 8. Known unknowns / verification
1. **Eligibility:** public event listing specifies students only and age of majority. Check actual participant status.
2. **Rubric conflict:** event rules give Innovation 25, Technical 25, Impact 20, AI & Responsible Use 15, UX & Presentation 15; public event judging area may show different categories/weights. Confirm governing rubric with organisers. Build to satisfy both.
3. Confirm maximum team size, whether original work during event window is required and any AI/disclosure rules.
4. Model provider, usage caps, hosting and team ownership still undecided.
5. Current repository has a tested Phase 1 foundation plus Phase 2 deterministic browser execution, comparison storage, and screenshot evidence, but no AI navigation, metrics, or explanations; mark later features complete only after tested implementation.

## 9. Immediate next actions
- Open the Phase 2 pull request for review (do not self-merge).
- Resolve event eligibility and rubric.
- Select a model provider and usage cap before Phase 3.
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

## 11. Change log
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
