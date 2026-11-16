# ChoiceMirror

**See both sides of the click.**

ChoiceMirror is an AI-powered behavioural UX auditor for **SLAY HACKS 2026**. It compares opposing user journeys on the same interface—such as **join vs leave** or **accept vs reject**—and is designed to show measurable friction with inspectable browser evidence.

> **Current status:** Phase 3 is implemented. The repository runs two local applications, four controlled benchmark fixtures, and a Playwright runner with two execution modes: the deterministic runner (default) executes both opposing goals of any scenario from equivalent starting conditions, and the optional **AI (Nebius)** mode lets a real model observe each page and choose the next validated action. Structured evidence — ordered events, action counts, screenshots, and model-reported decisions with token usage — is stored locally and viewable in the app. Metrics and explanations are **not implemented yet** (Phase 4).

## What works now

- Accessible scenario launcher on the web app with a working **Run comparison** action.
- Four synthetic benchmark fixtures with balanced and asymmetric opposing flows.
- Deterministic Playwright runs: isolated browser contexts, fixed viewport and seed, domain allowlist, action/step/journey limits, and honest timeout/blocked/failed states with guaranteed cleanup.
- Stored comparison evidence: ordered trace events, accurate action counts, and PNG screenshots served through Zod-validated APIs.
- Live comparison status with per-goal evidence panels (status badge, action counts, ordered events, screenshots).
- Optional **AI (Nebius)** mode: the model observes each page and proposes the next action, which passes Zod schema validation and a policy gate before it can reach the browser; AI runs show a `Mode: AI · <model>` badge, per-event proposed/validated action chips with model-reported justification, and inference-call/token counters. Unconfigured AI runs fail with the server's explicit reason — never a silent fallback.
- Manual completion and deterministic reset for every goal.
- Honest loading, empty, error, and unavailable states.
- Automated tests covering contracts and APIs, all eight goal paths, keyboard activation, reset, 404s, external-request blocking, full paired browser runs, the AI loop against a local mock model (plan-leak canaries, controlled prompt injection, blocked origin), and AI-mode UI evidence.

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

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BENCHMARK_ORIGIN` | `http://localhost:3001` | Benchmark origin shown in launcher links |
| `BENCHMARK_ORIGIN` | `http://localhost:3001` | The only origin the browser runner may contact |
| `CHOICEMIRROR_DATA_DIR` | `./data` | Where comparison records and screenshots are stored |
| `NEBIUS_API_KEY` | *(unset)* | Server-side Nebius Token Factory key — **required only for AI mode** |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1` | OpenAI-compatible API base (tests repoint it at a local mock) |
| `NEBIUS_MODEL` | `zai-org/GLM-5.3-Flash` | Model used for AI-mode decisions |

Next.js reads these from `apps/web/.env.local` (gitignored) — copy `.env.example` and put the real key there; never commit a key. Without a key, deterministic runs work normally and starting an AI run shows the explicit **"AI mode is not configured."** error instead of falling back.

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

`pnpm test:e2e` runs the full mocked suite: the AI tests point the production client at a local mock model on port 3099, so no key and no credits are needed. Live inference is opt-in and never part of `test:e2e` or CI:

```powershell
$env:NEBIUS_LIVE = "1"   # plus NEBIUS_API_KEY in the environment
pnpm test:live
```

`pnpm test:live` runs all eight journeys against the real Nebius API and prints a JSON summary (success rate, tokens, inference calls, latency) from those real results only. Without both `NEBIUS_LIVE=1` and `NEBIUS_API_KEY` it reports `1 skipped` and spends nothing.

### Running a comparison

1. Start both apps with `pnpm dev`.
2. Open <http://localhost:3000>, select a scenario, choose the execution mode (**Deterministic** — the default — or **AI (Nebius)** when `NEBIUS_API_KEY` is configured), and press **Run comparison**.
3. The app executes both opposing goals sequentially and shows live status; each goal panel lists its status, action counts, ordered events, and screenshots (plus the AI-decisions block in AI mode).

Evidence is stored under `data/` (gitignored) by default — override the location with `CHOICEMIRROR_DATA_DIR`. The runner may only navigate `BENCHMARK_ORIGIN` (default <http://localhost:3001>): every other request — subresources, page-initiated fetches, and each hop of a redirect chain — is aborted at the request layer before it leaves the browser. Only one comparison runs at a time; the start guard is an atomic in-process reservation, so concurrent starts yield exactly one `202` and one `429`.

## Repository layout

```text
apps/
  web/             Comparison launcher, evidence UI, and API boundary
  benchmark/       Local synthetic controlled fixtures
packages/
  contracts/       Zod schemas and deterministic scenario catalog
  browser-runner/  Deterministic and AI Playwright journey executors
  storage/         File-backed comparison evidence store
  agent/           Nebius adapter (config, prompt, client, agent)
tests/
  e2e/             Two-server Playwright acceptance tests + local mock model
  live/            Opt-in live Nebius evaluation (pnpm test:live)
docs/
  superpowers/     Implementation plans
```

## Current limitations

- AI mode is optional and bounded: without `NEBIUS_API_KEY` only the deterministic runner is used, AI runs fail explicitly rather than falling back silently, and AI actions are limited to `click`/`stop` with 12 decisions, 6 rejections, and 50k tokens per journey.
- AI navigation runs only against the four controlled fixtures — no third-party sites, accounts, or real actions.
- Model-provided justifications are *model-reported*, not independently verified evidence; completion is always determined by the app, never by the model.
- Live AI results depend on real API credits; committed verification is offline against a local mock model (`pnpm test:e2e`), with `pnpm test:live` as the opt-in real check (not run — no `NEBIUS_API_KEY` at the time of writing).
- No metrics, scores, or explanations are computed yet (Phase 4).
- No third-party websites are visited; runs open only the local benchmark origin.
- No accounts, payments, real consent changes, personal data, or consequential submissions occur.
- The benchmark uses synthetic local state only.
- The `seed` is recorded in evidence and passed to the fixture URL; flows are deterministic by construction, so the seed does not perturb fixture state yet.
- Phase 2 does not make legal, manipulation, or dark-pattern claims.

## Planned delivery

The detailed milestone plan is in [Phases.md](./docs/Phases.md). Phase 2 added deterministic Playwright execution and stored, inspectable evidence; Phase 3 added opt-in AI navigation with policy-gated model decisions and labelled AI evidence. Later phases add deterministic metrics, evidence-linked comparison views, and submission materials.

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
