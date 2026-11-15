# ChoiceMirror

**See both sides of the click.**

ChoiceMirror is an AI-powered behavioural UX auditor for **SLAY HACKS 2026**. It compares opposing user journeys on the same interface—such as **join vs leave** or **accept vs reject**—and is designed to show measurable friction with inspectable browser evidence.

> **Current status:** Phase 2 is implemented. The repository runs two local applications, four controlled benchmark fixtures, and a deterministic Playwright runner that executes both opposing goals of any scenario from equivalent starting conditions. Structured evidence — ordered events, action counts, and screenshots — is stored locally and viewable in the app. AI navigation, metrics, and explanations are **not implemented yet** (Phases 3–4).

## What works now

- Accessible scenario launcher on the web app with a working **Run comparison** action.
- Four synthetic benchmark fixtures with balanced and asymmetric opposing flows.
- Deterministic Playwright runs: isolated browser contexts, fixed viewport and seed, domain allowlist, action/step/journey limits, and honest timeout/blocked/failed states with guaranteed cleanup.
- Stored comparison evidence: ordered trace events, accurate action counts, and PNG screenshots served through Zod-validated APIs.
- Live comparison status with per-goal evidence panels (status badge, action counts, ordered events, screenshots).
- Manual completion and deterministic reset for every goal.
- Honest loading, empty, error, and unavailable states.
- Automated tests covering contracts and APIs, all eight goal paths, keyboard activation, reset, 404s, external-request blocking, and full paired browser runs.

## Local setup

Requirements:

- Node.js 25 or newer
- npm (included with Node.js)
- pnpm 12.18.0

From a fresh clone on Windows (PowerShell):

```powershell
npm install --global pnpm@12.18.0
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
copy .env.example .env.local
pnpm dev
```

From a fresh clone on macOS or Linux:

```bash
npm install --global pnpm@12.18.0
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cp .env.example .env.local
pnpm dev
```

The environment file is optional because safe local defaults are built in. Comparison runs need Playwright's Chromium browser, installed once with `pnpm exec playwright install chromium`.

Open:

- Web app: <http://localhost:3000>
- Controlled benchmark: <http://localhost:3001>

To stop both development servers, interrupt the `pnpm dev` process.

### Individual commands

```powershell
pnpm --filter @choicemirror/web dev
pnpm --filter @choicemirror/benchmark dev
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

`pnpm build` creates production builds for both applications.

### Running a comparison

1. Start both apps with `pnpm dev`.
2. Open <http://localhost:3000>, select a scenario, and press **Run comparison**.
3. The app executes both opposing goals sequentially with the deterministic runner and shows live status; each goal panel lists its status, action counts, ordered events, and screenshots.

Evidence is stored under `data/` (gitignored) by default — override the location with `CHOICEMIRROR_DATA_DIR`. The runner may only navigate `BENCHMARK_ORIGIN` (default <http://localhost:3001>). Only one comparison runs at a time; starting another while one is active returns `429`.

## Repository layout

```text
apps/
  web/             Comparison launcher, evidence UI, and API boundary
  benchmark/       Local synthetic controlled fixtures
packages/
  contracts/       Zod schemas and deterministic scenario catalog
  browser-runner/  Deterministic Playwright journey executor
  storage/         File-backed comparison evidence store
tests/
  e2e/             Two-server Playwright acceptance tests
docs/
  superpowers/     Implementation plans
```

## Current limitations

- No AI model or model credentials are used; journeys follow fixed scripted flows (Phase 3 adds AI navigation).
- No metrics, scores, or explanations are computed yet (Phase 4).
- No third-party websites are visited; runs open only the local benchmark origin.
- No accounts, payments, real consent changes, personal data, or consequential submissions occur.
- The benchmark uses synthetic local state only.
- The `seed` is recorded in evidence and passed to the fixture URL; flows are deterministic by construction, so the seed does not perturb fixture state yet.
- Phase 2 does not make legal, manipulation, or dark-pattern claims.

## Planned delivery

The detailed milestone plan is in [Phases.md](./docs/Phases.md). Phase 2 added deterministic Playwright execution and stored, inspectable evidence. Later phases add a structured AI navigation policy, deterministic metrics, evidence-linked comparison views, and submission materials.

## Design and requirements

Spec documents live in [`docs/`](./docs/):

1. [PRD.md](./docs/PRD.md) — requirements, users, MVP scope, and acceptance criteria
2. [Architecture.md](./docs/Architecture.md) — intended modules, workflows, and deployment boundaries
3. [Rules.md](./docs/Rules.md) — engineering, safety, measurement, and scope constraints
4. [Phases.md](./docs/Phases.md) — milestone plan and delivery gates
5. [Design.md](./docs/Design.md) — visual identity, typography, layout, and accessibility
6. [Memory.md](./docs/Memory.md) — decisions, verified progress, blockers, and change log

## External dependencies

Original project code is developed for this repository. The implementation uses clearly attributable open-source dependencies selected in `docs/Architecture.md` and `package.json`, including Next.js, React, Tailwind CSS, Zod, Playwright, Vitest, TypeScript, and ESLint.

## SLAY HACKS 2026

[Event page](https://slayy-hacks.devpost.com/) · [Official rules](https://slayy-hacks.devpost.com/rules)

- **Displayed deadline:** 7 December 2026, 5:00 pm EST (10:00 pm GMT). Submit early.
- **Eligibility:** the public event page indicates students only and above the local age of majority. Confirm every participant's eligibility on Devpost.
- **Judging:** the rules page and public judging section display different rubrics. Verify the governing criteria with organizers and prepare for both.

Build original work during the eligible development window, identify external libraries and models clearly, demonstrate only implemented features, and keep credentials and personal information out of Git history and public evidence.
