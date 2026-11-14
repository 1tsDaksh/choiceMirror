# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a fresh-clone-runnable Phase 1 slice with a scenario launcher, honest comparison states, and manually explorable controlled benchmark flows.

**Architecture:** A pnpm monorepo contains two Next.js apps on separate local origins and a shared Zod contracts package. The benchmark uses deterministic, local-only flow definitions; the web app exposes real loading/error/empty states and clearly disables automated runs until Phase 2.

**Tech Stack:** pnpm, strict TypeScript, Next.js App Router, React, Tailwind CSS, Zod, Vitest, Playwright, ESLint, GitHub Actions.

**Spec:** `PRD.md`, `Architecture.md`, `Design.md`, `Rules.md`, and `Phases.md` (Phase 1 only).

## Global Constraints

- Use strict TypeScript and validate API/untrusted values with Zod.
- Keep the benchmark local and synthetic; do not add third-party browsing, credentials, payments, or consequential submissions.
- Preserve the navy/teal/violet evidence-first visual system, keyboard access, visible focus, and reduced-motion support.
- Do not claim that automated comparisons or AI navigation work in Phase 1.
- Use small modules with separately testable catalog, flow, UI, and API responsibilities.
- Update `Memory.md` and `Phases.md` only with verified results.

## Review Focus

- Unknown or malformed scenario IDs must produce a controlled 404 rather than rendering a fixture; pin this in benchmark E2E tests.
- Reset and direct loads with the same seed must restore the same initial flow state; pin this in flow unit and E2E tests.
- An unavailable browser runner must disable the run CTA and explain why without creating a fake comparison; pin this in launcher and API tests.
- Keyboard users must be able to select scenarios and complete/reset every fixture; pin this in Playwright tests.
- Asymmetric variants must differ only in documented journey friction while balanced variants keep equal action counts; pin this in catalog/flow tests.

---

### Task 1: Workspace and Shared Scenario Contracts

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`, `.prettierignore`
- Modify: `.gitignore`
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/scenario.ts`, `packages/contracts/src/catalog.ts`, `packages/contracts/src/scenario.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `scenarioSchema`, `scenarioListSchema`, `comparisonRequestSchema`, `Scenario`, `Goal`, `ComparisonRequest`, `scenarios`, `getScenario(id: string): Scenario | undefined`.
- Scenario IDs: `membership-balanced`, `membership-asymmetric`, `consent-balanced`, `consent-asymmetric`.
- Goal IDs: membership `join`/`leave`; consent `accept`/`reject`.

- [x] **Step 1: Scaffold the workspace and install locked dependencies**

Configure root scripts for `dev`, `build`, `typecheck`, `lint`, `test:unit`, and `test:e2e`; register `apps/*` and `packages/*`; use Next.js on ports 3000/3001 in later tasks. Add safe placeholder-free environment documentation and ignore dependencies, builds, test artifacts, logs, and local env files.

Run: `npx --yes pnpm@12.18.0 install`
Expected: lockfile created with no dependency errors.

- [x] **Step 2: Write failing contract and catalog tests**

Test malformed API input rejection, unknown ID lookup, four unique scenarios, exact opposing goal pairs, and equal balanced expected action counts versus intentionally higher leave/reject counts in asymmetric variants.

- [x] **Step 3: Run tests to verify they fail**

Run: `npx pnpm vitest run packages/contracts/src/scenario.test.ts`
Expected: FAIL because the contract/catalog implementation does not exist.

- [x] **Step 4: Implement schemas and deterministic catalog**

Define Zod schemas and typed catalog entries with benchmark paths, descriptions, expected action counts (`1/1` balanced; join/accept `1`, leave/reject `3` asymmetric), and controlled-benchmark labels.

- [x] **Step 5: Run tests and strict typecheck**

Run: `npx pnpm vitest run packages/contracts/src/scenario.test.ts && npx pnpm --filter @choicemirror/contracts typecheck`
Expected: all contract tests and TypeScript pass.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts .env.example .gitignore .prettierignore packages/contracts
git commit -m "feat: add workspace and scenario contracts"
```

### Task 2: Controlled Benchmark Application

**Files:**
- Create: `apps/benchmark/package.json`, `apps/benchmark/tsconfig.json`, `apps/benchmark/next.config.ts`, `apps/benchmark/next-env.d.ts`, `apps/benchmark/postcss.config.mjs`, `apps/benchmark/eslint.config.mjs`
- Create: `apps/benchmark/app/layout.tsx`, `apps/benchmark/app/globals.css`, `apps/benchmark/app/page.tsx`, `apps/benchmark/app/[scenarioId]/page.tsx`, `apps/benchmark/app/[scenarioId]/not-found.tsx`
- Create: `apps/benchmark/components/choice-flow.tsx`, `apps/benchmark/lib/flows.ts`, `apps/benchmark/lib/flows.test.ts`

**Interfaces:**
- Consumes: `Scenario`, `scenarios`, and `getScenario` from Task 1.
- Produces: `getFlow(scenarioId: string): FlowDefinition | undefined`; `FlowDefinition` contains a start description and per-goal ordered action labels.
- Produces: `/` fixture index and `/[scenarioId]?seed=phase-1` manually navigable flows; `choice-flow.tsx` exposes buttons and a reset control using only local React state.

- [x] **Step 1: Write failing flow-definition tests**

Assert that all catalog scenarios have flows, balanced goals each contain one action, asymmetric leave/reject contain three actions, all flows begin at the same reset state, and unknown IDs return `undefined`.

- [x] **Step 2: Run tests to verify they fail**

Run: `npx pnpm vitest run apps/benchmark/lib/flows.test.ts`
Expected: FAIL because `flows.ts` does not exist.

- [x] **Step 3: Implement flow definitions and the minimal benchmark app**

Create the Next.js/Tailwind app and deterministic flow map. Render one step at a time with explicit goal labels, synthetic-state notices, action progress, completion text, and a reset button; never send form data or navigate externally. Validate `scenarioId` with `getScenario` and call `notFound()` for unknown IDs.

- [x] **Step 4: Run unit tests, lint, and typecheck**

Run: `npx pnpm vitest run apps/benchmark/lib/flows.test.ts && npx pnpm --filter @choicemirror/benchmark typecheck && npx pnpm --filter @choicemirror/benchmark lint`
Expected: all commands pass.

- [x] **Step 5: Commit**

```bash
git add apps/benchmark
git commit -m "feat: add controlled benchmark flows"
```

### Task 3: Scenario Launcher and Honest Comparison Shell

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/next-env.d.ts`, `apps/web/postcss.config.mjs`, `apps/web/eslint.config.mjs`
- Create: `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/page.tsx`, `apps/web/app/api/scenarios/route.ts`, `apps/web/app/api/comparisons/route.ts`, `apps/web/app/api/comparisons/route.test.ts`
- Create: `apps/web/app/comparisons/[id]/page.tsx`, `apps/web/app/comparisons/[id]/loading.tsx`, `apps/web/app/comparisons/[id]/error.tsx`, `apps/web/app/comparisons/[id]/not-found.tsx`
- Create: `apps/web/components/scenario-launcher.tsx`, `apps/web/components/comparison-state.tsx`, `apps/web/components/run-status.tsx`

**Interfaces:**
- Consumes: `scenarios`, `comparisonRequestSchema`, `Scenario` from Task 1.
- Produces: `GET /api/scenarios` returning `Scenario[]`; `POST /api/comparisons` returning validated `503 { error: "Browser runner is not available in Phase 1." }` and `400` for invalid input.
- Produces: scenario radio cards, benchmark links using `NEXT_PUBLIC_BENCHMARK_ORIGIN` (default `http://localhost:3001`), disabled run CTA with runner explanation, and real comparison loading/error/not-found states without fabricated metrics.

- [x] **Step 1: Write failing comparison API tests**

Call the route handler with valid and malformed JSON bodies; assert valid requests return the exact 503 unavailable response and malformed scenario/goal combinations return 400 without starting work.

- [x] **Step 2: Run tests to verify they fail**

Run: `npx pnpm vitest run apps/web/app/api/comparisons/route.test.ts`
Expected: FAIL because the route does not exist.

- [x] **Step 3: Implement the web app and API boundary**

Build the accessible dark launcher from the shared catalog, scenario descriptions, paired goal labels, controlled-benchmark badges, and external benchmark links. Implement the honest API response and comparison state components; use Next.js loading/error/not-found boundaries for `/comparisons/[id]`.

- [x] **Step 4: Run API tests, lint, and typecheck**

Run: `npx pnpm vitest run apps/web/app/api/comparisons/route.test.ts && npx pnpm --filter @choicemirror/web typecheck && npx pnpm --filter @choicemirror/web lint`
Expected: all commands pass.

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add scenario launcher and comparison states"
```

### Task 4: End-to-End Verification, CI, and Setup Documentation

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/phase-1.spec.ts`, `.github/workflows/ci.yml`
- Modify: `package.json`, `README.md`, `Phases.md`, `Memory.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: both apps and contracts from Tasks 1–3.
- Produces: reproducible fresh-clone commands and automated proof of launcher, all four manual flows, reset, unknown-scenario 404, keyboard operation, and unavailable-runner behavior.

- [x] **Step 1: Write the failing Phase 1 E2E smoke tests**

Configure Playwright to start web on 3000 and benchmark on 3001. Test scenario selection and disabled run explanation; exercise every balanced/asymmetric goal with the documented action counts; verify reset with a fixed seed; verify keyboard completion, unknown scenario handling, and absence of external requests.

- [x] **Step 2: Run E2E tests to establish any failures**

Run: `npx pnpm exec playwright install chromium && npx pnpm test:e2e`
Expected: tests execute against both real apps; fix only demonstrated Phase 1 defects before proceeding.

- [x] **Step 3: Add CI and exact local setup instructions**

Use pnpm/action-setup and actions/setup-node with Node 25, locked dependency installation, typecheck, lint, unit tests, Chromium installation, and E2E tests. Document two-app development, ports, environment configuration, tests, current limitations, and the fact that AI/browser automation are not implemented.

- [x] **Step 4: Run the complete verification suite and production builds**

Run: `npx pnpm typecheck && npx pnpm lint && npx pnpm test:unit && npx pnpm test:e2e && npx pnpm build`
Expected: every command exits successfully with no fabricated or skipped acceptance results.

- [x] **Step 5: Update phase status and project memory from verified evidence**

Record completed files, commands, test results, remaining Phase 2 work, and unresolved model/hosting/eligibility decisions. Do not mark later phases complete.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts tests .github README.md Phases.md Memory.md .env.example
git commit -m "test: verify phase 1 vertical slice"
```
