# ChoiceMirror

**See both sides of the click.**

[**Live demo**](https://choicemirror-production.up.railway.app) · [**Example comparison**](https://choicemirror-production.up.railway.app/comparisons/cmp_b1594335d7a8207b) · [**SLAY HACKS 2026**](https://slayy-hacks.devpost.com/)

ChoiceMirror is my evidence-first tool for comparing the friction on opposite sides of a digital choice: **join versus leave**, or **accept versus reject**. Instead of asking a model whether a page feels manipulative, ChoiceMirror **tests both journeys in a real browser**, counts the actions that occurred, and keeps the screenshots and trace events behind the result.

I maintain this repository at [@1tsDaksh](https://github.com/1tsDaksh). The demo is live on Railway; the source, tests and validation records are available here.

> **Scope:** The current product evaluates four deliberately designed **synthetic benchmark scenarios**, not arbitrary websites. Differences in action counts do not establish intent, illegal conduct, or accessibility compliance.

## Try the live demo

1. Open [ChoiceMirror](https://choicemirror-production.up.railway.app).
2. Select **Join vs leave — asymmetric** or **Accept vs reject — asymmetric**. Balanced versions are available as controls.
3. Choose **AI (Nebius)** to let the model observe each benchmark page and propose the next action. The web server validates each proposal before Playwright can execute it.
4. Inspect the comparison dashboard: action counts, mirrored journey timelines, screenshots, model-reported decisions and the methodology behind the finding.

The hosted service uses a private server-side Nebius key. To protect credits and keep runs reproducible, the public demo limits usage to **12 AI comparison requests per UTC day**, **30 total comparisons per day**, **3 requests per visitor**, and **one running comparison at a time** by default. Visitors cannot provide arbitrary URLs or prompts. These limits may cause a temporary `429` response; [the verified recording workflow](docs/submission/VIDEO_RECORDING.md) offers an alternative walkthrough.

## Example results

| Synthetic scenario | First goal | Opposing goal | Recorded difference |
| --- | ---: | ---: | ---: |
| Membership — balanced | Join: 1 action | Leave: 1 action | 0 |
| Membership — asymmetric | Join: 1 action | Leave: 3 actions | 2 |
| Consent — balanced | Accept: 1 action | Reject: 1 action | 0 |
| Consent — asymmetric | Accept: 1 action | Reject: 3 actions | 2 |

The figures are **observed action counts on controlled fixtures**, not predictions of how users behave on other sites. In a recorded genuine Nebius AI walkthrough, the membership-asymmetric pair completed with **2 model calls for Join** and **4 for Leave**, and the balanced pair completed with **2 calls each**. The [successful recording run](https://github.com/1tsDaksh/choiceMirror/actions/runs/44538869335) preserves that provenance; the downloadable GitHub Actions artifact is time-limited.

An earlier eight-journey real-model evaluation completed **8/8 journeys** with **20 inference calls**; a repeatability sweep completed **12 paired comparisons / 24 journeys** across three runs per scenario. See [live evaluation results](docs/submission/LIVE_TEST_RESULTS.md), [UI validation](docs/submission/VALIDATION_REPORT.md), and [security review](docs/submission/SECURITY_REVIEW.md).

## How it works

```text
Scenario selection
    ↓
Two opposing goals from matched starting conditions
    ↓
Nebius model observes the benchmark and proposes an action
    ↓
Zod schema validation + fixed action policy
    ↓
Playwright clicks the approved element in an isolated browser
    ↓
Events, model metadata and real PNG screenshots are recorded
    ↓
Deterministic metrics + evidence-linked comparison dashboard
```

The model **proposes** actions; it does not execute arbitrary code or decide whether the interface is unfair. A fixed policy restricts actions to observed controls on the local benchmark origin. The metrics engine calculates differences from actual browser events. If either journey fails, is incomplete, or has invalid evidence, comparative metrics are withheld rather than fabricated.

**Stack:** TypeScript, Next.js, React, Tailwind CSS, Playwright Chromium, Zod, Vitest, pnpm, Nebius Token Factory (`zai-org/GLM-5.3-Flash`), Docker and Railway. The model and third-party dependencies are identified explicitly; their inclusion does not imply that model output is verified fact.

## Local development

**Prerequisites:** Node.js 25+, pnpm 12.18.0 and Playwright Chromium.

```bash
git clone https://github.com/1tsDaksh/choiceMirror.git
cd choiceMirror
npm install --global pnpm@12.18.0
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev
```

Open the app at **http://localhost:3000** and the synthetic benchmark at **http://localhost:3001**. Deterministic comparisons work without credentials.

To run real AI locally, create **`apps/web/.env.local`** (gitignored) and set `NEBIUS_API_KEY` using the private key from Nebius Token Factory. The default model is `zai-org/GLM-5.3-Flash`. Never put a key in a browser environment variable, source file, issue, or pull request.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the web and benchmark servers |
| `pnpm typecheck` | Validate TypeScript |
| `pnpm lint` | Run lint checks |
| `pnpm test:unit` | Unit tests |
| `pnpm test:e2e` | Playwright tests, including a local mock model; no paid inference |
| `pnpm build` | Build both Next.js applications |
| `pnpm test:live` | Optional live Nebius tests; requires `NEBIUS_LIVE=1` and `NEBIUS_API_KEY` in the test process environment |

The optional repeatability suite additionally requires `NEBIUS_LIVE_REPEAT=1` and consumes real API credits. CI does **not** require or spend a Nebius key.

## Codebase

```text
apps/web/              Public app, comparison API and evidence dashboard
apps/benchmark/        Synthetic membership and consent fixtures
packages/contracts/   Zod schemas, scenario catalog and action policy
packages/agent/       Nebius client and validated proposal adapter
packages/browser-runner/   Playwright journey execution and origin guard
packages/metrics/     Deterministic comparisons, findings and validation
packages/storage/     File-backed records and screenshots
tests/e2e/            Browser acceptance tests
tests/live/           Opt-in real-model evaluation
docs/                 Architecture, product and design references
docs/submission/      Demonstration, verification and submission materials
```

On Railway, the web app and private loopback-only benchmark share a **single long-running container**. Comparison records, screenshots and daily usage counts live on a persistent `/data` volume. The one-replica restriction is intentional: the current runner and quota guard are single-process. See [deployment and operations](docs/submission/PUBLIC_DEMO_DEPLOYMENT.md).

## Reading the evidence

A completed comparison has a header identifying its scenario and execution mode, a main evidence-linked finding, action-count metrics, two mirrored step timelines, and a screenshot inspector. It separates:

- **Observed:** browser events and screenshots.
- **Calculated:** successful-click counts, differences and action-burden ratios.
- **Model-reported:** the AI's proposed action and justification, labelled as such.

The ratio uses `(max(actionsA, actionsB) + 1) / (min(actionsA, actionsB) + 1)`. It is a descriptive measure for a completed pair, not a manipulation score. Model latency, backtracking and interruptions are not treated as human effort or invented when unobserved.

## Limitations and responsible use

- Current results apply only to **four synthetic benchmarks** with controlled starting conditions.
- Each displayed comparison is one pair of journeys; historical repeatability tests do not establish statistical performance on unseen sites.
- No third-party websites, accounts, payment transactions or consequential user data are involved.
- Model proposals may be wrong; the browser policy, completed-state checks and deterministic metrics provide independent constraints.
- Live model calls incur usage costs; quotas protect the demo but do not guarantee a monetary ceiling. Provider-side spending limits are recommended.
- The application neither determines legal compliance nor proves intentional manipulation.

## Documentation

[Architecture](docs/Architecture.md) · [Product scope](docs/PRD.md) · [Design system](docs/Design.md) · [Engineering standards](docs/ENGINEERING.md) · [Real-model evaluation](docs/submission/LIVE_TEST_RESULTS.md) · [Validation](docs/submission/VALIDATION_REPORT.md) · [Security](docs/submission/SECURITY_REVIEW.md) · [Screenshot provenance](docs/submission/assets/PROVENANCE.md) · [Submission checklist](docs/submission/SUBMISSION_CHECKLIST.md)

**SLAY HACKS 2026:** [Event](https://slayy-hacks.devpost.com/) · [Rules](https://slayy-hacks.devpost.com/rules). Submission deadline listed in the project checklist: **7 December 2026, 17:00 EST / 22:00 GMT**. Eligibility, final media link and submission confirmation must be completed through Devpost.
