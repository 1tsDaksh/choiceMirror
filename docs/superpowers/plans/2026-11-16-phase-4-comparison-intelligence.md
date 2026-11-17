# Phase 4: Comparison Intelligence & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn stored comparison evidence into deterministic metrics and evidence-linked findings, and present them in a polished, accessible comparison dashboard with mirrored journey timelines and a screenshot/event inspector.

**Architecture:** A new pure package `@choicemirror/metrics` computes a Zod-validated `ComparisonReport` (journey metrics → comparison metrics → findings → evidence validation) from `ComparisonDetail` records with no I/O and no persistence. The comparison page derives the report during server render; the client dashboard recomputes it with the same pure function when polling updates detail. UI components under `apps/web/components/` render the report and raw events; screenshots continue to come from the existing artifact API.

**Tech Stack:** TypeScript (strict), Zod 4, Next.js 16 App Router + React, Tailwind CSS v4 (`@theme` tokens already defined), Vitest (colocated unit tests), Playwright (E2E, chromium, workers:1), pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-11-16-phase-4-comparison-intelligence.md` (owner's Phase 4 instructions, verbatim). Plan argues from the spec; read both.

## Global Constraints

- Phase 4 only: no Phase 5, no deployment, no new models/providers, no DB/queue/microservice, no runner/agent policy changes, never self-merge.
- Branch `feat/phase-4-comparison-intelligence` off `main`; commits incremental; PR targets `main`.
- Action counting (D-009): a recorded action = a trace event with `countsAsAction === true && outcome === "success"`; `goal-selected`/`navigate`/`complete`/`error` never count. `expectedActionCount` is fixture validation only, never a measured result.
- Unobservable metrics → `null` / "Not available", never `0` (backtracking, interruptions, dead ends are not in the trace format).
- Model latency/tokens are execution metadata, never UX friction; never mixed into friction metric cards.
- Comparison `completed` ≠ both journeys succeeded; only two completed journeys yield a numeric difference. A failed/blocked/timed-out/missing journey is never shown as "requiring fewer actions" and is never compared as a complete path.
- Findings are deterministic (no second AI call). Every finding reference (journey id, stepNo, screenshot id) must exist in stored evidence; corruption degrades to a single insufficient-evidence finding, never fabricated refs.
- Verdict language ban: `title/explanation/observed/calculated/interpreted` must not match `/manipulat|dark pattern|unlawful|illegal|scam|fraud|decept|deliberate|intentional/i`; the disclaimer sentence lives only in `limitations`.
- Design tokens (existing `@theme` in `apps/web/app/globals.css`): canvas `#0b1020`, surface `#141c30`, elevated `#1c2940`, primary-text `#f4f7fb`, secondary-text `#a8b7cc`, journey-a `#4fd1c5`, journey-b `#a78bfa`, highlight `#78a6ff`, warning `#f5c66b`, error `#fb7185`, success `#57d9a3`; fonts Inter (sans) / JetBrains Mono (mono).
- Colour never the sole carrier of status (pair with text/labels); WCAG 2.2 AA contrast; keyboard operable; respect existing `prefers-reduced-motion` block.
- No API key in code, tests, screenshots, logs, or commits. E2E uses the mock Nebius server only; `test:live` stays opt-in and out of CI.
- New package wiring: `workspace:^` dep in `apps/web/package.json`, `@choicemirror/metrics` added to `transpilePackages` in `apps/web/next.config.ts`, lockfile committed (plain `pnpm install` when adding the workspace package; frozen install at gates).
- Repo conventions: extensionless relative imports; colocated `*.test.ts`; packages export raw TS (`exports` → `./src/index.ts`); `next-env.d.ts` flips on dev/build → revert, never commit.
- Gates before PR: `npx pnpm@12.18.0 install --frozen-lockfile`, `typecheck`, `lint`, `test:unit`, `test:e2e`, `build` — all exit 0.

## Review Focus

1. **Journey array order is not goal order** (store sorts by filename): metrics and dashboard must map journeys via `comparison.goalIds`. Test: unit with reversed journeys array (Task 2) + dashboard A/B assignment assertion (Task 10).
2. **Non-completed journeys must never yield numeric comparisons**: difference/ratio `null`, result `inconclusive`, UI shows "Not available" and an inconclusive finding. Test: units for failed/blocked/timeout/missing/running (Task 2) + seeded partial-state E2E (Task 9).
3. **Finding references must resolve**: hand-corrupted findings (unknown stepNo/screenshot/journey) fail validation and degrade to one insufficient-evidence finding. Test: `validateFindings` negatives + degraded-report test (Task 4).
4. **Legacy Phase 2 records (no `mode`/`ai`) and corrupt storage must render honestly**: legacy treated as deterministic with no AI sections; corrupt journey files read as missing → pending track + inconclusive, never fake metrics. Test: legacy unit (Task 2), `buildComparisonReport` corrupt-input unit (Task 4), seeded legacy/corrupt E2E (Task 9).
5. **Polling/selection races**: the existing out-of-order poll guard must survive the refactor, and a selection whose `stepNo` disappears after refresh must resolve to the inspector empty state, not wrong evidence or a crash. Test: `resolveSelection` units (Task 6) + poll-guard preserved in `comparison-detail.tsx` (Tasks 5–7 keep `requestSeqRef`/`appliedSeqRef` logic untouched).

---

### Task 1: Scaffold `@choicemirror/metrics` + journey metrics

**Files:**
- Create: `packages/metrics/package.json`, `packages/metrics/tsconfig.json`
- Create: `packages/metrics/src/schemas.ts`, `packages/metrics/src/journey-metrics.ts`, `packages/metrics/src/index.ts`
- Test: `packages/metrics/src/journey-metrics.test.ts`
- Modify: `pnpm-lock.yaml` (via install)

**Interfaces:**
- Produces (relied on by Tasks 2–4):
  - `journeyOutcomeSchema = z.enum(["completed", "failed", "blocked", "timed-out", "pending"])`
  - `journeyMetricsSchema` → `JourneyMetrics` = `{ journeyId: string | null; goalId: GoalId; outcome: JourneyOutcome; actionCount: number | null; navigationEventCount: number | null; durationMs: number | null; ai: { inferenceCalls: number; inputTokens: number; outputTokens: number; rejectedProposals: number } | null; evidence: { traceRecorded: boolean; screenshotCount: number; missingScreenshotIds: string[]; danglingScreenshotIds: string[]; complete: boolean } }`
  - `computeJourneyMetrics(journey: JourneyRecord | undefined, goalId: JourneyRecord["goalId"]): JourneyMetrics`
  - `journeyMetricsSchema.parse` must accept every value `computeJourneyMetrics` returns.

- [ ] **Step 1: Scaffold the package (no test yet — infrastructure for the failing test)**

`packages/metrics/package.json` mirrors `packages/storage/package.json` exactly (name `@choicemirror/metrics`, version `0.1.0`, private, type module, exports `.` → types/import `./src/index.ts`, script `typecheck: tsc --noEmit`), dependencies: `@choicemirror/contracts: workspace:^` **and** `zod: ^4.6.7` (same range as contracts); devDependencies `@types/node: ^25.9.9`, `typescript: ^6.0.3`. `tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "noEmit": true, "types": ["node"] }, "include": ["src"] }`.

Run `npx pnpm@12.18.0 install` (lockfile gains the new workspace package) and commit nothing yet.

- [ ] **Step 2: Write the failing test `packages/metrics/src/journey-metrics.test.ts`**

Fixtures are hand-built `JourneyRecord` objects (helper `journey(overrides)` building a minimal completed join journey: `cmp_ab12cd34ef567890-join`, 2 events `navigate`/`goal-selected`/`click`/`complete` as appropriate, screenshots `[{id,label}]`). Test names:

- `counts only successful counted actions and excludes navigation and goal selection`
- `reports pending with null counts when the journey record is absent`
- `maps failed, blocked and timed-out statuses to their outcomes while keeping real action counts`
- `returns null duration for missing, invalid or reversed timestamps`
- `returns null ai block when the record has no model metadata`
- `marks evidence complete only when the trace exists and every screenshot reference resolves`
- `flags dangling and missing screenshot references`
- `rejects malformed metrics at the schema boundary`

Assertions use exact values (e.g., goal-selected event `countsAsAction: false` never counted; `durationMs` from `startedAt: "2026-11-16T10:00:00.000Z"` / `completedAt: "2026-11-16T10:00:05.000Z"` → `5000`; invalid date string → `null`; `outcome` mapping `"timeout" → "timed-out"`; absent journey → all counts `null`, `outcome "pending"`, `journeyId null`).

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx pnpm@12.18.0 exec vitest run packages/metrics/src/journey-metrics.test.ts`
Expected: FAIL — module `./journey-metrics` not found (or empty test file import error).

- [ ] **Step 4: Implement `schemas.ts` + `journey-metrics.ts`**

`schemas.ts`: the Zod schemas from Interfaces above (import `goalIdSchema` from `@choicemirror/contracts`; export inferred types). Semantics to implement in `computeJourneyMetrics`:

- absent journey → pending/nulls as above.
- `outcome`: completed/failed/blocked map directly; `"timeout"` → `"timed-out"`.
- `actionCount`/`navigationEventCount`: `null` when `events.length === 0`, else counts of (`countsAsAction && outcome === "success"`) and (`type === "navigate"`).
- `durationMs`: `null` unless both timestamps parse and `completedAt >= startedAt`.
- `ai`: from `journey.ai` when present (map the four fields), else `null`.
- `evidence`: `traceRecorded = events.length > 0`; `screenshotCount = journey.screenshots.length`; `danglingScreenshotIds` = event `screenshotId`s absent from `journey.screenshots`; `missingScreenshotIds` = `step-<stepNo>` for each success event of type `navigate|goal-selected|click|complete` with no `screenshotId`; `complete = traceRecorded && dangling.length === 0 && missing.length === 0`.

`index.ts` re-exports schemas + `computeJourneyMetrics` (barrel grows in later tasks).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx pnpm@12.18.0 exec vitest run packages/metrics/src/journey-metrics.test.ts` → PASS.
Run: `npx pnpm@12.18.0 --filter @choicemirror/metrics typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/metrics pnpm-lock.yaml
git commit -m "feat(metrics): scaffold package with journey metrics"
```

---

### Task 2: Comparison metrics

**Files:**
- Create: `packages/metrics/src/comparison-metrics.ts`
- Modify: `packages/metrics/src/schemas.ts` (add comparison schemas), `packages/metrics/src/index.ts` (export)
- Test: `packages/metrics/src/comparison-metrics.test.ts`

**Interfaces:**
- Consumes: `computeJourneyMetrics`, `journeyMetricsSchema` (Task 1).
- Produces (relied on by Tasks 3–5):
  - `comparisonMetricsSchema` → `ComparisonMetrics` = `{ comparisonId: string; status: ComparisonStatus; journeys: [JourneyMetrics, JourneyMetrics]; actionDifference: number | null; heavierJourney: "a" | "b" | null; actionRatio: number | null; comparableConditions: { comparable: boolean; reasons: string[] }; result: "balanced" | "observed-asymmetry" | "inconclusive" }`
  - `computeComparisonMetrics(input: { comparison: ComparisonRecord; journeys: readonly JourneyRecord[] }): ComparisonMetrics`

- [ ] **Step 1: Write the failing test `packages/metrics/src/comparison-metrics.test.ts`**

Hand-built fixtures (helpers `comparison(overrides)` + `journey(goalId, {status, actions, seed, origin, viewport, mode, ai})` — independent of the runner). Test names + pinned assertions:

- `orders journeys by comparison goalIds, not by array position` — journeys passed `[leave, join]` → `journeys[0].goalId === "join"`.
- `reports balanced when both journeys completed with equal counts` — 1 vs 1 → `actionDifference 0`, `heavierJourney null`, `actionRatio 1`, `result "balanced"`, `comparable true`.
- `reports observed asymmetry with difference and ratio for 1 vs 3` — `actionDifference 2`, `heavierJourney "b"`, `actionRatio 2` (assert `toBeCloseTo(2)`), `result "observed-asymmetry"`.
- `stays inconclusive with null difference when a journey failed` — failed leave → `actionDifference null`, `heavierJourney null`, `actionRatio null`, `result "inconclusive"`, reasons include `Journey B (leave) did not complete (failed).`
- `stays inconclusive when a journey is missing` — absent record → `journeys[1].outcome "pending"`, reasons include `Journey B (leave) has no recorded evidence yet.`
- `stays inconclusive while the comparison is still running with one journey done`
- `lists comparability reasons for differing seeds origins viewports or modes` — seed/origin/viewport/mode mismatch each append their reason; legacy journey (no `mode`) treated as `"deterministic"`.
- `computes valid metrics from legacy phase 2 records without mode or ai`
- `keeps duration null from invalid timestamps without breaking the comparison`

Reason strings are exact (they appear in UI copy): `Journey B (leave) did not complete (failed).`, `Journey B (leave) has no recorded evidence yet.`, `Seeds differ between journeys.`, `Origins differ between journeys.`, `Viewports differ between journeys.`, `Execution modes differ between journeys.` (journey label = `Journey ${A|B} (${goalId})`).

- [ ] **Step 2: Run to verify FAIL**

Run: `npx pnpm@12.18.0 exec vitest run packages/metrics/src/comparison-metrics.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `computeComparisonMetrics`**

Rules: map journeys via `comparison.goalIds` (`[a, b]`, find by `goalId`, `undefined` → `computeJourneyMetrics(undefined, goalId)`); `actionDifference`/`heavierJourney`/`actionRatio` only when **both** outcomes are `completed` and both `actionCount !== null` (ratio = `(max+1)/(min+1)` per PRD §9); `comparableConditions.reasons` as pinned (non-completion reason uses the journey's actual status word and goalId); `result`: `inconclusive` unless both completed && `reasons.length === 0`, then `actionDifference === 0 ? "balanced" : "observed-asymmetry"`. Export from `index.ts`.

- [ ] **Step 4: Run to verify PASS** — same vitest command → PASS; metrics typecheck → exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/metrics
git commit -m "feat(metrics): add paired comparison metrics with honest incomplete states"
```

---

### Task 3: Deterministic findings engine

**Files:**
- Create: `packages/metrics/src/findings.ts`
- Modify: `packages/metrics/src/schemas.ts` (finding schemas), `packages/metrics/src/index.ts`
- Test: `packages/metrics/src/findings.test.ts`

**Interfaces:**
- Consumes: `ComparisonMetrics` (Task 2), raw `JourneyRecord[]` for evidence refs.
- Produces (relied on by Tasks 4, 5, 7):
  - `findingSchema` → `Finding` = `{ id: string; category: "action-asymmetry" | "balanced-actions" | "inconclusive"; title: string; explanation: string; observed: string[]; calculated: string[]; interpreted: string; evidence: Array<{ journeyId: string; stepNos: number[]; screenshotIds: string[] }>; limitations: string[]; quality: "evidence-complete" | "evidence-partial" | "insufficient-evidence" }`
  - `buildFindings(metrics: ComparisonMetrics, journeys: readonly JourneyRecord[]): Finding[]` — always returns exactly one finding.

- [ ] **Step 1: Write the failing test `packages/metrics/src/findings.test.ts`**

Build inputs via `computeComparisonMetrics` over hand-built fixtures (1-vs-3 completed; 1-vs-1 completed; failed leave; missing journey). Test names + exact copy pins:

- `builds an asymmetry finding with the spec headline and supporting description`
  - title: `Leaving required 2 more actions than joining`
  - explanation: `Both journeys completed successfully in the controlled benchmark. The leaving journey required three recorded actions, compared with one for joining.`
  - observed: `["Goal A (join): completed with 1 recorded action.", "Goal B (leave): completed with 3 recorded actions."]`
  - calculated contains `Action difference: 2 (3 - 1).` and `Action burden ratio: (3+1)/(1+1) = 2.`
  - interpreted: `This run recorded a 2-action gap between the two goals; the evidence does not explain why the gap exists.`
  - id: `cmp_ab12cd34ef567890-action-asymmetry`, category `action-asymmetry`, quality `evidence-complete`
  - evidence: one entry per journey with `journeyId`, `stepNos` = counted-action stepNos, `screenshotIds` = those events' screenshotIds
- `builds a balanced finding for equal counts` — title `Equal recorded action burden`, explanation `Both journeys completed successfully in the controlled benchmark with the same number of recorded actions (one each).`, category `balanced-actions`, calculated includes `Action difference: 0.` and ratio `(1+1)/(1+1) = 1.`
- `builds an inconclusive finding with no numeric claims when a journey failed` — title `Inconclusive comparison`, explanation exactly `Journey B (leave) did not complete (failed), so action counts cannot be compared.`, `calculated` empty, no `evidence` entry for the missing/failed-citation... (failed journey WITH trace still cites its real events; a journey without records contributes no evidence entry), quality `insufficient-evidence`
- `builds an inconclusive finding when a journey has no records` — explanation `Journey B (leave) has no recorded evidence yet, so action counts cannot be compared.`
- `never emits verdict language in title explanation observed calculated or interpreted` — concat all five for every fixture case, assert `not.toMatch(/manipulat|dark pattern|unlawful|illegal|scam|fraud|decept|deliberate|intentional/i)`
- `every finding carries the standard disclaimer limitation` — `limitations` contains `Action differences are descriptive measurements, not proof of unlawful or intentional manipulation.`
- `adds the model-reporting limitation only when ai metadata exists`
- `references only events that exist in the supplied journeys` — evidence stepNos/screenshotIds ⊆ fixture events (this is the builder-side guarantee; external validation is Task 4)
- `always returns exactly one finding`

Gerund helper (internal): `join → joining/Joining`, `leave → leaving/Leaving`, `accept → accepting/Accepting`, `reject → rejecting/Rejecting`. Number words: `numberWord(n)` for 0–10 (`zero…ten`), digits above. Standard limitations array (asymmetry/balanced): the disclaimer sentence, `Single run against the controlled local benchmark; results describe this execution only.`, `Counts reflect recorded browser actions; backtracking, interruptions and dead ends are not captured by the trace format.` — plus, when any journey has `ai`, `Model-reported justifications are recorded as reported, not independently verified.` Inconclusive uses the same limitations (quality `insufficient-evidence`).

- [ ] **Step 2: Run to verify FAIL** — `npx pnpm@12.18.0 exec vitest run packages/metrics/src/findings.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `findings.ts`**

Branch on `metrics.result`. Citation helper: for each journey slot with a record, evidence entry = counted-action events (`stepNos`, their non-null `screenshotIds`). No scenario input — copy derives from goalIds via gerunds (keeps metrics pure of catalog data).

- [ ] **Step 4: Run to verify PASS** — same command → PASS; typecheck → exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/metrics
git commit -m "feat(metrics): add deterministic evidence-linked findings"
```

---

### Task 4: Evidence validation + report entry point

**Files:**
- Create: `packages/metrics/src/evidence-validation.ts`, `packages/metrics/src/report.ts`
- Modify: `packages/metrics/src/index.ts`
- Test: `packages/metrics/src/evidence-validation.test.ts`, `packages/metrics/src/report.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (relied on by Tasks 5–9):
  - `validateFindings(detail: ComparisonDetail, findings: readonly Finding[]): { valid: boolean; problems: string[] }` — every `evidence[].journeyId` must match a stored journey, its `stepNos` must exist in that journey's events, its `screenshotIds` in that journey's screenshots; problem strings: `Finding <id> references unknown journey <journeyId>.`, `Finding <id> references unknown step <stepNo> in journey <journeyId>.`, `Finding <id> references unknown screenshot <screenshotId> in journey <journeyId>.`
  - `comparisonReportSchema` → `ComparisonReport` = `{ metrics: ComparisonMetrics; findings: Finding[]; validation: { valid: boolean; problems: string[] } }`
  - `buildComparisonReport(detail: ComparisonDetail): ComparisonReport` — **always returns a schema-valid report**.

- [ ] **Step 1: Write failing tests**

`evidence-validation.test.ts`:
- `accepts findings built from the same detail` → `{valid: true, problems: []}`
- `rejects findings referencing an unknown journey id`
- `rejects findings referencing an unknown step number`
- `rejects findings referencing a screenshot that was never stored`

`report.test.ts`:
- `produces metrics findings and valid validation for a completed detail`
- `degrades to a single insufficient-evidence finding when validation fails` — corrupt by pushing a fabricated evidence entry (journeyId `cmp_0000000000000000-join`, stepNo 99) into the built finding before a test-only internal seam: test the composition by calling `buildComparisonReport` on a detail whose journeys were hand-edited to *disagree* with what the builder cites — practical approach: build a detail whose journey `events` array is emptied after... (builder reads the same detail, so instead assert degradation through the corrupt-storage path below plus a direct test of the internal seam: export `composeReport(detail, metrics, findings)`? **Decision: `report.ts` exports `buildComparisonReport` plus internal-but-exported `degradeReport(detail: ComparisonDetail, problems: string[]): ComparisonReport`**; the validation-failure test calls `degradeReport` directly and `buildComparisonReport` is tested for the happy/corrupt paths.)
- `returns a degraded report when the detail itself fails schema validation` — hand-corrupt: `journeys: [{ ...journey, events: "nope" }] as unknown as JourneyRecord[]` → report with `validation.valid false`, one finding id `<id>-evidence-invalid`, title `Evidence could not be validated`, and schema `comparisonReportSchema.parse(report)` succeeds.
- `report schema round-trips a healthy report`

- [ ] **Step 2: Run to verify FAIL** — vitest on both files → FAIL (modules missing).

- [ ] **Step 3: Implement `evidence-validation.ts` + `report.ts`**

`buildComparisonReport` flow: (1) `comparisonDetailSchema.safeParse(detail)` — fail → `degradeReport(detail, ["Stored evidence failed schema validation."])`; (2) `computeComparisonMetrics`; (3) `buildFindings`; (4) `validateFindings` — invalid → `degradeReport(detail, problems)`; (5) else healthy report. `degradeReport` keeps computed metrics when parseable (best-effort via try/catch around step 2, else a minimal inconclusive metrics object built from `detail.comparison` with both journeys pending) and always returns exactly one finding: `{ id: \`${detail.comparison.id}-evidence-invalid\`, category: "inconclusive", title: "Evidence could not be validated", explanation: "Stored evidence failed validation, so no findings are reported.", observed: [], calculated: [], interpreted: "No interpretation is offered.", evidence: [], limitations: [...standard], quality: "insufficient-evidence" }`. Export all from `index.ts`.

- [ ] **Step 4: Run to verify PASS** — both test files PASS; `npx pnpm@12.18.0 --filter @choicemirror/metrics typecheck` exit 0; `npx pnpm@12.18.0 test:unit` all green (163 + new).

- [ ] **Step 5: Commit**

```bash
git add packages/metrics
git commit -m "feat(metrics): validate finding references and always return a schema-valid report"
```

---

### Task 5: Web wiring + dashboard shell (header, main finding, metric cards)

**Files:**
- Modify: `apps/web/package.json` (add `"@choicemirror/metrics": "workspace:^"`), `apps/web/next.config.ts` (`transpilePackages` += `@choicemirror/metrics`)
- Modify: `apps/web/app/comparisons/[id]/page.tsx` (scenario lookup + prop)
- Modify: `apps/web/components/comparison-detail.tsx` (shell: header, finding, metric cards; polling untouched)
- Create: `apps/web/components/comparison-summary.tsx`, `apps/web/components/finding-card.tsx`, `apps/web/components/metric-card.tsx`
- Modify: `tests/e2e/phase-2.spec.ts`, `tests/e2e/ai-web.spec.ts` (only assertions broken by the header/copy changes)

**Interfaces:**
- Consumes: `buildComparisonReport`, `ComparisonReport` (Task 4); `Scenario` via `getScenario` from contracts.
- Produces:
  - `ComparisonSummary` props: `{ scenario: Scenario; comparison: ComparisonRecord; report: ComparisonReport }` — renders header block.
  - `FindingCard` props: `{ finding: Finding; onInspectEvidence?: () => void }` — main finding card; renders the inspect button only when the handler is provided.
  - `MetricCard` props: `{ label: string; value: string; unit?: string; definition: string; unavailable?: boolean }`.
  - `comparison-detail.tsx` keeps props `{ initial: ComparisonDetailData; scenario: Scenario }` and keeps the `requestSeqRef`/`appliedSeqRef` poll guard byte-for-byte.

- [ ] **Step 1: Wire the package + scenario (compile-only checkpoint)**

Add the dep, run `npx pnpm@12.18.0 install`, add to `transpilePackages`, update `page.tsx`: `const scenario = getScenario(comparison.scenarioId); if (!scenario) notFound();` and pass `scenario={scenario}`. Run `npx pnpm@12.18.0 typecheck` → exit 0. (Component ignores the new prop until Step 2 — typecheck fails on unused-prop? It won't: prop is part of the type. Implement together with Step 2 if preferred; the checkpoint exists to catch wiring errors early.) Commit wiring only if Step 2 is not immediate.

- [ ] **Step 2: Build `metric-card.tsx`, `finding-card.tsx`, `comparison-summary.tsx` (no tests — presentation components pinned by Task 10 E2E)**

Copy pins:

- Header: eyebrow `Comparison evidence`; `h1` = `scenario.title`; goals line = `${scenario.goals[0].description} vs ${scenario.goals[1].description}`; mode badge keeps the exact existing strings `Mode: AI · <model>` / `Mode: AI` / `Mode: Deterministic` (model from first journey with `ai`, absent-mode → deterministic); secondary mono line = `Run {comparison.id} · seed {comparison.seed} · created {comparison.createdAt}`; existing `role="status"` banner (appearance map + messages) stays unchanged below the meta line.
- `FindingCard`: category chip text `Observed asymmetry` / `Balanced` / `Inconclusive` (border-highlight / border-success / border-warning tints, chip text always present so colour is not the sole carrier); quality badge `Evidence complete` / `Evidence partial` / `Insufficient evidence`; `h2` = `finding.title`; explanation paragraph; three labelled micro-sections `Observed`, `Calculated`, `Interpreted` (lists/single line from the finding fields); evidence chips `Goal A · steps 1,2`-style from `finding.evidence` (mapped to A/B by index); `<details>` `Limitations` listing `finding.limitations`; inspect button copy `Inspect supporting evidence` (only with handler).
- `MetricCard`: `label` (mono uppercase xs), `value` (32px tabular `font-mono`), `unit` (xs secondary), `definition` (xs secondary, always rendered); `unavailable` → value `—` plus a `Not available` text (never a fake `0`).

Metric card set rendered by `comparison-detail.tsx` from `report.metrics` (grid `gap-4 sm:grid-cols-2 lg:grid-cols-4`):

1. `Journey A actions` / `Journey B actions` — value = `actionCount?.toString() ?? "—"`; unit `recorded actions`; definition `Counted successful click events in the trace; goal selection is excluded.`
2. `Action difference` — `actionDifference ?? "—"`; unit `actions`; definition `Absolute difference between the two completed journeys; unavailable until both complete.`
3. `Completion outcomes` — value = `${outcomeLabel(A)} / ${outcomeLabel(B)}` where outcomeLabel: completed→`Completed`, failed→`Failed`, blocked→`Blocked`, timed-out→`Timed out`, pending→`Pending`; definition `Actual stored journey outcomes; a completed comparison can still contain a failed journey.`
4. Conditional AI card (only when either journey's `ai !== null`): label `Execution metadata`, value = `${inferenceCalls} inference calls` (sum across journeys), unit = `${input} input / ${output} output tokens · ${rejected} rejected · <model>` (model = first non-null), definition `Model activity recorded for this run — execution cost, not a measure of interface friction.`

- [ ] **Step 3: Rewrite the top of `comparison-detail.tsx`**

Keep: state, poll effect, `statusFailed` branch, `statusAppearance`, mode-label computation, `goalJourneys` mapping (by `goalIds`). Add: `const report = buildComparisonReport(detail);` then render `<ComparisonSummary …/>` → `<FindingCard finding={report.findings[0]} />` → metric-cards grid → (temporarily) the existing `<JourneyPanel>` grid. Delete nothing yet.

- [ ] **Step 4: Run unit + typecheck + lint, then E2E and fix header-driven assertion drift**

Run: `npx pnpm@12.18.0 typecheck && npx pnpm@12.18.0 lint && npx pnpm@12.18.0 test:unit` → all exit 0.
Run: `npx pnpm@12.18.0 test:e2e` → fix only assertions broken by the header/finding additions (panel-scoped assertions must still pass untouched). Expect drift possible around any `h1`/`getByText("Run …")` usage — keep the comparison id visible as secondary metadata so id-lookup assertions can be re-scoped, not deleted.

- [ ] **Step 5: Commit**

```bash
git add apps/web tests/e2e pnpm-lock.yaml
git commit -m "feat(web): dashboard shell with scenario header, main finding and metric cards"
```

---

### Task 6: Mirrored journeys + timeline (replace `JourneyPanel`)

**Files:**
- Create: `apps/web/components/evidence-badges.ts`, `apps/web/components/mirrored-journeys.tsx`, `apps/web/components/journey-timeline.tsx`, `apps/web/lib/selection.ts`
- Delete: `apps/web/components/journey-panel.tsx`
- Modify: `apps/web/components/comparison-detail.tsx` (selection state; swap grid for `MirroredJourneys`)
- Test: `apps/web/lib/selection.test.ts`
- Modify: `tests/e2e/phase-2.spec.ts`, `tests/e2e/ai-web.spec.ts` (copy updates below)

**Interfaces:**
- Produces (relied on by Tasks 7, 10):
  - `EventSelection = { journeyIndex: 0 | 1; stepNo: number | null; screenshotId: string | null }` (at least one of `stepNo`/`screenshotId` non-null — enforced by helper `selectEvent(journeyIndex, event)` / `selectScreenshot(journeyIndex, screenshotId)` in `selection.ts`)
  - `resolveSelection(journeys: readonly (JourneyRecord | undefined)[], selection: EventSelection | null): { journey: JourneyRecord; event: TraceEvent | null; screenshotId: string | null } | null` — resolves by `stepNo` first, then `screenshotId` reverse-lookup; unresolvable → `null`
  - `MirroredJourneys` props: `{ detail: ComparisonDetailData; report: ComparisonReport; selection: EventSelection | null; onSelect: (selection: EventSelection) => void }`
  - `JourneyTimeline` props: `{ journey: JourneyRecord | undefined; metrics: JourneyMetrics; goalIndex: 0 | 1; selectedStepNo: number | null; onSelectEvent: (selection: EventSelection) => void }`
  - `evidence-badges.ts` exports `statusBadges` (existing map from `journey-panel.tsx`) and `validationBadges` + `outcomeClass(outcome)` helpers

- [ ] **Step 1: Write the failing `apps/web/lib/selection.test.ts`**

- `resolves a valid step selection to its journey and event`
- `falls back to screenshot id when stepNo is null`
- `returns null for a null selection`
- `returns null when the step no longer exists after a refresh`
- `returns null when the journey slot is empty`

- [ ] **Step 2: Run to verify FAIL** — vitest on the file → FAIL (module missing).

- [ ] **Step 3: Implement `selection.ts` + `evidence-badges.ts`** (move `statusBadges`/`validationBadges` verbatim from `journey-panel.tsx`), run test → PASS.

- [ ] **Step 4: Implement `mirrored-journeys.tsx` + `journey-timeline.tsx`**

- Layout: `grid gap-4 md:grid-cols-2`; each track `<section aria-label="Goal A journey">` / `"Goal B journey"` (keeps existing E2E regions), `border-journey-a/50` / `border-journey-b/50`, header: mono `Goal A` accent colour, `h2` = goalId (or `Not run yet`), status badge from `statusBadges` (pending track uses `Waiting`).
- Meta line: `${actionLabel} · ${navLabel}${durationText}${fixtureText}` with `actionLabel = `${n} recorded action(s)`` (pluralise), `navLabel` = `${n} navigation event(s)` (omit when null), `durationText` = ` · ${seconds}s` (one decimal, omit when null), `fixtureText` = ` · fixture expects ${journey.expectedActionCount}` (only when a journey record exists). Unavailable counts render `Not available`, never `0`.
- AI decisions block moved verbatim from `journey-panel.tsx` (same headings/copy) — rendered when `journey?.ai` exists.
- Timeline: heading `Recorded steps` (replaces `Ordered events`); `<ol>` of `<li><button type="button">` — button spans: `step {stepNo}`, chip (`action`/`step` from `countsAsAction`), outcome text, event label, and when `event.ai` exists the compact text `proposed: {action}[ · {targetId}]` plus validation badge text. `aria-current="true"` on the selected step. Empty state: `No events recorded yet.`
- Screenshot checkpoint strip: derive from `journey.screenshots`; each is a `<button>` containing an `<img>` (`src=/api/comparisons/{comparisonId}/artifacts/{id}`, `alt="Screenshot: {label}"`) that calls `onSelectEvent(selectScreenshot(...))`; heading `Screenshot checkpoints`.
- Failed/empty extras: journey `error` box kept verbatim; absent journey keeps `Waiting for this goal to run.`

- [ ] **Step 5: Swap into `comparison-detail.tsx`**

Add `const [selection, setSelection] = useState<EventSelection | null>(null);` reset to `null` when `detail.comparison.id` changes (defensive). Replace the `JourneyPanel` grid with `<MirroredJourneys … />`; delete `journey-panel.tsx` and its import.

- [ ] **Step 6: Update existing E2E copy assertions**

- `phase-2.spec.ts`: `getByText("1 / 1 actions")` → `getByText("1 recorded action")`; `getByText("3 / 3 actions")` → `getByText("3 recorded actions")`; `getByText("Ordered events")` → `getByText("Recorded steps")`.
- `ai-web.spec.ts`: `Ordered events` → `Recorded steps`; the reason-paragraph assertion (`clickEvent.locator("p.text-xs.text-secondary-text")`) moves to Task 7's inspector — replace it here with an assertion that the timeline button shows `proposed: click · element-\d+` and the `executed` badge (both stay in the button).

- [ ] **Step 7: Run gates**

`npx pnpm@12.18.0 typecheck && npx pnpm@12.18.0 lint && npx pnpm@12.18.0 test:unit && npx pnpm@12.18.0 test:e2e` → all exit 0 (fix fallout only in the two specs above).

- [ ] **Step 8: Commit**

```bash
git add apps/web tests/e2e
git commit -m "feat(web): mirrored journey tracks with selectable recorded-step timeline"
```

---

### Task 7: Evidence inspector

**Files:**
- Create: `apps/web/components/evidence-inspector.tsx`, `tests/e2e/dashboard.spec.ts`
- Modify: `apps/web/components/comparison-detail.tsx` (render inspector, wire selection + `onInspectEvidence` focus)

**Interfaces:**
- Consumes: `resolveSelection`, `EventSelection`, `evidence-badges.ts` (Task 6); `ComparisonState` for the empty state.
- Produces: `EvidenceInspector` props: `{ detail: ComparisonDetailData; selection: EventSelection | null; onChange: (selection: EventSelection) => void; }` plus an internal heading ref exposed for focus via `inspectorRef` prop: `{ inspectorRef?: React.RefObject<HTMLHeadingElement | null> }`.

- [ ] **Step 1: Write the first `tests/e2e/dashboard.spec.ts` tests (inspector section)**

Helpers: `runComparison(page, scenarioId)` (POST via UI or API then wait for `role=status` `Completed` — reuse the pattern from `ai-web.spec.ts`). Tests:

- `selecting a recorded step shows its screenshot and event evidence` — asymmetric run; click timeline button for step 2; inspector shows `img` with `naturalWidth > 0`, `Step 2`, the event label, `Counted as an action: Yes`, timestamp text.
- `the inspector reports non-counted steps honestly` — select the `goal-selected` step → `Counted as an action: No`.
- `previous and next step buttons move between events` — `Next step` advances step number text; disabled at ends (`toBeDisabled()`).
- `keyboard users can reach and operate the inspector` — `Tab` until the first timeline button is focused, `Enter` populates the inspector, `Tab` reaches `Next step`, `Enter` changes the shown step.

- [ ] **Step 2: Run to verify FAIL** — `npx pnpm@12.18.0 exec playwright test tests/e2e/dashboard.spec.ts` → FAIL (inspector absent).

- [ ] **Step 3: Implement `evidence-inspector.tsx`**

`<section aria-label="Evidence inspector">` with `h2` (`tabIndex={-1}`, ref) `Evidence inspector`; `aria-live="polite"` wrapper (**no `role="status"`** — avoids colliding with the banner's role/status text filters) announcing `Step {n}: {label}`. Two-column `md:grid-cols-2`: left = screenshot (`img` from artifact API; when the selection has no screenshot → `ComparisonState`-style text `No screenshot recorded for this step.`); right = detail list: goal chip (`Goal A · join`), `Step {n}` (or `Screenshot only` when `event === null`), `<time dateTime>` timestamp, label, outcome, `Counted as an action: Yes/No`, `detail` line when present, and for `event.ai`: heading `Model-reported justification (not verified)`, proposed action text `proposed: click · element-N`, validation badge, reason paragraph, model + promptVersion, usage/latency line (reuse `usageLine`/`formatTokenCount` logic — move those two helpers into `evidence-badges.ts` and import from both places). Footer: `Previous step` / `Next step` buttons operating on the resolved journey's events (disabled at bounds); when `selection === null` render `ComparisonState kind="empty"` with `Select a recorded step to inspect its evidence.`

Wire in `comparison-detail.tsx`: selection state (Task 6) → inspector; FindingCard `onInspectEvidence` = select the first counted action of `report.metrics.heavierJourney`'s side (fallback: first counted action in goal order), then `inspectorRef.current?.focus()` in a `requestAnimationFrame`.

- [ ] **Step 4: Run the dashboard spec + full E2E**

`npx pnpm@12.18.0 exec playwright test tests/e2e/dashboard.spec.ts` → PASS; then full `npx pnpm@12.18.0 test:e2e` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web tests/e2e
git commit -m "feat(web): evidence inspector with screenshot, event details and step stepper"
```

---

### Task 8: Methodology panel

**Files:**
- Create: `apps/web/components/methodology-panel.tsx`
- Modify: `apps/web/components/comparison-detail.tsx` (render below inspector)
- Modify: `tests/e2e/dashboard.spec.ts` (one test)

- [ ] **Step 1: Write the failing test**

`methodology panel explains counting, evidence classes and limits` — click `<details>` summary `How these measurements work`; assert visible text contains: `goal selection`, `Observed`, `Calculated`, `Interpreted`, `(max+1)/(min+1)`, `not proof of unlawful or intentional manipulation`, `interface friction`.

- [ ] **Step 2: Run to verify FAIL** — dashboard spec → FAIL.

- [ ] **Step 3: Implement `methodology-panel.tsx`**

`<details className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">` with `summary` `How these measurements work`; six `<h3>` sections with copy covering (per spec §5F): controlled local benchmark scope; action counting (`countsAsAction` events, goal selection excluded, fixture expectations are validation not measurement); observed vs calculated vs interpreted definitions; the ratio formula with a worked example `(3+1)/(1+1) = 2`; what the numbers do not show (single run, no backtracking/interruption capture, descriptive not proof of unlawful or intentional manipulation); AI navigation vs interface friction (latency/tokens = execution metadata). No data props — static content.

- [ ] **Step 4: Run to verify PASS** — dashboard spec → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web tests/e2e
git commit -m "feat(web): methodology and limitations panel"
```

---

### Task 9: States & resilience (running, partial, failed, legacy, corrupt, poll error)

**Files:**
- Create: `tests/e2e/support/global-setup.ts`, `tests/e2e/support/seed-fixtures.ts`
- Modify: `playwright.config.ts` (`globalSetup`, `CHOICEMIRROR_DATA_DIR` for the web app webServer)
- Modify: `apps/web/components/comparison-detail.tsx` (validation strip; no poll-guard changes)
- Modify: `tests/e2e/dashboard.spec.ts` (states section)

**Interfaces:**
- Consumes: seeded records on disk (file store), `report.validation` (Task 4), existing `ComparisonState`.
- Produces: deterministic E2E-only fixtures at fixed ids (hex-valid): `cmp_5eed000000000001` (running, zero journeys), `cmp_5eed000000000002` (failed comparison: journey A completed 1 action, journey B failed with error), `cmp_5eed000000000003` (legacy Phase 2: no `mode`, both completed 1v3, no `ai`), `cmp_5eed000000000004` (comparison record valid, journey file contains invalid JSON → read as missing).

- [ ] **Step 1: Write the failing state tests in `dashboard.spec.ts`**

- `a running comparison shows running state, pending tracks and an inconclusive finding` — goto `/comparisons/cmp_5eed000000000001` → `role=status` contains `Running`, both tracks show `Waiting` badge + `Waiting for this goal to run.`, finding chip `Inconclusive`, difference card `—` + `Not available`.
- `a partial comparison never presents the failed journey as shorter` — goto `…0002` → finding chip `Inconclusive` with explanation naming the failure, `Action difference` card `—`, Goal B badge `Failed` + journey error box visible, Goal A `Completed` with `1 recorded action`.
- `a legacy phase 2 record renders as deterministic without ai sections` — goto `…0003` → `Mode: Deterministic`, zero `AI decisions (model-reported)` blocks, finding headline `Leaving required 2 more actions than joining`.
- `a corrupt journey file is treated as missing evidence, not as zero` — goto `…0004` → page renders, Goal B track pending/`Not available` (never `0 recorded actions`), finding `Inconclusive`.
- `a failing status poll shows a retryable error state` — goto `…0001` with `page.route` fulfilling `**/api/comparisons/cmp_5eed000000000001` GET → 500 → `Comparison status unavailable` + `Try again`; unroute; click `Try again` → recovers to `Running`.

- [ ] **Step 2: Run to verify FAIL** — dashboard spec → FAIL (fixtures missing / page 404).

- [ ] **Step 3: Implement seeding**

`tests/e2e/support/seed-fixtures.ts`: exports `writeSeedData(rootDir: string): void` building the four comparisons via plain object literals typed as `ComparisonRecord`/`JourneyRecord` (validated at write time with the contracts schemas), each journey's required screenshots written as real PNGs (minimal valid PNG byte constant, base64-decoded) under `artifacts/`, event `screenshotId`s wired to them; the corrupt case writes a `.json` file containing `{not json`. `global-setup.ts`: `rm -rf` + `mkdir` the data dir, call `writeSeedData`, export default function. `playwright.config.ts`: `const E2E_DATA_DIR = path.join(process.cwd(), "test-results", "e2e-data")`; `globalSetup: "./tests/e2e/support/global-setup.ts"`; web app webServer `env.CHOICEMIRROR_DATA_DIR = E2E_DATA_DIR` (spread `process.env` first, as existing env handling does).

- [ ] **Step 4: Implement the validation strip in `comparison-detail.tsx`**

When `!report.validation.valid`: render a warning strip above the finding — `Stored evidence failed validation — findings are withheld.` (`border-warning/40 bg-warning/5 text-warning`) — alongside the degraded finding card. No other render changes (poll guard untouched).

- [ ] **Step 5: Run gates**

`npx pnpm@12.18.0 test:e2e` → exit 0 (all existing + new state tests; seeded ids must not disturb existing runs). Then `typecheck` + `lint` + `test:unit` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add tests playwright.config.ts apps/web
git commit -m "feat(web): honest running partial failed legacy and corrupt evidence states"
```

---

### Task 10: Dashboard E2E completion + repeatability runs

**Files:**
- Modify: `tests/e2e/dashboard.spec.ts` (results + responsive sections)
- Create: `tests/e2e/repeatability.spec.ts`
- Modify: `tests/e2e/ai-web.spec.ts` (one AI-metadata assertion for the new card)

**Interfaces:**
- Consumes: Tasks 5–9 UI; `runJourney` from `@choicemirror/browser-runner`; catalog expectations for validation only.

- [ ] **Step 1: Write the failing results/responsive tests**

`dashboard.spec.ts` additions:

- `a balanced run reports equal recorded action burden` — `consent-balanced` run → finding chip `Balanced`, title `Equal recorded action burden`, cards `Journey A actions = 1`, `Journey B actions = 1`, `Action difference = 0`.
- `an asymmetric run headlines the action difference with A/B correctly assigned` — `membership-asymmetric` → title `Leaving required 2 more actions than joining`, Goal A track shows `join` + `1 recorded action`, Goal B track shows `leave` + `3 recorded actions`, `Action difference = 2`, ratio line present in Calculated.
- `the main finding button jumps to its supporting evidence` — click `Inspect supporting evidence` → inspector focused (`toBeFocused()` on its h2) and populated with a counted step of the heavier journey.
- `screenshots load in the track and the inspector` — all checkpoint `img` in Goal B track have `naturalWidth > 0`; inspector image too.
- `the dashboard stacks into a single column on mobile` — `page.setViewportSize({ width: 390, height: 844 })`; Goal B region's `boundingBox().y` ≥ Goal A's `y + height` (stacked), both visible.

`ai-web.spec.ts` addition: after the AI run, `Execution metadata` card visible containing `inference calls` and the model name (accurately labelled AI execution metadata).

`repeatability.spec.ts` (uses `runJourney` directly, no UI — one test per scenario, three runs per goal path inside each):

- For each scenario in `[membership-balanced, membership-asymmetric, consent-balanced, consent-asymmetric]` × both goals × 3 runs: assert every run `status === "completed"`, `actionCount` identical across the three runs, `events.filter(countsAsAction).length === actionCount`, and `actionCount === scenario.expectedActions.find(...).count` (validation only). `console.log` a variance line per goal: `repeatability <scenario>/<goal>: 3 runs → statuses [completed×3], actions [3,3,3]`.

- [ ] **Step 2: Run to verify FAIL** — `npx pnpm@12.18.0 exec playwright test tests/e2e/dashboard.spec.ts tests/e2e/repeatability.spec.ts` → FAIL (new tests missing/failing).

- [ ] **Step 3: Implement tests** (these are test-only tasks — implementation already exists; any product bug found becomes a fix commit in the owning component).

- [ ] **Step 4: Run and capture real results**

Full `npx pnpm@12.18.0 test:e2e` → exit 0. Save the repeatability variance lines (they print to stdout) — they go verbatim into `docs/Phases.md`/`docs/Memory.md` in Task 12. Record actual observed counts; never claim variance you did not measure.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): dashboard results coverage and three-run repeatability per fixture"
```

---

### Task 11: Accessibility contrast verification

**Files:**
- Create: `apps/web/lib/contrast.test.ts` (test-only module: the formula lives in the test file — no production dead code)
- Modify: components only if a contrast failure is found

- [ ] **Step 1: Write the failing test**

`apps/web/lib/contrast.test.ts` reads `../app/globals.css` via `fileURLToPath(new URL("../app/globals.css", import.meta.url))`, extracts `--color-*` values by regex, and asserts WCAG contrast ratios (relative-luminance formula implemented in the test):

- ≥ 4.5:1 for `primary-text`/`surface`, `primary-text`/`canvas`, `secondary-text`/`surface`, `secondary-text`/`canvas`
- ≥ 4.5:1 for chip text pairs composited over their 15% tint backgrounds: `success`/`surface`, `error`/`surface`, `warning`/`surface`, `highlight`/`surface` (blend 0.15 alpha over `surface` first)
- ≥ 3:1 for large/non-text accents: `journey-a`/`surface`, `journey-b`/`surface`, `highlight`/`canvas`

Test names: `design tokens meet WCAG AA for body text pairs`, `tinted badge pairs meet WCAG AA after compositing`, `journey accent colours meet the 3:1 large-text threshold`.

- [ ] **Step 2: Run to verify FAIL** — `npx pnpm@12.18.0 exec vitest run apps/web/lib/contrast.test.ts` → FAIL only if a real token pair is below threshold (if everything already passes, this step documents the check ran red first only when a genuine defect exists — record the outcome honestly either way).

- [ ] **Step 3: Fix any failing pair**

If a pair fails: adjust usage (not the spec-pinned token values) — e.g., secondary text on elevated surfaces gets a lighter tint — then re-run. Never change the ten spec-pinned hex values.

- [ ] **Step 4: Run unit suite** → `npx pnpm@12.18.0 test:unit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "test(web): pin WCAG AA contrast for dashboard colour pairs"
```

---

### Task 12: Documentation updates

**Files:**
- Modify: `docs/Architecture.md`, `docs/Memory.md`, `docs/Phases.md`, `docs/Design.md`, `README.md`
- Verify-only: `docs/PRD.md`, `docs/Rules.md` (must remain accurate; record any conflict as a Memory decision per Rules §1)

**Interfaces:**
- Consumes: all shipped behaviour + Task 10's recorded repeatability numbers.

- [ ] **Step 1: `docs/Architecture.md`**

Replace the "planned Phase 4" markers: metrics engine section (pure `@choicemirror/metrics`, function-per-stage pipeline, Zod `ComparisonReport`, no persistence — derive-on-render decision), finding generation + evidence-reference validation with degradation behaviour, dashboard data flow (server render derives report → client polling recomputes the same pure function), monorepo tree gains the real `metrics/` entry, planned-entities note updated to shipped (`MetricSet`/`Finding` → actual schema names), API section notes no new endpoints.

- [ ] **Step 2: `docs/Memory.md`**

New decisions (next free IDs after D-022): **D-023** derive-on-render, no persisted reports (schema/version not needed); **D-024** findings are deterministic — no second model call (evidence-bounded copy, gerund templates); **D-025** E2E state fixtures seeded through `CHOICEMIRROR_DATA_DIR` (no prod test hooks); **D-026** metric-card separation: friction metrics vs execution metadata. Add work-completed row (with test counts), changelog entry, unknowns/limitations (single-run evidence, no backtracking capture, 2048-cap edge still open from D-022, live Nebius not re-run in Phase 4), next actions.

- [ ] **Step 3: `docs/Phases.md`**

Phase 4 status → complete only with exit-gate evidence: gates output, dashboard description, **verbatim repeatability variance lines from Task 10**, test counts (unit N, E2E N). State honestly that live-model repeat runs were not performed (no credentials available; mocked-model integration only — never described as real-model performance).

- [ ] **Step 4: `docs/Design.md`**

New reusable components list (`ComparisonSummary`, `FindingCard`, `MetricCard`, `MirroredJourneys`, `JourneyTimeline`, `EvidenceInspector`, `MethodologyPanel`) with their roles; note the existing tokens were reused unchanged; contrast-test addition; any copy standards introduced (verdict-language ban, `Not available` over `0`).

- [ ] **Step 5: `README.md`**

How to read the dashboard (main finding → metric cards → mirrored tracks → inspector → methodology), what `action_ratio` means with the formula, the limitations paragraph, updated test counts.

- [ ] **Step 6: Commit**

```bash
git add docs README.md
git commit -m "docs: record phase 4 architecture, decisions and verification evidence"
```

---

### Task 13: Full verification suite + pull request

**Files:**
- Modify: possibly assertion drift fixes only; `apps/web/next-env.d.ts` must be reverted if flipped (never commit it).

- [ ] **Step 1: Run the full gate chain**

```bash
npx pnpm@12.18.0 install --frozen-lockfile
npx pnpm@12.18.0 typecheck
npx pnpm@12.18.0 lint
npx pnpm@12.18.0 test:unit
npx pnpm@12.18.0 test:e2e
npx pnpm@12.18.0 build
```

All must exit 0. Fix failures before proceeding. Confirm `git status` shows no `next-env.d.ts` changes.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/phase-4-comparison-intelligence
```

- [ ] **Step 3: Open the PR targeting `main` (do not merge)**

`gh` is unavailable — use a Node script under `%TEMP%\opencode\` that obtains a token via `git credential fill` (never printed) and calls the GitHub REST API (`POST /repos/1tsDaksh/choiceMirror/pulls`). Body: summary, verification table (exact gate outputs/counts), Phase 4 DoD checklist checked against real evidence, repeatability numbers, known limitations. CI must be green on the head SHA before finishing (poll `actions/runs`).

- [ ] **Step 4: Final report to the owner**

Deliver: implemented functionality, architectural changes, dashboard description (optionally capture screenshots via a Playwright script into `%TEMP%\opencode\`), actual benchmark results, verification results, outstanding limitations, PR URL. Never merge.

---

## Self-review notes (plan author)

- Spec coverage: §3 → Tasks 1–2; §4 → Tasks 3–4; §5 A–F → Tasks 5–8; §6 → Global Constraints + Task 11; §7 → Task 9 (+ honest states in Tasks 2/4); §8 → constraints (no runner/agent edits in any task); §9 → Tasks 1–4 unit, 7/9/10 E2E, 10 repeatability, 11 a11y; §10 → Task 1 wiring; §11 → Task 13; §12 → Task 12; §13 → Task 13; §14 DoD → mapped as listed above; §15 → Task 13 report.
- Type consistency: `JourneyMetrics` (T1) → `ComparisonMetrics` (T2) → `Finding` (T3) → `ComparisonReport` (T4) → web props (T5–7); `EventSelection`/`resolveSelection` defined once (T6) and consumed only afterwards (T7); badge/usage helpers defined once (T6 `evidence-badges.ts`) and reused (T7).
- Known deliberate choices: exactly one finding per report; copy derives from goalIds (no catalog dependency inside metrics); contrast formula lives in the test file; seeded fixtures use `test-results/e2e-data` so no test-only code ships in the app.
