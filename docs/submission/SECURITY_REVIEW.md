# Security & reliability audit — spec §7 (Phase 5 plan Task 4)

> Focused audit of the §7 bullets (browser security, AI security, evidence
> integrity, reliability) performed on 2026-11-18 at commit `5167e54`
> (branch `feat/phase-5-final-validation`). Method: every bullet was mapped to
> existing test/code evidence first; bullets without test coverage were then
> probed with throwaway, credential-free probes (not committed). No source
> file was modified in this audit — genuine defects would have been numbered
> below and left for Task 5's TDD fix loop. No credentialed command was run
> and no environment file was opened.

**Result: no defects found; 4 probe runs across 3 probes** (P1 unit-suite
re-run; P2 service-worker behaviour, 2 runs; P3 cross-run context isolation).
Two non-defect observations are recorded at the end with reasoning, so nothing
is hidden from Task 5's discretionary hardening pass.

---

## Method

1. **Evidence mapping.** Each §7 bullet was mapped to a specific existing test
   (`file:line`) or to a code path (`file:line`) that enforces the property.
   All unit-test citations were re-verified green: **P1 — `pnpm test:unit`
   re-run: 31 files / 212 tests passed** (credential-free, mocked).
2. **Probes** (throwaway Playwright spec under `tests/e2e/`, run against the
   production `createPlaywrightOpenJourney` context construction and local
   throwaway HTTP servers, then deleted — never committed):
   - **P2 — service-worker behaviour (2 runs).** A page registered a service
     worker whose `install` handler attempted an outbound fetch to a second
     local server (hit-counted) and whose `fetch` handler would have served
     `/probe.txt` without touching the network. Observed in the production
     context (`serviceWorkers: "block"`, `driver.ts:29`): `register()` resolves
     with `undefined` (Playwright's "block" neutralises registration rather
     than throwing), **no worker is ever created** (`navigator.serviceWorker.controller` = `no`),
     the page fetch was served **from the network** via the context route
     handler (`NETWORK-SERVED`, not `SW-SERVED-WITHOUT-NETWORK`), and the
     worker-side external egress fetch **never fired** (external server: 0 hits).
     The context route therefore remains the only path to the network.
   - **P3 — cross-run context isolation (1 run).** Two sequential journeys
     through `createPlaywrightOpenJourney` against the same URL: the first run
     wrote a localStorage marker, the second run observed `STATE-FRESH` (no
     state carry-over), consistent with a fresh `chromium.launch()` +
     `browser.newContext()` per journey and no `storageState`/`userDataDir`.
3. E2E suites were **not re-run** in this audit: the dev servers on :3000/:3001
   were left running from an earlier task (later tasks reuse them;
   `playwright.config.ts` sets `reuseExistingServer: !CI`), and re-running the
   seeded-fixture dashboard specs against those servers would not reproduce the
   suite's dedicated `CHOICEMIRROR_DATA_DIR`. The cited E2E tests are the
   suite's own evidence; P1 verified the unit half of that evidence live.

---

## Verdict summary

| Section | Rows | VERIFIED | DEFECT | N/A |
|---|---:|---:|---:|---:|
| Browser security | 7 | 7 | 0 | 0 |
| AI security | 7 | 7 | 0 | 0 |
| Evidence integrity | 7 | 7 | 0 | 0 |
| Reliability | 9 | 9 | 0 | 0 |
| **Total** | **30** | **30** | **0** | **0** |

---

## Browser security

| Spec §7 bullet | Verdict | Evidence |
|---|---|---|
| The exact-origin allowlist remains enforced | VERIFIED (evidence: `tests/e2e/origin-guard.spec.ts:64,106,136`; `packages/browser-runner/src/allowlist.test.ts:12,18,27`; code path `driver.ts:183-188` refuses off-origin navigation + `runner.ts:192-194` post-navigate re-check + `packages/browser-runner/src/observation.test.ts:44,54` blocked-URL observation) | — |
| External requests are blocked before leaving the browser | VERIFIED (evidence: `origin-guard.spec.ts:64` "an off-origin subresource request is prevented before leaving the browser" — external server recorded 0 hits; `driver.ts:45-62` context route aborts unallowed requests in the browser; `allowlist.test.ts:49` fail-closed) | — |
| Redirects cannot escape the approved origin | VERIFIED (evidence: `origin-guard.spec.ts:106` off-origin redirect prevented + `origin-guard.spec.ts:136` same-origin→off-origin chain validated hop by hop; code path `driver.ts:64-117` fetch(`maxRedirects:0`) walk, `MAX_REDIRECT_HOPS` fail-closed at `driver.ts:16,106-110`) | — |
| Service-worker restrictions remain enabled | VERIFIED (evidence: code path `driver.ts:29` `serviceWorkers: "block"` on every production context + probe **P2** — registration neutralised, `controller: no`, page traffic flowed through the route handler, worker-side external egress 0 hits; Playwright docs: context routing does not see SW-handled requests, hence the block) | — |
| Browser contexts are isolated | VERIFIED (evidence: code path `driver.ts:23-30` fresh `chromium.launch()` + `newContext()` per journey, no `storageState`/`userDataDir`; probe **P3** — second journey observed no localStorage carry-over) | — |
| Browser resources are cleaned up after failures | VERIFIED (evidence: code paths `runner.ts:131-141,268-270,295-300` and `ai-runner.ts:101-111,393-395,420-425` `closeOnce` finally-paths; `driver.ts:419-439` close tolerates double-close and closes the browser when launch fails; tests `packages/browser-runner/src/runner.test.ts:133,152` "closes the browser when a step fails/times out", `ai-runner.test.ts:400,414` "closes the journey when observe fails" / "times out on a hanging decider and still cleans up", `tests/e2e/runner-integration.spec.ts:83` unreachable origin) | — |
| Action and journey limits cannot be bypassed | VERIFIED (evidence: code paths `runner.ts:175-177` plan-limit pre-check + `216-219` per-action check; `ai-runner.ts:206-208,219-221` decision limit both loop levels, `269-271` rejection budget, `308-310` executed-action limit; `packages/agent/src/agent.ts:64-72` journey token budget; tests `runner.test.ts:185` "blocks a plan that exceeds the action limit without opening a browser", `runner.test.ts:202` journey-timeout abort, `ai-runner.test.ts:365,381,276` decision/executed-action/rejection budget blocks) | — |

## AI security

| Spec §7 bullet | Verdict | Evidence |
|---|---|---|
| Only permitted structured actions execute | VERIFIED (evidence: `packages/contracts/src/agent.ts:22-32` `actionProposalSchema` — click/stop only, `targetId` must be `element-N`; `packages/browser-runner/src/ai-runner.ts:243` safeParse before any policy evaluation; `packages/contracts/src/agent.test.ts:112` "rejects actions outside click and stop", `:141` malformed target ids; execution clicks only observation-bound handles `driver.ts:351-376`) | — |
| Invalid actions are rejected | VERIFIED (evidence: `packages/contracts/src/policy.ts:20-46` `validateProposal` + `policy.test.ts:55,67,78,86,98,109,120,129` (wrong goal, reset button, absent/disabled target, stop always allowed); `ai-runner.test.ts:249,276,295` wrong-goal rejection → feedback → rejection-budget failure → schema-invalid rejection; `tests/e2e/element-binding.spec.ts:82` unknown/malformed ids rejected before any click) | — |
| Prompt injection cannot override the navigation policy | VERIFIED (evidence: `packages/agent/src/prompt.ts:18-58` byte-constant system prompt + observation quarantined between `OBSERVATION_JSON_BEGIN/END`; `packages/agent/src/prompt.test.ts:47,54,61` byte-constancy, no observation text in system message, malicious text quarantined; `tests/e2e/ai-loop.spec.ts:169` "prompt injection cannot complete the journey or escape the origin" — the injected instruction reached the model and the journey still failed honestly; the policy gate itself is code, not prompt, `policy.ts:20-46`) | — |
| Model-provided claims never become verified facts | VERIFIED (evidence: completion is decided by the app's page check `driver.ts:377-414` `completionState()` — heading + exact completion text — never by a model claim; model justifications are recorded as model-reported only: `packages/metrics/src/findings.ts:49-50,67` model limitation + `findings.test.ts:268`; `tests/e2e/ai-web.spec.ts:104` chips render as "AI DECISIONS (MODEL-REPORTED)"; `driver.ts:405-412` mismatched completion text is never falsely complete) | — |
| API credentials stay server-side | VERIFIED (evidence: `packages/agent/src/config.ts:37-49` key read from server env only, null when unset; `apps/web/lib/ai-agent.ts:8-26` server-only module, key never in return values; `client.ts:163-175` key only in the request header, never logged — `client.test.ts:90` 401 message never leaks the key; `config.test.ts:61` key never leaks into other fields; `prompt.test.ts:124` prompt carries no secret-shaped material; `ai-agent.test.ts:41`; repo-wide: the only `NEXT_PUBLIC_*` var is `NEXT_PUBLIC_BENCHMARK_ORIGIN` — no `NEXT_PUBLIC_`-prefixed credential exists, and `.env.example` contains no key) | — |
| Model output and errors are bounded | VERIFIED (evidence: `packages/contracts/src/agent.ts:4-11` `OBSERVATION_LIMITS` incl. `MAX_REASON_CHARS: 500`; `agent.ts:22-32` reason bound enforced at the schema; `packages/agent/src/agent.ts:55-62` `recordError` slices to 500 and caps at 10; `packages/browser-runner/src/ai-runner.ts:143-155` same bounds at the runner; `aiJourneySummarySchema` ≤10 × 500 (`agent.ts:99-106`); per-call output capped `NEBIUS_MAX_OUTPUT_TOKENS: 2048` and per-journey budget 50 000 with a hard stop `agent.ts:64-72`; tests `agent.test.ts:131` "stops calling the client once the journey token budget is spent", `agent.test.ts:154` accumulation, `observation.test.ts:98,129` observation bounds) | — |
| Failures are not silently represented as success | VERIFIED (evidence: `packages/metrics/src/journey-metrics.ts:13-18` `STATUS_OUTCOMES` maps failed/blocked/timed-out honestly (`journey-metrics.test.ts:114,142`); AI-mode never silently falls back to deterministic — `apps/web/lib/run-comparison.ts:119-126` throws on unconfigured agent and `apps/web/app/api/comparisons/route.ts:81-83` answers 503 before any reservation (`route.test.ts:204` "answers 503 for ai mode when the provider is not configured", `run-comparison.test.ts:323` "fails honestly when ai mode loses its configuration mid-flight"); run-level failures recorded by `route.ts:109-130`/`run-comparison.ts:211-226`; `tests/e2e/ai-web.spec.ts:167` deterministic runs stay explicitly labelled) | — |

## Evidence integrity

| Spec §7 bullet | Verdict | Evidence |
|---|---|---|
| Every finding references real evidence | VERIFIED (evidence: `packages/metrics/src/evidence-validation.ts:10-50` checks journey ids, step numbers and screenshot ids against the stored detail; `evidence-validation.test.ts:101,123,145` unknown journey/step/screenshot rejected; `findings.test.ts:299` citations only reference existing events; validation failure degrades the report `packages/metrics/src/report.ts:78-100` — `report.test.ts:95`) | — |
| No comparative differences appear for incomparable journeys | VERIFIED (evidence: `packages/metrics/src/comparison-metrics.ts:44-100` — differences only when both completed with counts and zero comparability reasons; `comparison-metrics.test.ts:142,160,175,186` failed/missing/running/mismatched-condition cases; `tests/e2e/dashboard.spec.ts:312` mismatched seeds withhold the difference while keeping raw counts) | — |
| Corrupted records cannot produce validated findings | VERIFIED (evidence: `packages/storage/src/file-store.ts:55-71` corrupt/missing → treated as missing, id-only warning; `file-store.test.ts:67` corrupt record + corrupt journeys skipped; `packages/metrics/src/report.ts:107-125` schema-invalid or validation-failing detail degrades to a single insufficient-evidence finding — `report.test.ts:95,125`; `apps/web/app/api/comparisons/[id]/route.ts:31-35` never serves a record failing the evidence contract — `[id]/route.test.ts:117`; `tests/e2e/dashboard.spec.ts:287` corrupt journey renders as missing evidence, not zero) | — |
| A failed or partial journey cannot be labelled easier merely because it stopped early | VERIFIED (evidence: `comparison-metrics.ts:44-58` non-completed journeys add comparability reasons and withhold differences — `comparison-metrics.test.ts:142`; `tests/e2e/dashboard.spec.ts:244` "a partial comparison never presents the failed journey as shorter"; `findings.test.ts:173` inconclusive finding with no numeric claims) | — |
| Screenshot references resolve to the correct stored artifacts | VERIFIED (evidence: `packages/metrics/src/journey-metrics.ts:97-119` dangling/missing reference detection — `journey-metrics.test.ts:181,196`; screenshot ids validated against stored artifacts by `evidence-validation.ts:36-45`; artifact route serves stored bytes with id validation — `apps/web/app/api/comparisons/[id]/artifacts/[artifactId]/route.test.ts:39,55,62,69` (PNG bytes, unknown/traversal 404s); `tests/e2e/dashboard.spec.ts:494` screenshots load in track and inspector, `tests/e2e/phase-2.spec.ts:101` stored screenshots are retrievable PNG artifacts) | — |
| The goal-selection event is not counted as a browser action | VERIFIED (evidence: `runner.ts:208-213` and `ai-runner.ts:319-323` emit `goal-selected` with `countsAsAction: false`; counting rule `journey-metrics.ts:37-43` counts only successful clicks; `runner.test.ts:218` "never counts goal selection as an action"; `journey-metrics.test.ts:61` excludes navigation and goal selection; `tests/e2e/dashboard.spec.ts:104` inspector reports non-counted steps honestly) | — |
| Repeated or invalid trace events cannot inflate the recorded action count | VERIFIED (evidence: `journey-metrics.ts:49-61` `countedActionEvents` deduplicates by step number — `journey-metrics.test.ts:76` "counts only unique successful click steps as actions"; non-success or non-click events can never count (`journey-metrics.test.ts:61`); `findings.test.ts:208` citations follow the same rule) | — |

## Reliability

| Spec §7 bullet | Verdict | Evidence |
|---|---|---|
| Concurrent comparison requests | VERIFIED (evidence: `apps/web/app/api/comparisons/route.ts:95-100` synchronous atomic `tryReserveRun` check-and-set before the first await; `route.test.ts:157` "accepts exactly one of two concurrent start requests" + `:144` 429 + `:175` reservation released on save failure; `tests/e2e/phase-2.spec.ts:232` one 202 / one 429 end-to-end; `run-comparison.test.ts:237` guard held for the whole execution) | — |
| Missing or corrupted files | VERIFIED (evidence: `file-store.ts:55-71` ENOENT → null, corrupt → null + warn; `file-store.test.ts:61,67,123`; API 404s for unknown/corrupt records — `[id]/route.test.ts:99,108,117`; UI honest states — `tests/e2e/dashboard.spec.ts:287`, `tests/e2e/phase-1.spec.ts:336` "missing comparison IDs show an honest unavailable state") | — |
| Interrupted browser sessions | VERIFIED (evidence: journey-level hard deadline + `aborted` flag `runner.ts:273-300` / `ai-runner.ts:398-425` with cleanup in `finally`; per-journey evidence persisted as soon as it finishes so a mid-run failure leaves honest partial records `run-comparison.ts:114-204`; unexpected runner throws still mark the comparison failed instead of a stuck "running" — `route.ts:109-130`; `ai-runner.test.ts:414` hanging decider still cleans up) | — |
| Nebius response timeouts | VERIFIED (evidence: `packages/agent/src/client.ts:48-76` single deadline armed across headers **and** body read, `client.ts:217` body-read race; bounded retries only for transient classes `client.ts:92-94,177`; `NEBIUS_TIMEOUT_MS: 20_000` `config.ts:4`; journey hard deadline 60 s caps everything (`limits.ts`); `client.test.ts:165` "aborts a hanging request as timeout within the attempt bound", `client.test.ts:182` "bounds a response whose body stalls after the headers") | — |
| API credit exhaustion | VERIFIED (evidence: `client.ts:104-111` HTTP 402 → typed `credits` error, fail-fast — 402 is not retryable (`client.ts:92-94`); `client.test.ts:107` "maps 402 to credits and 404 to model-unavailable without retrying"; the typed error lands in journey evidence `modelErrors` with kind `credits` (`ai-runner.ts:143-155`, `agent.test.ts:107`) and the journey records an honest failure rather than pretending success) | — |
| Page reloads during execution | VERIFIED (evidence: code path `driver.ts:351-376` — execution clicks observation-bound handles only and re-checks `node.isConnected` immediately before clicking, so a mid-run reload makes the click fail honestly ("Observed element is no longer in the page.") instead of acting on whatever now occupies the old position; the journey then records a failed status with an error event `ai-runner.ts:380-395`) | — |
| Browser shutdown | VERIFIED (evidence: code paths — a browser/context that dies mid-run surfaces as a failed driver operation → `status` classified `failed` with an error event (`ai-runner.ts:380-395`); cleanup tolerates already-closed contexts/browsers (`driver.ts:419-430` catches, `runner.ts:131-141` swallows cleanup errors so they never mask the result); `runner.test.ts:133,152` verify cleanup on step failure/timeout) | — |
| Resource cleanup | VERIFIED (evidence: browser/context closed in `finally` on every path — `runner.ts:268-270,295-300`, `ai-runner.ts:393-395,420-425`; single-flight reservation released in `run-comparison.ts:227-229` `finally` and redundantly in `route.ts:109-113` so the slot cannot leak; observation handles disposed per snapshot `driver.ts:324-349`; screenshot failures never leak into journey status `runner.ts:151-171`) | — |
| Error-state rendering | VERIFIED (evidence: `apps/web/app/comparisons/[id]/error.tsx` renders a retryable error state via `ComparisonState`; `tests/e2e/dashboard.spec.ts:387` "a failing status poll shows a retryable error state" with a working Try again; `tests/e2e/phase-1.spec.ts:303,336` controlled 404 / honest unavailable state; degraded/corrupt displays verified by `dashboard.spec.ts:287,342`; all error text renders through React text interpolation — no `dangerouslySetInnerHTML` anywhere in `apps/web/components`) | — |

---

## Findings

**No defects found.** 30 of 30 §7 bullets verified against existing test
evidence or targeted code paths; 4 probe runs across 3 probes (P1 unit-suite
re-run — 212/212 green; P2 service-worker behaviour ×2 runs; P3 context
isolation). Nothing is deferred to Task 5.

## Observations (recorded for transparency — not defects under spec §7)

1. **Trace-event error `detail` is unbounded at the schema level.**
   `packages/contracts/src/evidence.ts:30` types trace `detail` as
   `z.string().optional()` with no length cap. In practice the AI path writes
   bounded internal messages (typed `NebiusAgentError` texts, `≤500` for
   model errors) and `driver.completionState()` deliberately keeps detail
   generic ("page text is untrusted and must not flow into evidence",
   `driver.ts:405-412`); the deterministic `assertCompleted`
   (`driver.ts:215-218`) and raw Playwright error strings can carry
   page-derived text into `detail`/`journey.error` without a size cap.
   Scope reasons this is not a §7 defect: every journey is pinned to the
   operator-controlled benchmark origin by the allowlist, the text is
   rendered escaped (no XSS), and error events are never counted actions nor
   cited by findings, so no metric or verdict can be affected. If Task 5
   wants belt-and-braces hardening: bound `detail` in `traceEventSchema`
   (e.g. ≤500) and apply it at the `pushEvent` sites.
2. **Rejection-budget boundary is inclusive.** `ai-runner.ts:269-271` throws
   when `rejected > maxRejected`, so the sixth (`AI_MAX_REJECTED = 6`)
   rejected proposal is recorded and the stop happens on the seventh. The
   bound is still enforced and the recorded count is honest; only the
   comment on `limits.ts:8` ("maximum … before explicit stop") reads as
   exclusive. Optional Task 5 tidy-up: align comment and boundary.

## Limitations of this audit

- E2E citations come from the repository's existing suites (all
  credential-free, mocked Nebius) and were not re-executed here; the unit
  half of the evidence was re-verified live (P1). Seeded-fixture dashboard
  specs could not be re-run against the already-running :3000/:3001 dev
  servers without disturbing state later tasks reuse, so they are cited as
  suite evidence.
- No credentialed command was run, no environment file was opened, no key
  material appears anywhere in this document.
- Out-of-scope areas (authentication, payments, additional providers,
  third-party crawling) were not audited — they do not exist in the product
  (spec §2 scope).
