# Phase 5: Final Validation, Live AI Testing & Submission Preparation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the merged Phases 1–4 application works with genuine Nebius inference (standalone evaluation, real UI runs, bounded live repeatability), audit and harden security/reliability/UI, and produce honest demo + Devpost materials and docs so the project is ready for independent review and owner-approved submission.

**Architecture:** No architectural change. Validation runs drive existing surfaces only: the opt-in Playwright live suite (`tests/live/`), the real web UI via dev servers, and a new opt-in repeatability spec beside the existing live suite. Deliverables are documentation under `docs/submission/`, doc updates, and TDD fixes only for defects the audits genuinely find.

**Tech Stack:** TypeScript (strict), pnpm workspace, Playwright (chromium; live config `playwright.live.config.ts`), Vitest, Next.js 16, Zod — unchanged. Nebius Token Factory via the existing `@choicemirror/agent` adapter only.

**Spec:** `docs/superpowers/specs/2026-11-18-phase-5-final-validation.md` (owner's Phase 5 instructions, verbatim). Plan argues from the spec; read both.

## Global Constraints

- Phase 5 scope ONLY: no new model providers, no third-party sites, no auth/payments, no new infra, no unrelated features, no broad architectural rewrites (spec §2).
- Branch `feat/phase-5-final-validation` (exists, off `main` @ `0923fda`); commits in logical increments; PR targets `main`; **never self-merge; never submit to Devpost or publish anything externally without the owner's explicit approval** (spec §14, §11).
- Credentials: `NEBIUS_API_KEY` lives only in gitignored `apps/web/.env.local` (`.gitignore:14`). For Playwright live runs it is injected into the process environment by reading the file into a PowerShell variable — **never printed, never echoed, never committed, never in logs/screenshots/videos/PR bodies/`.env.example`/`NEXT_PUBLIC_*`**. The key previously pasted in chat is treated as compromised; only the owner-configured value is used (spec §1).
- No fabricated results: every reported number comes from a run that actually happened; failures stay in the record; a retry is a separate attempt; fixture expectations (join 1 / leave 3 / difference 2) are validation-only and never presented as measured unless genuinely observed; no confidence intervals unless data supports them (spec §4.3, §5, §6; Rules §4).
- AI mode must never silently fall back to deterministic on failure; a failed AI run is recorded as failed (spec §5, D-028).
- Evidence invariants unchanged: `isCountedAction` counting (D-030), comparative fields gated on matching conditions (D-029), chips by journey id (D-031), conditional banner (D-032), verdict-language ban, `Not available` over `0`.
- Safety scope unchanged: controlled benchmark origin only (`BENCHMARK_ORIGIN`, default `http://localhost:3001`); budgets unchanged (12 decisions, 6 rejections, 50k tokens/journey, 20 s timeout, 2 048 output tokens); model output bounded and labelled model-reported.
- Repo conventions: extensionless relative imports; colocated `*.test.ts`; `test:unit`/`test:e2e` stay credential-free; live inference only through the guarded live config (D-021); revert `next-env.d.ts` flips before every commit, never commit them; `data/` and `.env.local` stay gitignored.
- Gates before PR (all exit 0): `npx pnpm@12.18.0 install --frozen-lockfile` → `pnpm exec playwright install chromium` → `pnpm typecheck` → `pnpm lint` → `pnpm test:unit` → `pnpm test:e2e` → `pnpm build`, plus `pnpm test:live` with credentials (spec §12). Record actual pass/fail/skip counts.
- Design/copy standards unchanged (Design.md tokens; screenshots must not show keys, headers, or private data — spec §9).

## Review Focus

1. **Credential leak into committed artifacts** (env files, docs, screenshots, videos, PR text). Expected: zero occurrences of the key or a live-looking token in any tracked file or asset. Pin: pre-commit check step in Task 9 and Task 11 — `git grep -I "NEBIUS_API_KEY=." -- ':!.env.example'` shows only docs/code references without values, `git status` never lists `apps/web/.env.local`, and every asset under `docs/submission/assets/` is eyeballed/scanned for token-like strings (`v1.`, `Bearer`) before commit.
2. **UI AI run silently degrading to deterministic.** Expected: every §5 UI run stores `mode:"ai"`, the `Mode: AI · <model>` badge, per-event `ai` evidence and journey `ai` summary; a failed AI run surfaces the server's explicit error, never a deterministic result. Pin: VALIDATION_REPORT step asserts `mode` + AI evidence fields in the stored record of each UI run; if the check fails it is a defect → TDD fix (Task 5).
3. **Live repeatability suite accidentally spending credits in normal runs.** Expected: plain `pnpm test:live` and all CI paths never execute the repeatability test. Pin: guard step in Task 3 — run the suite without `NEBIUS_LIVE_REPEAT=1` and observe the repeatability test reported `skipped` with zero network before committing the file.
4. **A failed live journey rendering comparative numbers.** Expected: D-029/D-032 keep any failed live run's dashboard inconclusive with `—`/`Not available`. Pin: seeded E2E already covers this (cite `mismatched conditions…` / `a degraded report…` tests in SECURITY_REVIEW); add a real-UI observation to VALIDATION_REPORT if a live run fails during §5/§6.
5. **Expected counts laundered into results.** Expected: LIVE_TEST_RESULTS lists actual vs expected counts per journey with variance visible; a run with actual ≠ expected is reported as-is. Pin: the results-doc review step in Task 1 checks every row has both columns and the aggregate counts only actual completions.

---

### Task 1: Record live inference verification (§4)

**Files:**
- Create: `docs/submission/LIVE_TEST_RESULTS.md`
- Reference (already executed, never committed): throwaway smoke through `packages/agent` (deleted 2026-11-18)

**Interfaces:**
- Consumes: `pnpm test:live` JSON summary lines (`[live-eval] {...}` printed by `tests/live/ai-eval.spec.ts` `afterAll`, present even on failure).
- Produces: `LIVE_TEST_RESULTS.md` with sections: §4.1 smoke evidence, §4.2 per-journey table, aggregate table, failure classifications, honest "not measured" notes. Later tasks (6–9) cite it.

- [x] **Step 1: Auth smoke through the existing adapter (§4.1) — EXECUTED 2026-11-18.** Throwaway `packages/agent/src/smoke-live.test.ts` (deleted after the run, never committed): `GET {baseUrl}/models` → HTTP 200, catalog 24, `zai-org/GLM-5.3-Flash` listed (186 ms); `createNebiusClient(...).chat(...)` → `{"ok":true}` parsed, 612 ms, 1 call, 39 in / 35 out / 74 total tokens; `createNebiusAgent(...).decide(...)` → Zod-validated `action=click`, 1 030 ms, 1 call, 333 in / 105 out tokens, 0 model errors, `promptVersion=phase3-v1`. No 401/402/404/429/timeout/truncation/malformed-body. Record all of the above verbatim in the doc.
- [x] **Step 2: Run the 8-journey evaluation — EXECUTED 2026-11-18, GREEN (exit 0, 8/8 completed, 0 errors).** From repo root with the key injected without printing:
  ```powershell
  $key = (([System.IO.File]::ReadAllText('apps/web/.env.local') -split "\r?\n" | Where-Object { $_ -match '^\s*NEBIUS_API_KEY=' } | Select-Object -First 1) -split '=', 2)[1].Trim()
  $env:NEBIUS_API_KEY = $key; $env:NEBIUS_LIVE = "1"
  npx pnpm@12.18.0 test:live   # finally: Remove-Item Env:NEBIUS_API_KEY, Env:NEBIUS_LIVE
  ```
  Expected: exit 0; list reporter shows the benchmark webServer on :3001; `[live-eval]` JSON summary printed with `journeys: 8` and every row `inferenceCalls >= 1`. Budget: test timeout 600 s.
  Actual (2026-11-18): exit 0 (`LIVE_EXIT=0`), `1 passed (37.3s)`, test body 32.2 s, webServer `next dev -p 3001`, retries 0. `[live-eval]` → `journeys: 8, completed: 8, successRate: 1, totalInferenceCalls: 20, totalInputTokens: 11084, totalOutputTokens: 2506, latencyMs min 2391 / median 3013 / max 7697, errors: []`; every row `inferenceCalls >= 1` (2–4); all action counts matched fixtures (1/1 balanced, 1/3 asymmetric, both kinds). Transcribed into `docs/submission/LIVE_TEST_RESULTS.md`.
- [x] **Step 3: Build `LIVE_TEST_RESULTS.md` from the actual output — DONE 2026-11-18.** Per-journey rows: scenario, goal, model id (`zai-org/GLM-5.3-Flash`), status, actionCount, expected count (validation column), inferenceCalls, input/output tokens, latencyMs, errors. Aggregate: completed/attempted, success rate, total calls, total tokens, median latency (suite computes it), failure classification list (`auth|credits|model-unavailable|rate-limit|timeout|network|malformed|budget|api|assertion`), cost estimate **only** if provider pricing is verified — otherwise write "pricing not verified; cost not estimated". Every number copied from real output; if a journey failed, investigate (Task 5 loop) and record both attempts. *(Doc written with all of the above; `latencyMs` labelled as wall-clock journey duration per the suite's `Date.now()` instrumentation; §5/§6 sections left as explicit pending placeholders for Tasks 2–3.)*
- [x] **Step 4: Self-check against Review Focus 5 — DONE 2026-11-18.** Both `actual` and `expected` columns present per row; aggregate counts only `completed`; no fabricated rows; failure-classification sweep lists all ten classes as none-observed; cost honestly "not estimated". Commit with the doc materials (folded into the Phase 5 docs increment with spec + plan):
  ```bash
  git add docs/submission/LIVE_TEST_RESULTS.md
  git commit -m "docs(submission): record live Nebius verification results"
  ```

---

### Task 2: Real UI end-to-end AI comparisons (§5)

**Files:**
- Create: `docs/submission/ui-runs.md` (working log; folded into VALIDATION_REPORT in Task 9)
- Possibly modify: code only if a defect is found → Task 5

**Interfaces:**
- Consumes: dev servers (`pnpm dev` → :3000 web, :3001 benchmark), existing browser tooling (OpenCode browser tools or a throwaway Playwright driver script), stored records under `data/` (D-024/D-025).
- Produces: per-run evidence entries {run id, scenario, mode, statuses, counts actual vs expected, findings headline, ai evidence present yes/no}; screenshots candidates for Task 7.

- [ ] **Step 1: Start both apps.** `npx pnpm@12.18.0 dev` (background). Expected: `http://localhost:3000` launcher, `http://localhost:3001` benchmark, both HTTP 200. Keep the process for Tasks 2, 6, 7, 8.
- [ ] **Step 2: Membership-asymmetric run in AI (Nebius) mode via the UI.** Open :3000, select the launcher card/radio labelled **`Join vs leave — asymmetric`** (scenario id `membership-asymmetric`), select **AI (Nebius)** mode, click **Run comparison**. Expected: run reaches `completed` for both goals; stored record `mode:"ai"`; server log shows real `/chat/completions` traffic (or journey `ai.inferenceCalls >= 1`); dashboard shows `Mode: AI · zai-org/GLM-5.3-Flash`. If AI fails: record the explicit server error verbatim — do **not** re-run in deterministic mode; a retry is recorded as a separate attempt.
- [ ] **Step 3: Verify dashboard evidence for the asymmetric run.** Expected (fixture validation, not forced): Join = 1, Leave = 3, Action difference = 2 shown **only if** both journeys completed with matching conditions; main finding headline matches the counts; journey timelines show real screenshots; inspector opens a real stored screenshot; AI-justification chips present. Record actual values; if actual ≠ expected, record the actual and note the variance.
- [ ] **Step 4: Repeat the flow for the balanced membership scenario in AI mode.** Expected: both journeys completed; equal counted actions (no asymmetric headline; finding reads balanced/inconclusive honestly). Record actual counts.
- [ ] **Step 5: Append both runs to `ui-runs.md`** with run ids, timestamps, statuses, counts, `mode` + AI-evidence confirmation (Review Focus 2), and any anomaly. No commit yet (folds into docs commit).

---

### Task 3: Bounded live repeatability (§6)

**Files:**
- Create: `tests/live/repeatability.spec.ts`
- Test: guard-run (no env) + real run (env)

**Interfaces:**
- Consumes: `runAiJourney` from `@choicemirror/browser-runner`, `createNebiusAgent`/`nebiusConfigFromEnv` from `@choicemirror/agent`, `scenarios` from `@choicemirror/contracts` — same shapes as `tests/live/ai-eval.spec.ts` (copy its per-journey loop, fresh agent per journey, `comparisonId: "cmp_0123456789abcdee"`, seed `"phase-5"`).
- Produces: suite constant `REPEAT_ROUNDS = 3`; per-pair records `{scenarioId, round, goalA/B: {status, actionCount, inferenceCalls, inputTokens, outputTokens, latencyMs, error?}}`; afterAll JSON summary `[live-repeat] {...}` with `{pairsAttempted, pairsCompleted, journeysCompleted, actionCountConsistency: per scenario×goal → unique action counts, totalInferenceCalls, totalTokens, latencyMs min/median/max, errors[]}`.

- [ ] **Step 1: Write the failing guard test first (TDD).** Create `tests/live/repeatability.spec.ts` with the guard **before** the body:
  ```ts
  const repeat =
    process.env.NEBIUS_LIVE === "1" &&
    process.env.NEBIUS_LIVE_REPEAT === "1" &&
    Boolean(process.env.NEBIUS_API_KEY?.trim());
  test.describe("live nebius repeatability", () => {
    test.skip(!repeat, "Set NEBIUS_LIVE=1, NEBIUS_LIVE_REPEAT=1 and NEBIUS_API_KEY to run live repeatability.");
    // ... test body placeholder that fails if ever run without the loop
  });
  ```
  Expected (RED): without any env, `npx playwright test --config playwright.live.config.ts --grep repeatability` → reported `skipped`, exit 0, **zero** network calls, and plain `npx pnpm@12.18.0 test:live` reports it `skipped` alongside the 8-journey test (Review Focus 3).
- [ ] **Step 2: Implement the pair loop.** For each `scenario` in `scenarios`, round `1..3`: run both goals sequentially via `runAiJourney` (fresh browser context per journey is the runner's own behaviour), fresh `createNebiusAgent(config)` per journey; collect per-pair records exactly as the Interfaces block states; `test.setTimeout(1_800_000)` (30 min cap: 24 journeys × ≤60 s + overhead). `afterAll` prints `[live-repeat] ${JSON.stringify(summary, null, 2)}` even when the test fails, mirroring `ai-eval.spec.ts`.
- [ ] **Step 3: Typecheck + lint.** `npx pnpm@12.18.0 typecheck && npx pnpm@12.18.0 lint` → exit 0 (zero warnings).
- [ ] **Step 4: Real run within budget.** Inject key as in Task 1 Step 2 plus `$env:NEBIUS_LIVE_REPEAT = "1"`, then `npx playwright test --config playwright.live.config.ts --grep repeatability`. Expected: JSON summary with actual attempted/completed counts. **If budget or time prevents 12 pairs, stop at a justified point and record the actual number attempted — never report the target as done** (spec §6).
- [ ] **Step 5: Record results.** Append `[live-repeat]` summary verbatim + a variation narrative (action-count consistency per goal across rounds, error list) to `LIVE_TEST_RESULTS.md` §6. Commit:
  ```bash
  git add tests/live/repeatability.spec.ts docs/submission/LIVE_TEST_RESULTS.md
  git commit -m "test(live): opt-in bounded Nebius repeatability suite and results"
  ```

---

### Task 4: Security & reliability audit (§7)

**Files:**
- Create: `docs/submission/SECURITY_REVIEW.md`
- Modify: code only for genuine defects → Task 5

**Interfaces:**
- Consumes: existing test evidence (below) + code inspection targets (`packages/browser-runner` request interception/allowlist/service-worker/context isolation/cleanup/limits, `packages/agent` prompt+client bounds, `apps/web/app/api/comparisons` single-flight + validation, `packages/metrics` evidence validation, `packages/storage` corrupt-file handling).
- Produces: SECURITY_REVIEW.md with one verdict row per spec §7 bullet: `VERIFIED (evidence: <test name or code path>)` | `DEFECT (→ Task 5 fix #N)` | `NOT APPLICABLE (reason)`.

- [ ] **Step 1: Map each spec §7 bullet to existing evidence.** Known citable coverage: origin/redirect/subresource blocking → `tests/e2e/origin-guard.spec.ts`; blocked-before-model-call + plan-leak canaries + controlled prompt injection + bounded budgets → `tests/e2e/ai-loop.spec.ts` + `packages/agent` tests; credentials server-side → `packages/agent/src/config.ts` + `prompt.test.ts` key-in-prompt negative + `NEXT_PUBLIC_` absence; action validity → `actionProposalSchema` + `validateProposal` policy tests; single-flight concurrency → `tests/e2e/phase-2.spec.ts` (one 202/one 429); corrupt/missing files → corrupt-fixture E2E + `buildComparisonReport` units; finding-reference integrity → `evidence-validation.test.ts` + degradation tests; counting invariants → `journey-metrics.test.ts` negatives + D-030 tests; comparative gating → D-029 tests; cleanup after failure → runner finally-paths (cite tests or code). Write the full row table; where no evidence exists, probe it (Step 2).
- [ ] **Step 2: Probe uncovered bullets.** For rows without test evidence, verify by targeted inspection or a one-off probe (throwaway, not committed): service-worker restriction setting, context isolation (two runs share no state), action/journey limit enforcement code path, browser cleanup on thrown runner errors, error-state rendering (seeded fixtures `cmp_5eed000000000004/007`), model-output bounds (`MAX_REASON_CHARS`, `recordError` slice 500, ≤10 errors), failure-not-success mapping (`STATUS_OUTCOMES`, 503 no-fallback).
- [ ] **Step 3: Record every genuine defect as a numbered finding** with repro + severity; none → explicitly state "no defects found; N probes run".
- [ ] **Step 4: Fix each finding via Task 5's TDD loop** (a finding without a fix + regression test stays open and is reported as an unresolved defect — never hidden).
- [ ] **Step 5: Commit audit + any fixes separately.**
  ```bash
  git add docs/submission/SECURITY_REVIEW.md && git commit -m "docs(submission): security and reliability audit findings"
  # fixes, if any, each: git commit -m "fix(<area>): <finding> (test first)"
  ```

---

### Task 5: TDD fix loop (only for genuine defects from Tasks 2–4, 6)

**Files:** per defect (its source file + colocated `*.test.ts`)

**Interfaces:**
- Consumes: a numbered finding from Task 4/2/6 with repro steps.
- Produces: green regression test + minimal fix + decision record in Memory.md if the fix changes documented behaviour (D-033+ numbering continues).

- [ ] **Step 1: Write the failing regression test** that reproduces the defect exactly (test name states the behaviour, e.g. `"<component> keeps <expected> when <defect condition>"`).
- [ ] **Step 2: Run it and watch it FAIL for the right reason** (RED) — record the assertion output.
- [ ] **Step 3: Minimal fix** (no rewrites, no drive-by refactors; Global Constraints hold).
- [ ] **Step 4: Test green + affected suites:** run the file, then `npx pnpm@12.18.0 typecheck && npx pnpm@12.18.0 lint && npx vitest run` → all exit 0.
- [ ] **Step 5: Commit per fix:** `git commit -m "fix(<area>): <defect> with regression test"`.

---

### Task 6: UI/UX quality assurance (§8)

**Files:**
- Create: `docs/submission/VALIDATION_REPORT.md`
- Modify: code only for genuine usability defects → Task 5

**Interfaces:**
- Consumes: dev servers (Task 2), real runs from Task 2, browser tooling (OpenCode browser tools for interactive checks; viewport/keyboard/reduced-motion checks via browser tool or a throwaway Playwright script).
- Produces: VALIDATION_REPORT.md §UI with a verdict table for every spec §8 bullet (homepage comprehension items, dashboard items, accessibility items) → `PASS (how verified)` | `FAIL (→ fix #N)` | `NOTE`.

- [ ] **Step 1: Homepage pass.** Load :3000; verify the five comprehension bullets are answerable from visible copy (tagline/hero, why opposing journeys, scenario cards, mode selector, Run CTA); record PASS/FAIL per bullet with the exact visible text quoted.
- [ ] **Step 2: Dashboard pass.** On a real completed AI run (Task 2): nine spec bullets — clear name/goals, prominent finding, correct counts, readable mirrored layout, linked evidence, event→screenshot selection, model labelling, visible limitations, honest unknown/failed states (exercise a seeded failure fixture for the last one).
- [ ] **Step 3: Accessibility/responsiveness pass.** Desktop (≥1280) and mobile (390×844) layouts; keyboard-only journey (tab order, run activation, timeline selection, inspector stepper); visible focus on every interactive element; screenshot alt/description presence; contrast (cite `apps/web/lib/contrast.test.ts` pins + spot-check rendered pairs); `prefers-reduced-motion` (browser emulation) leaves no motion-dependent content; heading hierarchy + tabular numerals legible. Record each verdict.
- [ ] **Step 4: Fix genuine usability defects only** (Task 5 loop for code defects; cosmetic-only observations go in the report as notes, not changes — spec §8 prioritises demonstrable problems).
- [ ] **Step 5: Commit** report (+ fixes): `git commit -m "docs(submission): UI/UX validation report"`.

---

### Task 7: Capture genuine demonstration assets (§9)

**Files:**
- Create: `docs/submission/assets/01-homepage-launcher.png` … `07-finding-limitations.png`
- Create: `docs/submission/assets/PROVENANCE.md`

**Interfaces:**
- Consumes: completed real runs (Task 2) still stored in `data/`; dev servers running.
- Produces: 7 PNGs (full-page where sensible) + PROVENANCE.md mapping each file → {run id, scenario, mode, date, how captured}.

- [ ] **Step 1: Capture the 7 required shots from the live app** (Playwright one-off script using `page.screenshot({ path: 'docs/submission/assets/NN-name.png', fullPage: true })`, chromium, viewport 1280×820; mobile shot at 390×844): (1) homepage + scenario selection, (2) AI mode selected before run, (3) completed asymmetric comparison dashboard, (4) completed balanced comparison dashboard, (5) mirrored journey timelines mid-page, (6) evidence inspector showing a real stored screenshot, (7) finding card with limitations expanded. Only real runs — no fabricated/illustrative pages.
- [ ] **Step 2: Credential/PII sweep of every asset** (Review Focus 1): open each PNG; assert no token-like strings, no `Bearer`, no key material, no personal data; write the sweep result into PROVENANCE.md. Any hit → recapture, never edit-by-hiding.
- [ ] **Step 3: Write `PROVENANCE.md`** with the mapping table. Commit:
  ```bash
  git add docs/submission/assets && git commit -m "docs(submission): genuine demo screenshots with provenance"
  ```

---

### Task 8: Demo script and recording attempt (§10)

**Files:**
- Create: `docs/submission/DEMO_SCRIPT.md`
- Optional: `docs/submission/assets/demo-recording.webm` (only if recording genuinely succeeds)

**Interfaces:**
- Consumes: assets from Task 7, real runs from Task 2.
- Produces: DEMO_SCRIPT.md with the spec's exact 7-segment timing skeleton (0:00–0:25 … 3:40–4:00), per-segment narration text, on-screen shot references (asset filenames / live actions), and a **Recording status** line stating the truth: recorded with path X, or "screen recording not available in this environment — narration, timing, shot list provided" (spec §10 forbids pretending).

- [ ] **Step 1: Attempt a genuine recording.** Throwaway Playwright script with `contextOptions.recordVideo` driving the real flow (homepage → AI membership-asymmetric run → dashboard → inspector), saving to a temp dir; convert/keep as `docs/submission/assets/demo-recording.webm` if produced and credential-free (re-check frames per Review Focus 1; segment length ~2–4 min). If video capture fails or is unusable → record "unavailable" honestly and continue.
- [ ] **Step 2: Write `DEMO_SCRIPT.md`.** Full narration per the spec skeleton, tying each segment to real evidence (run ids, asset files, the actual recorded numbers from Task 1/3 — never anticipated ones); include the responsible-AI segment bullets verbatim-in-spirit (Nebius, Playwright, Zod, deterministic metrics, origin restrictions, evidence integrity) and the closing (UX research/accessibility auditing uses); add the banned-claims reminder (no malicious-intent/legal conclusions).
- [ ] **Step 3: Commit:** `git commit -m "docs(submission): demo script and recording status"`.

---

### Task 9: Devpost materials (§11)

**Files:**
- Create: `docs/submission/DEVPOST_DRAFT.md`
- Create: `docs/submission/SUBMISSION_CHECKLIST.md`

**Interfaces:**
- Consumes: Devpost verification already performed 2026-11-18 via official pages (`https://slayy-hacks.devpost.com/` + `/rules`); results recorded in this task.
- Produces: submission-ready copy + a checklist of verified requirements with sources and owner actions.

- [ ] **Step 1: Write `SUBMISSION_CHECKLIST.md` with the verified facts** (source: official pages, fetched 2026-11-18): deadline **2026-12-07 17:00 EST / 22:00 GMT** (JSON-LD `endDate 2026-12-07T17:00:00-05:00`); eligibility students-only, above age of majority, companies excluded, all countries w/ standard exceptions; individual or team, no numeric team cap published (Devpost registration governs); development window Nov 7–Dec 7, 2026 (original work); submission fields (name/overview, problem+solution, AI implementation, working demo link + access instructions, screenshots, source repo + setup docs, recommended 2–4 min video); **rubric discrepancy confirmed**: rules §9 + event page "How Projects Will Be Evaluated" = Innovation 25 / Technical 25 / Impact 20 / AI+Responsible 15 / UX+Presentation 15, while event page "Judging Criteria" block = Innovation 30 / Technical 30 / Design+UX 20 / Presentation+Impact 20 → prepare for both, note for organizers; prize-pool discrepancy noted ($5 000 rules vs $4 500 event page/JSON-LD); judging Dec 8–14, winners Dec 16; third-party libs/AI disclosed (README attribution). Owner actions listed as unchecked boxes (register/confirm eligibility & team, verify rubric with organizers, final submit approval — **no external submission without owner sign-off**).
- [ ] **Step 2: Write `DEVPOST_DRAFT.md`** — polished copy using the spec's §11 field list verbatim-in-structure (Project name, Tagline, Problem, Solution, How it works, Technology, What makes it different, Responsible AI, Challenges, Accomplishments — implemented-and-verified features only, tied to Tasks 1–3/6 evidence; Future improvements clearly separated; Limitations: controlled benchmarks only, no intent/legal claims). Every accomplishment claim must cite a verified artefact (test counts, live results, assets); no claim of completed submission.
- [ ] **Step 3: Credential sweep (Review Focus 1):** `git grep -I -E "v1\.[A-Za-z0-9_-]{20,}|Bearer " -- docs/submission README.md` → only expected non-secret hits (write the command output into the checklist's evidence line). Commit both files.

---

### Task 10: Documentation updates (§13)

**Files:**
- Modify: `README.md`, `docs/Phases.md`, `docs/Memory.md`, `docs/Architecture.md` (only if Task 4/5 changed described behaviour), `docs/Rules.md`/`docs/Design.md` only if changed

**Interfaces:**
- Consumes: all evidence from Tasks 1–9.
- Produces: updated status/docs + Memory decisions (continue **D-033**+, e.g. live-repeatability opt-in flag, any audit/fix decisions) and a `v0.8` changelog entry; Phases.md Phase 5 `Status: Complete (date)` + exit-gate evidence paragraph with real counts; blocker register updated (eligibility/team/rubric-verify items now sourced or still open).

- [ ] **Step 1: README** — status paragraph → Phase 5 validated with live inference; test-count lines updated to final numbers; live-run instructions (env injection note for `test:live`); link `docs/submission/` materials; limitations updated with live-repeatability actuals.
- [ ] **Step 2: Phases.md** — Phase 5 status + exit-gate evidence (real command outputs, live results summary, assets list, PR link); quality checkpoint `Dec 6` updated with actual dates.
- [ ] **Step 3: Memory.md** — new decision rows (D-033+; every genuine finding/decision from Tasks 3–8), work-completed rows (live verification, UI runs, repeatability, audits, assets, materials) with dates and evidence links, changelog `v0.8`, next actions (owner: rubric verification, eligibility/team, final approval + submission).
- [ ] **Step 4: Architecture.md** — only if audits/fixes changed documented behaviour (likely: add live-repeatability suite line beside the existing live-evaluation line).
- [ ] **Step 5: Commit docs:** `git commit -m "docs: phase 5 validation, live results and submission readiness"`.

---

### Task 11: Final validation (§12)

**Files:** none (verification only); fix anything red via Task 5 first.

- [ ] **Step 1: Full chain, fresh, from the repo root:**
  ```powershell
  npx pnpm@12.18.0 install --frozen-lockfile
  npx pnpm@12.18.0 exec playwright install chromium
  npx pnpm@12.18.0 typecheck
  npx pnpm@12.18.0 lint
  npx vitest run
  npx playwright test --reporter=line
  npx pnpm@12.18.0 build
  ```
  Expected: every step exit 0; record exact counts (unit files/tests, E2E passed/failed/skipped) — the repo's `verify-gates.ps1` helper in temp may be reused. Investigate any regression (Task 5) before proceeding.
- [ ] **Step 2: Live re-run with credentials** (Task 1 env injection) → `npx pnpm@12.18.0 test:live` exit 0; record counts incl. the repeatability test's `skipped` line (Review Focus 3 evidence).
- [ ] **Step 3: Hygiene sweep:** revert `next-env.d.ts` flips (`git checkout -- '*next-env.d.ts'`); `git status` shows no `.env.local`, no `data/`, no temp scripts; credential grep (Task 9 Step 3) clean; `git log` shows no key-bearing commit message.
- [ ] **Step 4: Evidence block** — paste the verbatim gate outputs into Phases.md's exit-gate evidence (or append to the existing block) and amend Memory work-completed rows if counts changed; amend the docs commit.

---

### Task 12: Push and open the PR (§14)

**Files:** none new.

- [ ] **Step 1: Final tree check.** `git status --short --branch` clean except intended commits; `git log --oneline origin/main..HEAD` shows the logical increments (materials/tests/docs/fixes).
- [ ] **Step 2: Push:** `git push -u origin feat/phase-5-final-validation`.
- [ ] **Step 3: Open PR to `main`** via GitHub REST (token via `git credential fill`, never printed): title `feat: Phase 5 final validation, live AI testing and submission preparation`; body = summary of Tasks 1–11 with real counts, gate results, live-results summary, links to `docs/submission/` files; **no credentials, no key material**; checklist noting "not merged by author".
- [ ] **Step 4: Poll CI** on the PR head (existing poll script pattern) until green; record run id/outcome.
- [ ] **Step 5: Report to the owner** (spec §16 A–F: readiness, real Nebius results, validation results, demo materials, submission readiness with outstanding owner actions, PR URL). Never merge; never submit externally.
