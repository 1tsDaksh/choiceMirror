# ChoiceMirror — real Nebius inference and repeatability results

> Every number in this document came from a run executed on **2026-11-18** against the real Nebius Token Factory API. No measured value here is simulated or copied from fixture expectations. Fixture expected counts appear only in a clearly labelled *expected (fixture)* validation column.

- **Branch:** `feat/phase-5-final-validation` (off `main` @ `0923fda`)
- **Model (all runs):** `zai-org/GLM-5.3-Flash` (adapter default; the process env carried only `NEBIUS_API_KEY`)
- **Credential handling:** key read from gitignored `apps/web/.env.local` into the process environment for the run only — never printed, never committed (`.gitignore:14`)
- **Suite:** `pnpm test:live` → `playwright.live.config.ts` → `tests/live/ai-eval.spec.ts` (opt-in, `NEBIUS_LIVE=1`; no mock server — benchmark app only on `:3001`; retries 0)

## 4.1 Authentication smoke (2026-11-18) — PASS

**Run:** 2026-11-18 · exit code **0** · **3/3 passed** (the three checks below) · no retries.

Throwaway test file driven through the existing `@choicemirror/agent` adapter — the same adapter package the app uses; deleted after the run and **never committed** (D-021: live inference stays opt-in, out of CI).

| Check | Result |
|---|---|
| Endpoint + auth | `GET {baseUrl}/models` → **HTTP 200** in 186 ms; catalog lists 24 models; `zai-org/GLM-5.3-Flash` present |
| Bounded chat completion (`createNebiusClient.chat`) | Parsed `{"ok":true}`; **612 ms**; 1 API call; 39 input / 35 output / 74 total tokens |
| Structured proposal (`createNebiusAgent.decide`) | Zod-validated `action=click`; **1,030 ms**; 1 API call; 333 input / 105 output tokens; **0 model errors**; `promptVersion=phase3-v1` |
| Error classes checked | 401 / 402 / 404 / 429, insufficient credits, rate limiting, output truncation, JSON parse failure, network timeout — **none observed** |

## 4.2 Eight-journey evaluation — `pnpm test:live` — PASS

**Run:** 2026-11-18 · exit code **0** · `1 passed (37.3 s)`, test body 32.2 s · webServer `next dev -p 3001` · no retries.

### Per-journey results (actual)

Model for every row: `zai-org/GLM-5.3-Flash`. *Expected* is the fixture validation column, not a measurement.

| Scenario | Goal | Status | Actions (actual) | Actions (expected, fixture) | Inference calls | Input tokens | Output tokens | Journey duration (ms) | Errors |
|---|---|---|---|---|---|---|---|---|---|
| membership-balanced | Join | completed | 1 | 1 | 2 | 1,108 | 198 | 5,683 | none |
| membership-balanced | Leave | completed | 1 | 1 | 2 | 1,108 | 189 | 2,716 | none |
| membership-asymmetric | Join | completed | 1 | 1 | 2 | 1,126 | 242 | 3,270 | none |
| membership-asymmetric | Leave | completed | 3 | 3 | 4 | 2,200 | 462 | 5,064 | none |
| consent-balanced | Accept | completed | 1 | 1 | 2 | 1,108 | 157 | 2,391 | none |
| consent-balanced | Reject | completed | 1 | 1 | 2 | 1,108 | 215 | 2,756 | none |
| consent-asymmetric | Accept | completed | 1 | 1 | 2 | 1,126 | 200 | 2,649 | none |
| consent-asymmetric | Reject | completed | 3 | 3 | 4 | 2,200 | 843 | 7,697 | none |

- **Duration semantics:** wall-clock time around each `runAiJourney` call (sequential sweep; row sum 32,226 ms ≈ the 32.2 s test body) — browser execution + inference, not provider-side latency alone. Per-inference-call latency is not metered by this suite; the smoke's single calls were 612 ms (client) and 1,030 ms (agent).
- **Invalid action proposals:** not separately metered by this suite (a rejected proposal would surface as an extra inference call); no journey reported an error.
- Every row satisfied the suite's assertion `inferenceCalls >= 1` (range 2–4).

### Aggregate

| Metric | Actual |
|---|---|
| Successful / attempted | **8 / 8** |
| Actual success rate | **100 %** (suite `successRate: 1`) |
| Total inference calls | **20** |
| Total tokens consumed | **13,590** (11,084 input + 2,506 output) |
| Journey duration min / median / max | **2,391 / 3,013 / 7,697 ms** |
| Failure classifications | none — `errors: []` |
| Cost estimate | pricing not verified; **cost not estimated** |

Verbatim top-level fields of the suite's `[live-eval]` output (the `statuses` array is transcribed in the table above):

```json
{
  "journeys": 8,
  "completed": 8,
  "successRate": 1,
  "totalInferenceCalls": 20,
  "totalInputTokens": 11084,
  "totalOutputTokens": 2506,
  "latencyMs": { "min": 2391, "median": 3013, "max": 7697 },
  "errors": []
}
```

### Failure classification sweep 

`auth` · `credits` · `model-unavailable` · `rate-limit` · `timeout` · `network` · `malformed` · `budget` · `api` · `assertion` → **none observed in this run.**

### Honesty notes

- Zero failed journeys → zero retries; this was a single attempt (exit 0 on the first try).
- The actual action counts equal the fixture expectations (join 1 / leave 3 / accept 1 / reject 3 in the asymmetric variants; 1/1 in the balanced variants). That is *validation against fixtures*, recorded as actual-vs-expected — not an independent difficulty claim.
- Aggregate rows count only journeys that genuinely completed; nothing is pre-filled.

## 5. UI end-to-end AI runs  — PASS

**Recorded in `VALIDATION_REPORT.md` §8.4** — the single authoritative UI run log (runs
`cmp_04cbef31ed3a44c7` membership-asymmetric, join 1 / leave 3, difference 2, both actual
= expected; `cmp_dfe25737c0937557` membership-balanced, join 1 / leave 1, difference 0;
both stored records `"mode":"ai"`, `"status":"completed"`; no retries, no anomalies).

## 6. Bounded live repeatability  — PASS

**Run:** 2026-11-18 · `tests/live/repeatability.spec.ts` · exit code **0** · `1 passed (2.9m)` · webServer `next dev -p 3001` (reused dev server) · no retries · single attempt (no early stop — the full 12-pair target was attempted and completed in one run).

- **Design:** 4 scenarios × 1 goal pair × 3 rounds (`REPEAT_ROUNDS = 3`) = **12 paired records / 24 journeys**; goals of each pair run sequentially per round; fresh `createNebiusAgent(config)` per journey; `comparisonId = "cmp_0123456789abcdee"`, `seed = "phase-5"`; test cap `test.setTimeout(1_800_000)`.
- **Opt-in guard (verified before the credentialed run):**
  1. No env at all → `npx playwright test --config playwright.live.config.ts --grep repeatability` reported **`1 skipped`, exit 0, zero network**.
  2. `NEBIUS_LIVE=1` + key but **no** `NEBIUS_LIVE_REPEAT=1` → still reported **`1 skipped`, exit 0** — the repeat flag specifically gates this suite, so a `pnpm test:live` sweep spends no repeatability credits when the repeat flag is not exported.
- **Model:** `zai-org/GLM-5.3-Flash` (adapter default; the process env carried only `NEBIUS_API_KEY`, `NEBIUS_LIVE=1`, `NEBIUS_LIVE_REPEAT=1`).

### Verbatim suite output

```json
[live-repeat] {
  "pairsAttempted": 12,
  "pairsCompleted": 12,
  "journeysCompleted": 24,
  "actionCountConsistency": {
    "membership-balanced/join": [
      1
    ],
    "membership-balanced/leave": [
      1
    ],
    "membership-asymmetric/join": [
      1
    ],
    "membership-asymmetric/leave": [
      3
    ],
    "consent-balanced/accept": [
      1
    ],
    "consent-balanced/reject": [
      1
    ],
    "consent-asymmetric/accept": [
      1
    ],
    "consent-asymmetric/reject": [
      3
    ]
  },
  "totalInferenceCalls": 61,
  "totalTokens": 40619,
  "latencyMs": {
    "min": 2252,
    "median": 3092,
    "max": 34897
  },
  "errors": []
}
```

### Variation narrative (actual measurements)

- **Action-count consistency per scenario × goal across the 3 rounds:** every one of the 8 scenario × goal combinations produced a **single unique action count across all 3 rounds** — join 1, leave 1 (balanced) / 3 (asymmetric), accept 1, reject 1 (balanced) / 3 (asymmetric). Zero count drift round-to-round in this run: for each goal, `actionCountConsistency` is a one-element array, i.e. rounds 1, 2 and 3 all executed the same number of actions. The consistent counts also equal the fixture expectations from §4.2 (that is *validation against fixtures*, not an independent difficulty claim).
- **Error list:** `errors: []` — no journey in any round reported an error; every journey reached the model (`inferenceCalls ≥ 1` assertion held for all 24).
- **Latency spread:** journey wall-clock **2,252 / 3,092 / 34,897 ms** (min / median / max) around each `runAiJourney` call — browser execution + inference, not provider-side latency alone (same semantics as §4.2). The 34,897 ms max is ~11× the median: one journey was markedly slower than the rest, while the median (3,092 ms) sits right at the eight-journey suite's median (3,013 ms). Per-journey latencies are not part of the summary shape, so the outlier's journey is not attributed here — nothing is inferred beyond what the run printed.
- **Inference-call accounting:** the N+1 pattern observed in §4.2 (one call for goal selection + one per recorded action) implies 60 calls for these 24 journeys; the run recorded **61** — one extra inference call, unattributed (per-journey call counts are not part of the summary shape, so nothing more is claimed).
- **Invalid action proposals:** not separately metered by this suite (a rejected proposal would surface as an extra inference call); no journey reported an error.

### Aggregate (actual)

| Metric | Actual |
|---|---|
| Pairs attempted / completed | **12 / 12** (target 12 — attempted and completed counts are the run's own numbers, not the target restated) |
| Journeys completed | **24** (12 pairs × 2 goals) |
| Round-over-round action-count agreement | 8 of 8 scenario × goal combinations fully consistent |
| Total inference calls | **61** across 24 journeys (per-journey call counts are not part of the summary shape, so no per-journey breakdown is claimed here) |
| Total tokens consumed | **40,619** (~3× the eight-journey suite's 13,590, consistent with the planned credit budget) |
| Latency min / median / max | **2,252 / 3,092 / 34,897 ms** |
| Failure classifications | none — `errors: []` |

### Honesty notes

- Every number above is transcribed verbatim from the run's `[live-repeat]` output; the 12-pair/24-journey figures are both the plan's target and this run's actual attempted/completed counts (the run finished the full sweep — no early stop, no retries, single attempt, exit 0 first try).
- No confidence intervals are computed ; consistency is reported as unique-count arrays per scenario × goal, exactly as the suite emits them.
- The suite's own assertions are honest smoke only (every journey reached the model; ≥1 genuine completion) — repeatability itself is *reported*, not hard-asserted, so a future drift case still prints its data.
