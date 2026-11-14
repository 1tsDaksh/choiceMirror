# ChoiceMirror

**See both sides of the click.**

ChoiceMirror is an AI-powered behavioural UX auditor for **SLAY HACKS 2026**. It compares opposing user journeys on the same interface—such as **join vs leave** or **accept vs reject**—and is designed to show measurable friction with inspectable browser evidence.

> **Current status:** Phase 1 foundation is implemented. The repository runs two local applications and four controlled benchmark fixtures. AI navigation, automated Playwright journeys, stored comparisons, metrics, and evidence capture are **not implemented yet**.

## What works now

- Accessible scenario launcher on the web app.
- Four synthetic benchmark fixtures with balanced and asymmetric opposing flows.
- Manual completion and deterministic reset for every goal.
- Honest loading, empty, error, and unavailable states.
- Automated tests covering all eight goal paths, keyboard activation, reset, 404s, and external-request blocking.

## Local setup

Requirements:

- Node.js 25 or newer
- npm (included with Node.js)
- pnpm 12.18.0

From a fresh clone:

```powershell
npm install --global pnpm@12.18.0
pnpm install --frozen-lockfile
copy .env.example .env.local
pnpm dev
```

The environment file is optional because safe local defaults are built in.

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

## Repository layout

```text
apps/
  web/          Comparison launcher and API boundary
  benchmark/    Local synthetic controlled fixtures
packages/
  contracts/    Zod schemas and deterministic scenario catalog
tests/
  e2e/          Two-server Playwright acceptance tests
docs/
  superpowers/  Implementation plans
```

## Current limitations

- No AI model or model credentials are used.
- No browser automation or stored comparison runs exist yet.
- The **Run comparison** control is intentionally disabled.
- No third-party websites are visited.
- No accounts, payments, real consent changes, personal data, or consequential submissions occur.
- The benchmark uses synthetic local state only.
- Phase 1 does not make legal, manipulation, or dark-pattern claims.

## Planned delivery

The detailed milestone plan is in [Phases.md](./Phases.md). Later phases add isolated Playwright execution, a structured AI navigation policy, deterministic metrics, evidence-linked comparison views, and submission materials.

## Design and requirements

1. [PRD.md](./PRD.md) — requirements, users, MVP scope, and acceptance criteria
2. [Architecture.md](./Architecture.md) — intended modules, workflows, and deployment boundaries
3. [Rules.md](./Rules.md) — engineering, safety, measurement, and scope constraints
4. [Phases.md](./Phases.md) — milestone plan and delivery gates
5. [Design.md](./Design.md) — visual identity, typography, layout, and accessibility
6. [Memory.md](./Memory.md) — decisions, verified progress, blockers, and change log

## External dependencies

Original project code is developed for this repository. The implementation uses clearly attributable open-source dependencies selected in `Architecture.md` and `package.json`, including Next.js, React, Tailwind CSS, Zod, Playwright, Vitest, TypeScript, and ESLint.

## SLAY HACKS 2026

[Event page](https://slayy-hacks.devpost.com/) · [Official rules](https://slayy-hacks.devpost.com/rules)

- **Displayed deadline:** 7 December 2026, 5:00 pm EST (10:00 pm GMT). Submit early.
- **Eligibility:** the public event page indicates students only and above the local age of majority. Confirm every participant's eligibility on Devpost.
- **Judging:** the rules page and public judging section display different rubrics. Verify the governing criteria with organizers and prepare for both.

Build original work during the eligible development window, identify external libraries and models clearly, demonstrate only implemented features, and keep credentials and personal information out of Git history and public evidence.
