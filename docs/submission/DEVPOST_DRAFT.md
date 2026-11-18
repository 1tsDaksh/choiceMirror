# DEVPOST_DRAFT — ChoiceMirror (SLAY HACKS 2026)

> **Status: DRAFT — ready to transfer into Devpost. Nothing has been submitted or
> published**, and no platform has confirmed acceptance. Field structure follows spec §11.
> Citations in `[brackets]` name the verified artefact behind each claim — they are
> evidence references for the team, not text to paste into Devpost.
> Prepared 2026-11-18 on branch `feat/phase-5-final-validation`.

---

## Project name

**ChoiceMirror**

## Tagline

**See both sides of the click.**

## Problem

Every day we make opposing digital choices — join or leave, accept or reject — but the two
sides of the same choice rarely cost the same effort. One direction is often a single
click; the other is a gauntlet of confirmations, review steps, and re-prompts. Teams
suspect this friction and regulators debate it, yet the evidence is usually anecdote:
screenshots without provenance, opinions without measurement, or one-sided manual testing
that never runs *both* directions under matched conditions. We needed a way to **measure**
the asymmetry of opposing choices and keep the browser evidence behind every number, so a
difference can be inspected rather than asserted.

## Solution

ChoiceMirror is an AI-assisted behavioural UX auditor that executes **both sides of a
choice** under matched conditions and links every reported difference to inspectable
evidence. A user picks a scenario — for example *Join vs leave* — and an execution mode:
the deterministic runner replays the app's validated action plan, or **AI (Nebius)** mode
lets a real model (`zai-org/GLM-5.3-Flash`) observe each page and choose the next
validated action. Both opposing goals run sequentially in controlled browsers against a
synthetic local benchmark, and every run produces ordered trace events, accurate action
counts, per-step screenshots, and model-reported decisions with token usage. A comparison
dashboard then derives deterministic metrics — action counts, the difference, an action
burden ratio — and exactly one evidence-linked finding you can open down to the supporting
events and screenshots. When evidence is missing, failed, or mismatched, the tool says
*inconclusive* — never a fake zero.

## How it works

1. **Select a scenario and mode.** The launcher lists four controlled scenarios
   (membership and consent, each in balanced and asymmetric variants) with their opposing
   goals, plus the execution mode: Deterministic or AI (Nebius). `[VALIDATION_REPORT.md §8.1]`
2. **Run both opposing goals.** A Playwright runner executes Goal A and Goal B
   sequentially from equivalent starting conditions (matched seed), each in a fresh,
   isolated browser context pinned to the benchmark origin by a fail-closed request-layer
   allowlist. In AI mode the loop is: observe the page → the Nebius model proposes a
   structured action → Zod schema validation and a policy gate check it → only then does
   the runner execute the click. `[SECURITY_REVIEW.md — AI security & browser security rows; LIVE_TEST_RESULTS.md §4.1]`
3. **Store the evidence.** Ordered trace events (goal selection never counts as an
   action), successful-click action counts with step deduplication, and a real PNG
   screenshot at each checkpoint are stored locally and served through Zod-validated APIs.
   `[SECURITY_REVIEW.md — evidence integrity rows]`
4. **Derive the comparison honestly.** A pure metrics engine computes per-journey counts
   and paired comparison metrics, withholds any difference unless both journeys completed
   under matching conditions, validates every finding's evidence references against the
   stored detail, and degrades to a single "insufficient evidence" finding on corruption.
   The dashboard shows the finding, mirrored Goal A/B tracks, a selectable evidence
   inspector (screenshot, timestamp, outcome, model-reported justification), and a
   methodology panel — with keyboard access, WCAG AA contrast, and honest states for
   running, failed, corrupt, and mismatched-seed runs. `[VALIDATION_REPORT.md §8.2, §8.3]`

**To run it:** clone the repo, `pnpm install --frozen-lockfile`, `pnpm exec playwright install chromium`, copy `.env.example` to `apps/web/.env.local` (AI mode only needs `NEBIUS_API_KEY`, which you obtain from the Nebius Token Factory console; the key is read server-side and never committed), `pnpm dev`, open `http://localhost:3000`, pick a scenario, choose a mode, press **Run comparison**. Full instructions: `README.md` (fresh-clone setup for Windows, macOS, and Linux).

## Technology

TypeScript, Next.js, React, Tailwind CSS, Playwright, Zod, Vitest, and the **Nebius Token Factory** API (model `zai-org/GLM-5.3-Flash`, OpenAI-compatible endpoint). Monorepo layout: `apps/web` (launcher, dashboard, API boundary), `apps/benchmark` (synthetic controlled fixtures), `packages/contracts` (Zod schemas + scenario catalog), `packages/browser-runner` (deterministic and AI executors), `packages/storage` (file-backed evidence store), `packages/agent` (Nebius adapter: config, constant versioned prompt, typed client with error taxonomy and token budgets), `packages/metrics` (pure metrics/findings/evidence validation). All third-party libraries are listed and attributable in `README.md`. `[README.md — Repository layout, External dependencies]`

## What makes it different

Most "AI evaluates UX" demos produce a verdict: a model looks at a page and asserts an
opinion. ChoiceMirror produces **measurement with provenance**. Rather than relying on
screenshots or subjective AI judgments, it executes both choices and retains the browser
evidence needed to evaluate each difference:

- **The model proposes; it never acts alone and never grades itself.** Every proposal
  passes schema + policy validation, executes through a hardened browser driver, and
  completion is decided by the app's own page check — never by a model claim. Metrics are
  computed deterministically from recorded events, so AI execution cost is reported
  separately from interface friction. `[SECURITY_REVIEW.md — "Model-provided claims never become verified facts"]`
- **Every number opens to its evidence.** The finding "Leaving required 2 more actions
  than joining" resolves to Goal A · step 2 and Goal B · steps 2,3,4, each with its stored
  screenshot and the model's justification (labelled *model-reported, not verified*).
  `[VALIDATION_REPORT.md §8.2 D5–D6; assets/06-evidence-inspector.png]`
- **Honesty is structural.** Failed, partial, corrupt, or mismatched-condition runs render
  explicit inconclusive states and withhold the difference — there is no path by which bad
  evidence yields a confident number. `[VALIDATION_REPORT.md §8.2 D9]`

## Responsible AI

- **Bounded autonomy.** AI actions are restricted to validated `click`/`stop` proposals on
  controlled benchmark pages; invalid or out-of-policy proposals are rejected, and a
  rejection budget stops runaway loops. Prompt injection cannot override the navigation
  policy — the policy gate is code, not prompt, and a controlled injection test shows an
  injected instruction reaching the model while the journey still fails honestly.
  `[SECURITY_REVIEW.md — AI security rows]`
- **Clear labelling.** AI runs carry a `Mode: AI · <model>` badge; model justifications
  render as "MODEL-REPORTED (NOT VERIFIED)"; token/inference counts are presented as
  execution cost, not a friction measure. `[VALIDATION_REPORT.md §8.2 D7]`
- **No silent fallback.** Without credentials or on mid-run misconfiguration, an AI run
  fails with the server's explicit reason — it never quietly becomes deterministic.
  `[SECURITY_REVIEW.md — "Failures are not silently represented as success"]`
- **Credential hygiene.** The API key lives only in a gitignored local env file, is read
  server-side, never appears in client bundles or logs; the submission assets passed a
  key/Bearer sweep. `[SECURITY_REVIEW.md — "API credentials stay server-side"; SUBMISSION_CHECKLIST.md §4]`

## Challenges

- **Model output reliability** — reasoning tokens count against the output cap, so a
  too-small cap fails deterministically; we diagnosed a real truncation failure in live
  testing, raised the cap, and pinned the behaviour with tests. `[docs/Memory.md — 2026-11-16 PR #4]`
- **Secure browser execution** — fail-closed origin pinning, hop-by-hop redirect walks,
  service-worker blocking, fresh isolated contexts, and guaranteed cleanup on every
  failure path, all verified by dedicated probes. `[SECURITY_REVIEW.md — browser security rows, probes P2/P3]`
- **Accurate evidence capture** — ensuring goal selection, backtracking, and duplicate or
  non-click events can never inflate an action count, and that corrupt or partial records
  degrade honestly instead of producing fake numbers. `[SECURITY_REVIEW.md — evidence integrity rows]`
- **Fair comparison methodology** — comparative numbers appear only under matched
  conditions (same seed, both completed), with observed vs calculated vs interpreted
  values separated and limitations stated in the product itself. `[VALIDATION_REPORT.md §8.2 D8]`

## Accomplishments

*(Implemented and verified features only; every claim cites its artefact.)*

- **Real AI navigation, end to end.** Two genuine AI comparisons executed through the
  real web UI with real Nebius inference — run `cmp_04cbef31ed3a44c7` (asymmetric: join
  **1** action / leave **3**, difference **2**, 6 inference calls, 0 rejected) and run
  `cmp_dfe25737c0937557` (balanced: **1 / 1**, difference **0**, 4 inference calls) —
  each verified real from the stored records (`mode: "ai"`, `modelErrors: []`, per-event
  model evidence, no deterministic fallback). `[VALIDATION_REPORT.md §8.4]`
- **Live eight-journey evaluation against the real API: 8/8 completed**, 20 inference
  calls, 13 590 tokens, zero errors, single attempt; smoke checks confirmed endpoint
  auth (HTTP 200 in 186 ms) and bounded structured inference (~1 s). `[LIVE_TEST_RESULTS.md §4.1–4.2]`
- **Live repeatability: 12/12 paired records (24 journeys) completed** across 3 rounds
  with every scenario × goal combination producing an identical action count round over
  round and `errors: []`. `[LIVE_TEST_RESULTS.md §6]`
- **Full UX validation: 22/22 spec bullets PASS** on the real running app — homepage
  comprehension, comparison dashboard correctness, accessibility (keyboard, focus
  indicators, alt text, WCAG AA contrast, reduced motion, responsive stacking). `[VALIDATION_REPORT.md §8.1–8.3]`
- **Security & reliability audit: 30/30 spec bullets VERIFIED, zero defects** — origin
  allowlist, prompt-injection resistance, credential containment, evidence integrity,
  honest failure handling, plus 212/212 unit tests re-run green during the audit. `[SECURITY_REVIEW.md]`
- **Test suite: 212 unit tests (31 files) and 52 Playwright E2E tests** green at the last
  full gate re-run; live suites are opt-in (`pnpm test:live`) and never spend credits in
  CI. `[docs/Memory.md — 2026-11-17 PR #5; docs/Phases.md]`
- **Genuine, provenance-backed screenshots: 7/7** captured from the live app against real
  stored run records, each visually swept clean of credentials and PII. `[assets/PROVENANCE.md]`
- **Honest demo materials.** A complete 4:00 demo script with shot list and narration; the
  recording is **honestly unavailable** (two genuine capture attempts failed at the
  headless-screencast layer and were rejected after frame verification — no video is
  claimed or substituted). `[DEMO_SCRIPT.md]`

## Future improvements

*Not part of the current product — directions this could grow:*

- **Runs against operator-authorized staging environments** beyond the four local fixtures,
  to measure friction on real product surfaces under the same evidence discipline.
- **Richer friction signals** — timing distributions, backtracking and dead-end capture,
  and repeated-run statistics with confidence intervals (today: one run per comparison,
  action counts only).
- **Wider AI-provider support** (the agent adapter is provider-shaped already) and
  cost/latency comparison across models.
- **Team features** — shared run libraries, finding annotations, and regression tracking
  across product versions.
- **A working screen recording of the demo script**, once a capture environment is
  available (the script and shot list are ready now).

## Limitations

- **Controlled benchmarks only.** All results describe measured behaviour on four
  synthetic local fixtures; they say nothing about any real product or service.
- **Measurements do not prove intentional manipulation or legal noncompliance.** Action
  differences are descriptive measurements of recorded browser actions for a single run —
  not a manipulation score, not a legal verdict.
- **Trace semantics.** Counts reflect recorded successful clicks; backtracking,
  interruptions, and dead ends are not captured (reported as not captured, never as zero).
- **Model evidence is model-reported.** AI justifications are recorded as reported, not
  independently verified; completion is always decided by the app, never the model.
- **Single-run statistics.** No confidence intervals; repeatability was evaluated within
  the available live credit budget (12 paired records × 3 rounds, documented above).
- **Demo recording unavailable** in this environment; the submission relies on the script,
  screenshots, and a runnable local demo until a capture can be produced externally.

---

*Draft prepared for transfer into Devpost. Submit only after the owner's explicit
approval — see `SUBMISSION_CHECKLIST.md` owner actions O1–O5.*
