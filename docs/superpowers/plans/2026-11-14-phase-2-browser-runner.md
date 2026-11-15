# Phase 2 — Browser Execution and Evidence Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deterministic Playwright browser runner that executes both opposing goals of all four controlled scenarios from equivalent clean states, records structured evidence with screenshots, persists it behind a modular store, exposes validated APIs, and surfaces real run status and evidence in the existing UI.

**Architecture:** A new `packages/browser-runner` launches Chromium in library mode with an injectable driver seam (unit-testable without a browser), executes a deterministic `JourneyPlan` built from flow definitions that move into `packages/contracts` (single source of truth shared with the benchmark UI), and returns Zod-validated evidence records. A new `packages/storage` provides a file-backed JSON+PNG store behind a `ComparisonStore` interface. The web app's API layer creates comparisons (202 + poll model), runs journeys sequentially in-process with a single-run guard, and serves comparison and artifact reads; the UI extends the launcher with a working Run action and adds a polling comparison detail view.

**Tech Stack:** pnpm workspaces, strict TypeScript, Next.js 16 App Router, Zod (contracts), Playwright 1.65.1 (library mode), Vitest (unit), Playwright Test (E2E incl. runner integration), Tailwind design system as-is.

**Spec:** `docs/Phases.md` (Phase 2 section), `docs/Architecture.md`, `docs/PRD.md` (FR-01, FR-02, FR-04, FR-09), `docs/Rules.md`, plus the Phase 2 instruction set (runner, paired execution, evidence, storage, APIs, minimal UI, tests).

## Global Constraints

- Phase 2 ONLY: no AI/LLM integration, no navigation agent, no explanations, no friction scoring, no analytics dashboard, no redesign, no deployment/submission work.
- TypeScript strict mode; every untrusted value validated with Zod (`packages/contracts`).
- **Action-count definition (pinned):** selecting the initial goal does NOT count as an action. An action is one flow-step button click. `expectedActions` counts and the fixture copy "Completed in N actions" already use this definition; the runner records goal selection as a `goal-selected` event with `countsAsAction: false`.
- Execution limits: `MAX_ACTIONS = 10` per journey, `STEP_TIMEOUT_MS = 10_000`, `JOURNEY_TIMEOUT_MS = 60_000`, viewport `{ width: 1280, height: 720 }`.
- Origins: runner navigates only to server-side `BENCHMARK_ORIGIN` (default `http://localhost:3001`); all other origins are blocked at the request layer and checked after navigation.
- Both journeys of a comparison use: fresh browser context (no storage), identical viewport, identical `seed` (`phase-2`), identical limits. Journeys run sequentially, one comparison at a time (concurrent POST → HTTP 429).
- Storage root: `CHOICEMIRROR_DATA_DIR` env var, default `<cwd>/data` (gitignored). Store validates every id with contract schemas before building paths — no unvalidated path segments.
- No PII stored: ids, statuses, timestamps, fixture-owned action labels, synthetic screenshot bytes only.
- Keep Phase 1 behavior intact except where Phase 2 intentionally supersedes it (Run button enabled, not-found copy, home copy — Phase 1 E2E assertions updated in Task 9).
- Keep `test:unit` browser-free (CI installs Chromium after unit tests). Real-browser proof lives in `tests/e2e/`.
- One dependency added: `playwright@1.65.1` (already in `minimumReleaseAgeExclude`). Root devDeps gain `@choicemirror/browser-runner` and `@choicemirror/contracts` (workspace) so E2E can import them.

## Review Focus

Each line is pinned by a test in the named task.

1. **Off-origin navigation (redirects, protocol-relative, `javascript:`)** — must be blocked and recorded as `blocked`, never executed. → Task 4: `isAllowlistedUrl` cases + post-navigation origin check + route-abort unit tests.
2. **Browser/context leaks when a step throws or times out** — `close()` must run on every path. → Task 4: cleanup assertions on success, failure, and timeout paths.
3. **Missing or corrupted stored records** — honest 404/null, never a fabricated result. → Task 3: corrupt-JSON tests; Task 7: 404 tests; Task 9: unknown-ID E2E.
4. **Artifact path traversal** (`../`, encoded separators) — invalid ids rejected before any path join. → Task 1: id schema tests; Task 3: store rejection tests; Task 7: route 404 tests.
5. **Action-count drift** — goal selection must never inflate counts; traces must match `expectedActions` for all 8 goal paths. → Task 2: plan tests; Task 9: API matrix assertions.
6. **Concurrent runs corrupting records** — second POST while running returns 429. → Task 6: route test with active-run guard.

---

### Task 1: Evidence contracts and ID helpers

**Files:**
- Create: `packages/contracts/src/evidence.ts`
- Create: `packages/contracts/src/evidence.test.ts`
- Modify: `packages/contracts/src/index.ts` (add `export * from "./evidence"`)

**Interfaces:**
- Consumes: `scenarioIdSchema`, `goalIdSchema`, `Scenario`/`Goal` types from `./scenario`.
- Produces (Task 4/6/7/9 rely on these exact names):
  - `traceEventSchema` / `TraceEvent`
  - `journeyStatusSchema` (`"completed" | "failed" | "timeout" | "blocked"`) / `JourneyRecord`
  - `comparisonStatusSchema` (`"running" | "completed" | "failed"`) / `ComparisonRecord`
  - `comparisonDetailSchema` / `ComparisonDetail` = `{ comparison: ComparisonRecord; journeys: JourneyRecord[] }`
  - `comparisonIdSchema`, `journeyIdSchema`, `artifactIdSchema`
  - `newComparisonId(): string`, `newJourneyId(comparisonId: string, goalId: Goal["id"]): string`, `newArtifactId(journeyId: string, checkpoint: string): string`
  - `parseComparisonId(raw: string): string | null` (returns null on schema failure; used by API params)

Pinned schemas:

```ts
// evidence.ts (shapes — bodies are plain Zod)
traceEventSchema = z.object({
  stepNo: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  type: z.enum(["navigate", "goal-selected", "click", "complete", "error"]),
  label: z.string().min(1),
  outcome: z.enum(["success", "failure"]),
  countsAsAction: z.boolean(),
  detail: z.string().optional(),
  screenshotId: z.string().optional(), // artifactId of the checkpoint taken after this event
})
journeyRecordSchema = z.object({
  id: z.string(),
  comparisonId: z.string(),
  goalId: goalIdSchema,
  status: journeyStatusSchema,
  seed: z.string().min(1),
  origin: z.string().url(),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  expectedActionCount: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  events: z.array(traceEventSchema),
  screenshots: z.array(z.object({ id: z.string(), label: z.string().min(1) })),
  error: z.string().optional(),
})
comparisonRecordSchema = z.object({
  id: comparisonIdSchema,
  scenarioId: scenarioIdSchema,
  goalIds: z.tuple([goalIdSchema, goalIdSchema]),
  seed: z.string().min(1),
  status: comparisonStatusSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
})
comparisonDetailSchema = z.object({ comparison: comparisonRecordSchema, journeys: z.array(journeyRecordSchema).max(2) })
```

ID formats: `comparisonIdSchema = /^cmp_[a-f0-9]{16}$/` (from `node:crypto randomBytes(8)` hex); `journeyIdSchema = /^cmp_[a-f0-9]{16}-(join|leave|accept|reject)$/`; `artifactIdSchema = /^[A-Za-z0-9_-]+\.png$/`. Checkpoints: `start`, `goal`, `step-1..step-N`, `complete` (e.g. `cmp_ab12cd34ef567890-join-step-1.png`).

- [ ] **Step 1: Write failing schema tests**

`evidence.test.ts`: (a) `newComparisonId()` matches `comparisonIdSchema`; (b) `newJourneyId(cmpId, "join")` matches `journeyIdSchema`; (c) `newArtifactId(journeyId, "step-1")` matches `artifactIdSchema` and equals `` `${journeyId}-step-1.png` ``; (d) `parseComparisonId("../etc/passwd")`, `parseComparisonId("cmp_zzz")`, `parseComparisonId("cmp_" + "a".repeat(16))` (non-hex) all return null; (e) a full `journeyRecordSchema` sample with two events parses; (f) a record with `actionCount` negative fails; (g) `comparisonDetailSchema` rejects three journeys.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx pnpm vitest run packages/contracts/src/evidence.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `packages/contracts/src/evidence.ts`**

Per shapes above; `newComparisonId` uses `randomBytes(8).toString("hex")`. Re-export from `index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx pnpm vitest run packages/contracts/src/evidence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts
git commit -m "feat(contracts): add phase 2 evidence schemas and id helpers"
```

---

### Task 2: Deterministic navigation instructions in contracts

**Files:**
- Create: `packages/contracts/src/flows.ts` (moved from `apps/benchmark/lib/flows.ts`)
- Move: `apps/benchmark/lib/flows.test.ts` → `packages/contracts/src/flows.test.ts`
- Delete: `apps/benchmark/lib/flows.ts`
- Create: `packages/contracts/src/journey-plan.ts` + `journey-plan.test.ts`
- Modify: `apps/benchmark/components/choice-flow.tsx` (import `getFlow`, `initialFlowState` from `@choicemirror/contracts` instead of `@/lib/flows`)
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: `scenarioSchema` types, `scenarios`/`getScenario` from this package.
- Produces:
  - `FlowDefinition`, `FlowState`, `getFlow(scenarioId: string): FlowDefinition | undefined`, `initialFlowState(flow, goalId): FlowState | undefined` (moved unchanged — Phase 1 tests travel with the file).
  - `buildJourneyPlan(scenario: Scenario, goalId: Goal["id"]): JourneyPlan | undefined`
  - `type JourneyPlan = { scenarioId: Scenario["id"]; path: string; goalId: Goal["id"]; goalButtonName: string; actions: readonly string[]; expectedActionCount: number }`
    - `path` = `scenario.benchmarkPath`; `goalButtonName` = matching `scenario.goals[].description` (the benchmark start button's visible description text; runner substring-matches the accessible name, as Phase 1 E2E does); `actions` = `getFlow(scenarioId).goals[goalId]`; `expectedActionCount` = `actions.length`.

- [ ] **Step 1: Move flows and fix imports (no behavior change)**

`git mv apps/benchmark/lib/flows.ts packages/contracts/src/flows.ts`; `git mv apps/benchmark/lib/flows.test.ts packages/contracts/src/flows.test.ts`; change `import type { Goal, Scenario } from "@choicemirror/contracts"` inside flows.ts to `./scenario` imports; update `choice-flow.tsx` import; export from `index.ts`.

- [ ] **Step 2: Run moved tests + benchmark typecheck**

Run: `npx pnpm vitest run packages/contracts/src/flows.test.ts && npx pnpm --filter @choicemirror/benchmark typecheck`
Expected: PASS (same 6 Phase 1 flow tests) / Done.

- [ ] **Step 3: Write failing journey-plan tests**

`journey-plan.test.ts`: for every scenario in `scenarios` and each of its two goals — plan is defined, `expectedActionCount === scenario.expectedActions.find(e => e.goalId === goalId).count`, `actions.length === expectedActionCount`, `path === scenario.benchmarkPath`, `goalButtonName === scenario.goals.find(g => g.id === goalId).description`. Pin known values: `buildJourneyPlan(getScenario("membership-asymmetric")!, "leave")` → `actions` equals `["Review the leaving notice", "Confirm the membership choice", "Leave workspace"]`, `expectedActionCount` 3. Unknown goal (`buildJourneyPlan(scenario, "join")` on a consent scenario) → undefined. Note: the asymmetric plan pins the asymmetric friction (1 vs 3) already covered by `flows.test.ts` equality pins.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx pnpm vitest run packages/contracts/src/journey-plan.test.ts`
Expected: FAIL (`buildJourneyPlan` not exported).

- [ ] **Step 5: Implement `buildJourneyPlan` in `packages/contracts/src/journey-plan.ts`**

Look up flow via `getFlow(scenario.id)` and goal description via `scenario.goals`; return `undefined` when either lookup fails.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx pnpm vitest run packages/contracts/src/journey-plan.test.ts packages/contracts/src/flows.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts apps/benchmark
git commit -m "feat(contracts): centralize flow instructions and add journey plan builder"
```

---

### Task 3: File-backed storage package

**Files:**
- Create: `packages/storage/package.json`, `packages/storage/tsconfig.json`
- Create: `packages/storage/src/file-store.ts`, `packages/storage/src/file-store.test.ts`, `packages/storage/src/index.ts`
- Modify: root `vitest.config.ts` (no change needed — `**/*.test.ts` already includes packages) and `pnpm-workspace.yaml` (no change — `packages/*` already matched)

**Interfaces:**
- Consumes: `ComparisonRecord`, `JourneyRecord`, `comparisonIdSchema`, `artifactIdSchema`, `journeyIdSchema` from `@choicemirror/contracts` (dependency `workspace:^`; also add `zod` — actually contracts re-exports nothing of zod's runtime; storage needs no direct zod dep, only contract types + schemas).
- Produces (Tasks 5–7 rely on these exact names):

```ts
export type ComparisonStore = {
  saveComparison(record: ComparisonRecord): Promise<void>;
  getComparison(id: string): Promise<ComparisonRecord | null>;
  saveJourney(journey: JourneyRecord): Promise<void>;
  getJourneys(comparisonId: string): Promise<JourneyRecord[]>; // [] when none; skips files that fail schema parse
  saveScreenshot(comparisonId: string, artifactId: string, bytes: Uint8Array): Promise<void>;
  getScreenshot(comparisonId: string, artifactId: string): Promise<Uint8Array | null>;
};
export function createFileStore(rootDir: string): ComparisonStore;
```

Layout under `rootDir`: `comparisons/<comparisonId>/record.json`, `comparisons/<comparisonId>/journeys/<journeyId>.json`, `comparisons/<comparisonId>/artifacts/<artifactId>.png`.

Path safety rule: `saveComparison`/`getComparison` validate `comparisonIdSchema`; `saveJourney`/`getJourneys` validate `comparisonIdSchema` AND `journeyIdSchema` (journey id embeds comparison id — verify prefix match too); `saveScreenshot`/`getScreenshot` validate `comparisonIdSchema` AND `artifactIdSchema`. Invalid id → throw `Error("Invalid storage id")` (callers treat as400/404 upstream). Missing file → null/[]; JSON that fails `safeParse` → null/[] (log via `console.warn` with id only — no content).

- [ ] **Step 1: Scaffold package + write failing store tests**

`package.json` name `@choicemirror/storage`, scripts `typecheck: tsc --noEmit`, deps `@choicemirror/contracts: workspace:^`, `typescript ^6.0.3` devDep; `tsconfig.json` extending `../../tsconfig.base.json` (mirror `packages/contracts/tsconfig.json`).

`file-store.test.ts` (use `fs.mkdtemp(path.join(os.tmpdir(), "cm-store-"))`, `afterEach` rm -rf): (a) roundtrip comparison save/get deep-equals; (b) unknown id → null; (c) corrupt record.json (write `"not json"`) → null and `getJourneys` skips a corrupt journey file returning only valid ones; (d) journey roundtrip + `getJourneys` ordering by file read (assert contains both after saving two); (e) screenshot bytes roundtrip (Buffer with bytes `[137,80,78,71]`); (f) `getScreenshot` unknown → null; (g) traversal ids rejected: `getComparison("../x")`, `getScreenshot("cmp_" + "a".repeat(16), "../../evil.png")`, `saveJourney` with journey id not matching schema → all throw `Invalid storage id`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx pnpm vitest run packages/storage/src/file-store.test.ts`
Expected: FAIL (package/module missing).

- [ ] **Step 3: Implement `createFileStore`**

`mkdir -p` recursive on write; `writeFile`/`readFile` utf-8 for JSON, raw for PNG; `zod safeParse` on read; id validation first, before any path construction.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx pnpm vitest run packages/storage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storage pnpm-lock.yaml
git commit -m "feat(storage): add modular file-backed comparison store"
```

---

### Task 4: Browser runner package (unit, no real browser)

**Files:**
- Create: `packages/browser-runner/package.json`, `packages/browser-runner/tsconfig.json`
- Create: `packages/browser-runner/src/limits.ts`
- Create: `packages/browser-runner/src/allowlist.ts`, `packages/browser-runner/src/allowlist.test.ts`
- Create: `packages/browser-runner/src/runner.ts`, `packages/browser-runner/src/runner.test.ts`
- Create: `packages/browser-runner/src/driver.ts` (real Playwright driver — no unit test; exercised in Task 5)
- Create: `packages/browser-runner/src/index.ts` (re-exports: `limits`, `isAllowlistedUrl`, `runJourney`, `createPlaywrightOpenJourney`, types)

**Interfaces:**
- Consumes: `buildJourneyPlan`, `JourneyPlan` (Task 2), `TraceEvent`, `goalIdSchema` types (Task 1), `playwright` library (`chromium`).
- Produces (Tasks 5–6 rely on these exact names):

```ts
export const limits = {
  MAX_ACTIONS: 10,
  STEP_TIMEOUT_MS: 10_000,
  JOURNEY_TIMEOUT_MS: 60_000,
  VIEWPORT: { width: 1280, height: 720 },
} as const;

export function isAllowlistedUrl(rawUrl: string, allowedOrigins: string[]): boolean;
// true only when new URL(rawUrl).origin is in allowedOrigins (exact origin match).
// Throws-free: returns false for unparseable, javascript:, data:, protocol-relative resolution.

export type JourneyDriver = {
  navigate(url: string): Promise<void>;
  selectGoal(goalButtonName: string): Promise<void>;
  clickAction(actionName: string): Promise<void>;
  assertCompleted(expectedCount: number): Promise<void>;
  screenshot(): Promise<Buffer>;
  currentUrl(): Promise<string>;
};

export type OpenJourney = () => Promise<{ driver: JourneyDriver; close(): Promise<void> }>;

export type JourneyExecutionResult = {
  status: "completed" | "failed" | "timeout" | "blocked";
  events: TraceEvent[]; // stepNo 0..n, timestamps ISO
  actionCount: number;
  startedAt: string;
  completedAt: string;
  screenshots: { id: string; label: string; bytes: Buffer }[];
  error?: string;
};

export async function runJourney(options: {
  comparisonId: string;
  plan: JourneyPlan;
  origin: string;              // e.g. http://localhost:3001
  seed: string;
  openJourney?: OpenJourney;   // default: real Playwright impl from driver.ts
  maxActions?: number;         // default limits.MAX_ACTIONS
  stepTimeoutMs?: number;      // default limits.STEP_TIMEOUT_MS
  journeyTimeoutMs?: number;   // default limits.JOURNEY_TIMEOUT_MS
}): Promise<JourneyExecutionResult>;
```

`runJourney` behavior (algorithm the tests below do not fully determine — implement exactly):
1. `journeyId = newJourneyId(comparisonId, plan.goalId)`; checkpoint screenshot ids `newArtifactId(journeyId, checkpoint)`.
2. Enforce `plan.actions.length <= maxActions` up front; violation → `status: "blocked"`, `error: "Action limit exceeded."`, no browser opened.
3. `openJourney()`; whole execution wrapped in `try/finally { close() }` — `close()` errors are swallowed.
4. Navigate `${origin}${plan.path}?seed=${seed}`; after navigation assert `isAllowlistedUrl(await driver.currentUrl(), [origin])`; violation → `blocked` ("Navigation left the allowed origin."). Events: `{type:"navigate", label:"Open fixture", countsAsAction:false}` + screenshot checkpoint `start`.
5. `selectGoal(plan.goalButtonName)`; event `{type:"goal-selected", label: plan.goalId, countsAsAction:false}` + checkpoint `goal`.
6. For each action label (index i, 1-based): guard `i > maxActions` → `blocked`; `clickAction(label)`; event `{type:"click", label, countsAsAction:true}` + checkpoint `step-i`.
7. `assertCompleted(plan.actions.length)`; event `{type:"complete", label:"Goal completed", countsAsAction:false}` + checkpoint `complete`; `status: "completed"`; `actionCount = plan.actions.length`.
8. Error classification: Playwright timeout-type errors (name `TimeoutError`) or our own step-timeout → `timeout`; allowlist violation → `blocked`; anything else → `failed`; always append `{type:"error", outcome:"failure", countsAsAction:false, detail}`.
9. Every step runs under `withTimeout(promise, ms)` where exceeding the journey budget aborts with `timeout`; timestamps via `Date.now()` → ISO.
10. `screenshots` collected in order with `{id, label}` labels: `Starting state`, `After goal selection`, `After action <i>`, `Completed state`; each screenshot also referenced in the preceding event's `screenshotId`. Screenshot failures degrade to skipping that checkpoint (never fail the journey over a screenshot) EXCEPT they are logged in `error`? No — keep: screenshot failure is swallowed (fixture screenshots are local and reliable); events keep `screenshotId` only when captured.

- [ ] **Step 1: Scaffold package + write failing allowlist tests**

`package.json` name `@choicemirror/browser-runner`, deps `@choicemirror/contracts workspace:^`, `playwright 1.65.1`; devDeps `typescript ^6.0.3`, `@types/node ^25.9.9`; scripts `typecheck`, `lint` omitted (contracts precedent: packages currently only typecheck — root lint runs `-r` which only lints packages that define a lint script).

`allowlist.test.ts`: `isAllowlistedUrl("http://localhost:3001/membership-balanced", ["http://localhost:3001"])` → true; `https://evil.com`, `http://localhost:3002`, `http://localhost:3001.evil.com`, `javascript:alert(1)`, `data:text/html,x`, `//evil.com` (resolved against nothing — input as-is unparseable-as-http? `new URL("//evil.com")` throws without base → false), `not a url`, `""` → all false.

- [ ] **Step 2: Run allowlist tests to verify they fail**

Run: `npx pnpm vitest run packages/browser-runner/src/allowlist.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Write failing runner unit tests with a fake driver**

`runner.test.ts` fake harness:

```ts
type FakeScript = {
  failOn?: "navigate" | "selectGoal" | "clickAction" | "assertCompleted";
  hangOn?: "clickAction";            // never resolves (for timeout tests)
  currentUrlOverride?: string;       // simulate redirect off-origin
};
function fakeOpen(script: FakeScript): { open: OpenJourney; closeCount: () => number; clicked: string[] };
```

Tests (plan fixture: `buildJourneyPlan(getScenario("membership-asymmetric")!, "leave")`):
1. **Happy path:** status `completed`; `actionCount` 3; `clicked` equals the 3 action labels in order; events: navigate (countsAsAction false) → goal-selected (false) → 3× click (true) → complete (false); `stepNo` strictly `0..5`; every event has ISO timestamp; screenshots ids `[journeyId-start, -goal, -step-1, -step-2, -step-3, -complete]` in order; `closeCount() === 1`.
2. **Cleanup on failure:** `failOn: "clickAction"` → status `failed`, `error` defined, last event `type:"error"` `outcome:"failure"`, `closeCount() === 1`.
3. **Cleanup on timeout:** `hangOn: "clickAction"` with `stepTimeoutMs: 20` → status `timeout`, `closeCount() === 1`.
4. **Blocked after redirect:** `currentUrlOverride: "https://evil.example/"` (set to be returned after navigate) → status `blocked`, error mentions allowed origin, `clicked` empty, `closeCount() === 1`.
5. **Action-limit up front:** `maxActions: 2` with the 3-action plan → status `blocked`, error `"Action limit exceeded."`, `closeCount() === 0` (never opened).
6. **Journey budget:** `journeyTimeoutMs: 20` with `hangOn: "clickAction"` → status `timeout` (journey-level abort), close called.
7. **Goal selection not counted:** in happy path, `events.filter(e => e.countsAsAction).length === 3` and no `goal-selected` event has `countsAsAction: true`.

- [ ] **Step 4: Run runner tests to verify they fail**

Run: `npx pnpm vitest run packages/browser-runner/src/runner.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 5: Implement `limits.ts`, `allowlist.ts`, `driver.ts`, `runner.ts`**

Per the behavior spec above. `withTimeout` helper: `Promise.race([promise, reject-after(ms, label)])` with timer cleanup. `driver.ts` implements `createPlaywrightOpenJourney(options: { origin: string; viewport?: { width: number; height: number } }): OpenJourney` (spec in Task 5) with `chromium.launch()` → `browser.newContext({ viewport: viewport ?? limits.VIEWPORT })` → `browser.newPage()`; close path closes context then browser, swallowing errors. Default `openJourney` in `runJourney` is `() => createPlaywrightOpenJourney({ origin })` — unit tests always pass their own `openJourney` fake, but importing Playwright at module load is acceptable since it is a declared dependency (verified by the package's typecheck; no browser launches in unit tests).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx pnpm vitest run packages/browser-runner`
Expected: PASS (allowlist + runner suites).

- [ ] **Step 7: Typecheck workspace**

Run: `npx pnpm typecheck`
Expected: Done for all packages/apps.

- [ ] **Step 8: Commit**

```bash
git add packages/browser-runner pnpm-lock.yaml
git commit -m "feat(runner): add deterministic journey executor with safety limits"
```

---

### Task 5: Real-driver integration tests (Playwright harness, real Chromium)

**Files:**
- Create: `tests/e2e/runner-integration.spec.ts`
- Modify: root `package.json` (devDeps: `@choicemirror/browser-runner: workspace:^`, `@choicemirror/contracts: workspace:^`)

**Interfaces:**
- Consumes: `runJourney`, `createPlaywrightOpenJourney`, `JourneyDriver` (Task 4 — `driver.ts` is implemented there), `buildJourneyPlan`, `getScenario` (Task 2), benchmark app served at `http://localhost:3001` by `playwright.config.ts` webServer.
- `createPlaywrightOpenJourney` driver mapping (implemented in Task 4, proven here):
  - `navigate(url)`: `page.goto(url, { waitUntil: "load" })`
  - `selectGoal(name)`: `page.getByRole("button", { name: new RegExp(escapeRegExp(name)) }).click()` (substring match — mirrors Phase 1 E2E; button accessible name contains label + description)
  - `clickAction(name)`: `page.getByRole("button", { name, exact: true }).click()`
  - `assertCompleted(n)`: heading `Goal completed` visible AND text `Completed in n action(s). No data was submitted.` matches (use `page.getByRole("heading", { name: "Goal completed" }).waitFor({ state: "visible" })` + `page.getByText(/^Completed in \d+ action/).textContent()` equality — no Playwright `expect` in library mode)
  - `screenshot()`: `page.screenshot({ type: "png" })`
  - `currentUrl()`: `page.url()`
  - `escapeRegExp` local helper.

Test file `tests/e2e/runner-integration.spec.ts` (runs after webServer starts benchmark; no web-app interaction):
1. **Asymmetric leave journey end-to-end:** `runJourney` with plan for `membership-asymmetric`/`leave`, `origin: "http://localhost:3001"`, `seed: "phase-2"` → `completed`, `actionCount` 3, 6 screenshots with non-empty PNG bytes (`bytes.subarray(0,4)` equals `[137,80,78,71]`), events ordered, error undefined.
2. **Balanced join journey:** plan `membership-balanced`/`join` → `completed`, `actionCount` 1.
3. **Both consent goals:** `consent-asymmetric` accept (1) and reject (3) → both `completed` with matching counts.
4. **Blocked external origin:** plan with `origin: "http://localhost:9999"` (nothing listening) → status `failed` OR `blocked` — assert status is not `completed` and error is defined (navigation failure classification), AND no screenshot files claimed beyond what happened — simplest robust assertion: `expect(["failed","blocked","timeout"]).toContain(result.status)`.

- [ ] **Step 1: Add root devDeps and write the integration spec (failing: not yet proven)**

Add root devDeps; `npx pnpm install` (lockfile updates). Write `tests/e2e/runner-integration.spec.ts` per the four tests above.

- [ ] **Step 2: Run integration spec against real Chromium**

Run: `npx playwright test tests/e2e/runner-integration.spec.ts`
Expected: FAIL first if driver has defects; fix demonstrated driver/runner defects only; re-run until 4 passed. Record the passing output.

- [ ] **Step 3: Commit**

```bash
git add packages/browser-runner tests/e2e/runner-integration.spec.ts package.json pnpm-lock.yaml
git commit -m "test(runner): add real-browser journey integration coverage"
```

---

### Task 6: Comparison execution controller + POST API

**Files:**
- Create: `apps/web/lib/comparison-store.ts` + `apps/web/lib/comparison-store.test.ts`
- Create: `apps/web/lib/run-comparison.ts` + `apps/web/lib/run-comparison.test.ts`
- Modify: `apps/web/app/api/comparisons/route.ts` (replace 503 with real start)
- Modify: `apps/web/app/api/comparisons/route.test.ts`
- Modify: `apps/web/package.json` (deps `@choicemirror/browser-runner workspace:^`, `@choicemirror/storage workspace:^`)
- Modify: `apps/web/next.config.ts` (`serverExternalPackages: ["playwright", "playwright-core"]` — verify exact Next 16 key in `apps/web/node_modules/next/dist/docs/` before writing; AGENTS.md requires reading the bundled docs)
- Modify: root `.gitignore` (`apps/web/data/`)

**Interfaces:**
- Consumes: contracts (Task 1/2), `createFileStore` (Task 3), `runJourney` + `createPlaywrightOpenJourney` + `limits` (Task 4/5).
- Produces:
  - `apps/web/lib/comparison-store.ts`: `getStore(): ComparisonStore` — cached per process; root = `process.env.CHOICEMIRROR_DATA_DIR ?? path.join(process.cwd(), "data")`.
  - `apps/web/lib/run-comparison.ts`:
    - `startComparisonRun(comparisonId: string): Promise<void>` — reads record from store (404 path: record missing → mark nothing, return), for each `goalId` of `record.goalIds` sequentially: `buildJourneyPlan(scenario, goalId)` (scenario from `getScenario`), `runJourney({ comparisonId, plan, origin: benchmarkOrigin(), seed: record.seed, openJourney: createPlaywrightOpenJourney({ origin }) })`, then persist. **JourneyRecord mapping from `JourneyExecutionResult`:** `id = newJourneyId(comparisonId, plan.goalId)`, `comparisonId`, `goalId = plan.goalId`, `expectedActionCount = plan.expectedActionCount`, `seed = record.seed`, `origin = benchmarkOrigin()`, `viewport = limits.VIEWPORT`, `status/events/actionCount/startedAt/completedAt/error` copied from the result; each result screenshot → `saveScreenshot(comparisonId, screenshot.id, screenshot.bytes)` and `screenshots: result.screenshots.map(s => ({ id: s.id, label: s.label }))` in the record. Update comparison status after each journey (`running` until both done). Journey persist failures → catch → comparison `failed` with error. Finally: comparison `completed` (both journeys persisted, whatever their statuses — journey statuses carry granular truth) or `failed` on infrastructure error; `completedAt` set.
    - `hasActiveRun(): boolean`, `activeComparisonId(): string | null` — module-level single-flight guard; `startComparisonRun` acquires it at entry and releases in `finally`.
    - `benchmarkOrigin(): string` = `process.env.BENCHMARK_ORIGIN ?? "http://localhost:3001"` (server-side only env).
  - `POST /api/comparisons` response contract: `202 { comparisonId, status: "running" }`; `400 { error: "Invalid comparison request." }` (existing validation + goal-order check preserved); `429 { error: "A comparison is already running." }` when `hasActiveRun()`; `500 { error: "Comparison could not be started." }` when record save or run kickoff throws synchronously.

- [ ] **Step 1: Write failing `getStore` + controller tests**

`comparison-store.test.ts`: env root respected (`vi.stubEnv("CHOICEMIRROR_DATA_DIR", tmp)`), returns same instance twice (cache), roundtrip a minimal record.

`run-comparison.test.ts` (mock `@choicemirror/browser-runner` with `vi.mock`, mock store module): (a) runs both goals sequentially in `goalIds` order — assert `runJourney` called twice with `plan.goalId` sequence `["join","leave"]`, same `seed`/`origin`/`comparisonId` for both (equivalent starting conditions at the orchestration layer); (b) persists each journey via `saveJourney` + screenshots via `saveScreenshot`, then `saveComparison` with status `completed` + `completedAt`; (c) when `runJourney` rejects for goal 1, comparison saved `failed` with error, goal 2 never runs, guard released (`hasActiveRun()` false after await); (d) guard: while a controlled (never-resolving) run is active, `hasActiveRun()` true and `activeComparisonId()` matches.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx pnpm vitest run apps/web/lib`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement store accessor + controller**

Per Interfaces. Journeys persisted incrementally so a crash leaves partial-but-honest evidence (`status: failed` + whatever journeys exist).

- [ ] **Step 4: Write failing POST route tests (replace 503 test)**

`route.test.ts` updates: mock `@/lib/run-comparison` (so no browser runs): (a) valid body → `202`, body `{ comparisonId: expect.stringMatching(/^cmp_[a-f0-9]{16}$/), status: "running" }`, record saved with status `running`, `startComparisonRun` called with that id; (b) keep all three 400 cases unchanged; (c) `hasActiveRun` true → `429 { error: "A comparison is already running." }`, `startComparisonRun` not called.

- [ ] **Step 5: Run route tests to verify they fail, then implement route**

Run: `npx pnpm vitest run apps/web/app/api/comparisons/route.test.ts` → FAIL; rewrite `route.ts` POST tail: build record (`seed: "phase-2"`, `createdAt: new Date().toISOString()`, status `running`), `await store.saveComparison`, guard, `void startComparisonRun(id)` (catch → save `failed`), return 202.

- [ ] **Step 6: Run all web unit tests + typecheck + lint**

Run: `npx pnpm vitest run apps/web && npx pnpm --filter @choicemirror/web typecheck && npx pnpm --filter @choicemirror/web lint`
Expected: PASS / Done / Done.

- [ ] **Step 7: Commit**

```bash
git add apps/web .gitignore pnpm-lock.yaml
git commit -m "feat(web): start paired comparisons through the browser runner"
```

---

### Task 7: Read APIs — comparison detail and screenshot artifacts

**Files:**
- Create: `apps/web/app/api/comparisons/[id]/route.ts` + `route.test.ts`
- Create: `apps/web/app/api/comparisons/[id]/artifacts/[artifactId]/route.ts` + `route.test.ts`

**Interfaces:**
- Consumes: `getStore` (Task 6), `parseComparisonId`, `artifactIdSchema`, `comparisonDetailSchema` (Task 1).
- Produces:
  - `GET /api/comparisons/[id]` → `200` JSON `ComparisonDetail` (comparison + both journeys, events included — small enough to serve whole); `404 { error: "Comparison not found." }` for unknown id, corrupt record, or schema-invalid id param (invalid id → 404, not 400 — resource semantics).
  - `GET /api/comparisons/[id]/artifacts/[artifactId]` → `200` `image/png` bytes with `Cache-Control: private, max-age=300`; `404 { error: "Artifact not found." }` for missing file, unknown comparison, or schema-invalid params (traversal strings land here).
  - Next 16 route handler param pattern: `type Params = { params: Promise<{ id: string }> }` (async params — same pattern as benchmark `[scenarioId]/page.tsx`; confirm in bundled Next docs if uncertain).

- [ ] **Step 1: Write failing GET comparison tests**

`[id]/route.test.ts` with env-pinned temp store (`vi.stubEnv`): (a) save record + 2 journeys via store, `GET` → 200, body deep-equals `comparisonDetailSchema` parse (use `comparisonDetailSchema.parse(body)` to prove contract); (b) unknown id `cmp_0000000000000000` → 404; (c) param `../record` → 404; (d) corrupt record.json on disk → 404 (honest missing, no fabricated detail).

- [ ] **Step 2: Run to verify fail; implement GET comparison route**

Run: `npx pnpm vitest run "apps/web/app/api/comparisons/[id]"` → FAIL; implement: `parseComparisonId` → null → 404; `getComparison` null → 404; `getJourneys`; respond `{ comparison, journeys }`.

- [ ] **Step 3: Write failing artifact tests**

`artifacts/[artifactId]/route.test.ts`: (a) save known PNG bytes, GET → 200, `content-type: image/png`, bytes identical (read via `response.arrayBuffer()`); (b) unknown artifact → 404; (c) `artifactId` `..%2f..%2frecord.json` (decoded param `../../record.json`) → 404; (d) unknown comparison → 404.

- [ ] **Step 4: Run to verify fail; implement artifact route**

Run: `npx pnpm vitest run "apps/web/app/api/comparisons/[id]/artifacts"` → FAIL; implement with `artifactIdSchema.safeParse` first → 404; `getScreenshot` null → 404.

- [ ] **Step 5: Full unit suite + typecheck + lint**

Run: `npx pnpm test:unit && npx pnpm typecheck && npx pnpm lint`
Expected: all PASS (Phase 1 suites still green).

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/api/comparisons"
git commit -m "feat(web): serve comparison detail and screenshot artifacts"
```

---

### Task 8: UI — run action, live status, and evidence views

**Files:**
- Modify: `apps/web/components/scenario-launcher.tsx` (enable Run; replace `RunStatus`)
- Delete: `apps/web/components/run-status.tsx` (superseded — its "unavailable" copy is Phase 1-only)
- Create: `apps/web/components/comparison-detail.tsx` (client, polling)
- Create: `apps/web/components/journey-panel.tsx`
- Modify: `apps/web/app/comparisons/[id]/page.tsx` (server read → notFound or detail)
- Modify: `apps/web/app/comparisons/[id]/not-found.tsx` (Phase 2 copy)
- Modify: `apps/web/app/page.tsx` (hero/evidence copy — Phase 2 now executes)

**Interfaces:**
- Consumes: `GET/POST /api/comparisons` (Tasks 6–7), `ComparisonDetail`/`JourneyRecord` types, `ComparisonState`, existing Tailwind tokens (`journey-a`, `journey-b`, `success`, `warning`, `error`, `highlight`).
- Produces: no new exported APIs; component props:
  - `ComparisonDetail({ initial }: { initial: ComparisonDetail })` — `useState` seeded with `initial`; `useEffect` polls `fetch(/api/comparisons/${id})` every `750ms` while `status === "running"`; clears interval on unmount or terminal status; fetch failure → render `ComparisonState kind="error"` with a "Try again" button that re-polls.
  - `JourneyPanel({ journey, goalIndex }: { journey: JourneyRecord | undefined; goalIndex: 0 | 1 })` — renders per-goal: status badge (`completed`→`Completed` success, `failed`→`Failed` error, `timeout`→`Timed out` warning, `blocked`→`Blocked` warning, missing→`Waiting` neutral), `actionCount / expectedActionCount actions`, ordered event list (`stepNo`, label, `countsAsAction ? "action" : "step"`, outcome), `<img>` per screenshot (`src=/api/comparisons/<cmp>/artifacts/<id>`, `alt="Screenshot: <label>"`, `loading="lazy"`), `error` box when present.

Behavior specifics:
- Launcher Run button: enabled; states `idle | starting | error`; click → `POST /api/comparisons` with `{ scenarioId, goalIds: [goalA, goalB] }` → on 202 `router.push(\`/comparisons/${comparisonId}\`)`; on 400/429/network → inline honest message (`role="status"`) keeping the user on the launcher; button shows `Starting run…` while pending. Helper line under the buttons: `Runs execute locally against the benchmark app with fixed limits.` Keep the manual-exploration link unchanged.
- Comparison page (server): `getStore().getComparison(id)` → `null` → `notFound()` (preserves Phase 1 streaming/noindex behavior); else `<ComparisonDetail initial={{comparison, journeys}} />`.
- Not-found copy: title stays `No stored comparison`; description → `This ID has no stored run. Start a comparison from the scenario launcher to capture evidence.`
- Home copy: hero last sentence → `Phase 1 shipped the foundation; Phase 2 runs both sides of each choice and records the evidence.`; evidence section paragraph → `Comparisons now execute locally with the deterministic browser runner; metrics and explanations arrive in later phases.`

- [ ] **Step 1: Implement `journey-panel.tsx` and `comparison-detail.tsx`**

Per Interfaces; keyboard-visible focus on interactive elements (retry button), `aria-live="polite"` on the status banner, `role="status"` for the running state.

- [ ] **Step 2: Rework comparison page + not-found + home copy**

Server read via `getStore()`; `notFound()` on null; render detail otherwise.

- [ ] **Step 3: Rework launcher Run action; delete `run-status.tsx`**

Enable button, POST flow, honest error messages (400: `That request was not valid.`; 429: `Another comparison is still running. Wait for it to finish.`; network: `The comparison could not be started.`).

- [ ] **Step 4: Typecheck + lint + unit suite**

Run: `npx pnpm typecheck && npx pnpm lint && npx pnpm test:unit`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): show live comparison status and journey evidence"
```

---

### Task 9: End-to-end Phase 2 suite + Phase 1 assertion updates

**Files:**
- Create: `tests/e2e/phase-2.spec.ts`
- Modify: `tests/e2e/phase-1.spec.ts` (two tests superseded by Phase 2)

**Interfaces:**
- Consumes: running both apps via `playwright.config.ts` webServer; catalog `expectedActions` imported from `@choicemirror/contracts` (root devDep from Task 5).
- Produces: none (verification only).

Phase 1 test updates (assertions that Phase 2 intentionally changes):
- Test `launcher selects a controlled scenario and keeps automated runs disabled` → rename `launcher selects a controlled scenario and offers a working run action`: Run button `toBeEnabled()` instead of disabled; replace the `"The browser runner arrives in Phase 2"` assertion with visible helper text `Runs execute locally against the benchmark app with fixed limits.`; manual-link and external-request assertions unchanged.
- Test `missing comparison IDs show an honest unavailable state`: description assertion → `This ID has no stored run. Start a comparison from the scenario launcher to capture evidence.` (status 200 + noindex assertions unchanged).

New `phase-2.spec.ts` tests:
1. **API matrix — all four scenarios, both goals:** for each scenario in `scenarios` (import from contracts): `POST /api/comparisons` → 202; poll `GET /api/comparisons/<id>` every 500ms until `comparison.status !== "running"` (timeout 60s); assert `completed`; `journeys.length === 2`; journey goal ids equal `scenario.goals.map(g => g.id)` in order; per journey: `status === "completed"`, `actionCount === scenario.expectedActions.find(e => e.goalId === journey.goalId)!.count`, `expectedActionCount` same, `events` stepNo strictly increasing from 0, exactly `actionCount` events with `countsAsAction === true`, first `goal-selected` event present with `countsAsAction === false`, last event `type === "complete"`, `journeys[0].seed === journeys[1].seed`, equal `viewport` and `origin` (equivalent starting conditions), `screenshots.length >= actionCount + 3` (start, goal, steps, complete).
2. **Screenshot retrieval:** for the first journey's every screenshot id: `GET /api/comparisons/<id>/artifacts/<screenshotId>` → 200, `content-type` contains `image/png`, `arrayBuffer` byte length > 1000; PNG magic `subarray(0,4)` = `[137,80,78,71]`.
3. **UI run flow:** `/` → select `consent-asymmetric` radio → click `Run comparison` → URL matches `/comparisons/cmp_[a-f0-9]{16}` → wait for `Completed` status (heading/banner) → both journey panels visible: Goal A panel shows `1 / 1 actions`, Goal B panel shows `3 / 3 actions`, at least one `<img>` per panel with `naturalWidth > 0`, event lists visible.
4. **Invalid and missing inputs:** `POST` without `goalIds` → 400; `POST` with reversed goals `["leave","join"]` → 400 (goal-order pin preserved); `GET /api/comparisons/cmp_0000000000000000` → 404 `{ error: "Comparison not found." }`; `GET /api/comparisons/cmp_0000000000000000/artifacts/nope.png` → 404; encoded traversal `GET /api/comparisons/cmp_0000000000000000/artifacts/..%2f..%2frecord.json` → 404.
5. **Blocked external origin at the boundary:** `POST` body with an extra `origin: "https://evil.example"` key → 202 or 400 (schema strips unknown keys) AND the resulting comparison's journeys navigate only `http://localhost:3001` — assert every journey `origin === "http://localhost:3001"` after completion (proves user input cannot steer navigation).

Sequencing note: tests run serially (`fullyParallel: false`, 1 worker); each test awaits terminal status before finishing so the single-run 429 guard never trips across tests.

- [ ] **Step 1: Update the two Phase 1 assertions; run Phase 1 suite**

Run: `npx playwright test tests/e2e/phase-1.spec.ts`
Expected: 8 passed after updates.

- [ ] **Step 2: Write `phase-2.spec.ts`; run it**

Run: `npx playwright test tests/e2e/phase-2.spec.ts`
Expected: initially FAIL where defects exist; fix demonstrated Phase 2 defects only; re-run until all 5 pass. Record output.

- [ ] **Step 3: Full E2E suite**

Run: `npx pnpm test:e2e`
Expected: 13 passed (8 Phase 1 + 5 Phase 2) — plus runner-integration 4 → total 17. Record exact count.

- [ ] **Step 4: Commit**

```bash
git add tests
git commit -m "test(e2e): cover paired execution, evidence, and safety boundaries"
```

---

### Task 10: Documentation, docs consistency, and final verification

**Files:**
- Modify: `docs/Architecture.md` (target structure + API sketch reflect shipped reality; mark `agent/` and `metrics/` as planned Phase 3/4)
- Modify: `docs/Memory.md` (v0.4 change log, work-completed rows, decisions D-009…D-012)
- Modify: `docs/Phases.md` (Phase 2 status + exit gate evidence with verified counts)
- Modify: `README.md` (Phase 2 usage: run comparison, data dir, env vars, playwright install)
- Modify: `.env.example` (`BENCHMARK_ORIGIN`, `CHOICEMIRROR_DATA_DIR`)

Decisions to record in Memory: D-009 goal selection does not count as an action; D-010 file-backed JSON+PNG store behind `ComparisonStore` (swap-ready for SQLite later); D-011 async 202 + polling status model with single-flight 429 guard; D-012 injectable driver seam keeps unit tests browser-free.

- [ ] **Step 1: Update the four docs + env example**

Per Files list; Phases.md exit-gate evidence must quote the actual Step 2 command outputs (never pre-write counts).

- [ ] **Step 2: Full verification suite (fresh, exact commands)**

```bash
npx pnpm install --frozen-lockfile
npx pnpm typecheck
npx pnpm lint
npx pnpm test:unit
npx pnpm test:e2e
npx pnpm build
```
Expected: every command exits 0. Fix any failure introduced by Phase 2 changes before proceeding.

- [ ] **Step 3: Write Phases.md exit-gate evidence from Step 2 output**

- [ ] **Step 4: Commit docs**

```bash
git add docs README.md .env.example
git commit -m "docs: record phase 2 decisions, usage, and exit-gate evidence"
```

- [ ] **Step 5: Push branch and open PR (do not merge)**

```bash
git push -u origin feat/phase-2-browser-runner
gh pr create --base main --title "Phase 2: Browser execution and evidence capture" --body "..."
```
PR body: summary, test evidence (exact counts from Step 2), scope statement (Phase 2 only), checklist from the Definition of Done. Leave PR open for review.

---



