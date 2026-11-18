# LIVE_TEST_RESULTS — Phase 5 real Nebius inference

> Every number in this document came from a run executed on **2026-11-18** against the real Nebius Token Factory API. Nothing here is simulated, pre-filled, or copied from fixture expectations. Fixture expected counts appear only in a clearly labelled *expected (fixture)* validation column.

- **Branch:** `feat/phase-5-final-validation` (off `main` @ `0923fda`)
- **Model (all runs):** `zai-org/GLM-5.3-Flash` (adapter default; the process env carried only `NEBIUS_API_KEY`)
- **Credential handling:** key read from gitignored `apps/web/.env.local` into the process environment for the run only — never printed, never committed (`.gitignore:14`)
- **Suite:** `pnpm test:live` → `playwright.live.config.ts` → `tests/live/ai-eval.spec.ts` (opt-in, `NEBIUS_LIVE=1`; no mock server — benchmark app only on `:3001`; retries 0)

## 4.1 Authentication smoke (2026-11-18) — PASS

Throwaway test file driven through the existing `@choicemirror/agent` adapter (the same code path the app uses); deleted after the run and **never committed** (D-021: live inference stays opt-in, out of CI).

| Check | Result |
|---|---|
| Endpoint + auth | `GET {baseUrl}/models` → **HTTP 200** in 186 ms; catalog lists 24 models; `zai-org/GLM-5.3-Flash` present |
| Bounded chat completion (`createNebiusClient.chat`) | Parsed `{"ok":true}`; **612 ms**; 1 API call; 39 input / 35 output / 74 total tokens |
| Structured proposal (`createNebiusAgent.decide`) | Zod-validated `action=click`; **1 030 ms**; 1 API call; 333 input / 105 output tokens; **0 model errors**; `promptVersion=phase3-v1` |
| Error classes checked | 401 / 402 / 404 / 429, insufficient credits, rate limiting, output truncation, JSON parse failure, network timeout — **none observed** |

## 4.2 Eight-journey evaluation — `pnpm test:live` — PASS

**Run:** 2026-11-18 · exit code **0** · `1 passed (37.3 s)`, test body 32.2 s · webServer `next dev -p 3001` · no retries.

### Per-journey results (actual)

Model for every row: `zai-org/GLM-5.3-Flash`. *Expected* is the fixture validation column, not a measurement.

| Scenario | Goal | Status | Actions (actual) | Actions (expected, fixture) | Inference calls | Input tokens | Output tokens | Journey duration (ms) | Errors |
|---|---|---|---|---|---|---|---|---|---|
| membership-balanced | Join | completed | 1 | 1 | 2 | 1 108 | 198 | 5 683 | none |
| membership-balanced | Leave | completed | 1 | 1 | 2 | 1 108 | 189 | 2 716 | none |
| membership-asymmetric | Join | completed | 1 | 1 | 2 | 1 126 | 242 | 3 270 | none |
| membership-asymmetric | Leave | completed | 3 | 3 | 4 | 2 200 | 462 | 5 064 | none |
| consent-balanced | Accept | completed | 1 | 1 | 2 | 1 108 | 157 | 2 391 | none |
| consent-balanced | Reject | completed | 1 | 1 | 2 | 1 108 | 215 | 2 756 | none |
| consent-asymmetric | Accept | completed | 1 | 1 | 2 | 1 126 | 200 | 2 649 | none |
| consent-asymmetric | Reject | completed | 3 | 3 | 4 | 2 200 | 843 | 7 697 | none |

- **Duration semantics:** wall-clock time around each `runAiJourney` call (sequential sweep; row sum 32 226 ms ≈ the 32.2 s test body) — browser execution + inference, not provider-side latency alone. Per-inference-call latency is not metered by this suite; the smoke's single calls were 612 ms (client) and 1 030 ms (agent).
- **Invalid action proposals:** not separately metered by this suite (a rejected proposal would surface as an extra inference call); no journey reported an error.
- Every row satisfied the suite's assertion `inferenceCalls >= 1` (range 2–4).

### Aggregate

| Metric | Actual |
|---|---|
| Successful / attempted | **8 / 8** |
| Actual success rate | **100 %** (suite `successRate: 1`) |
| Total inference calls | **20** |
| Total tokens consumed | **13 590** (11 084 input + 2 506 output) |
| Journey duration min / median / max | **2 391 / 3 013 / 7 697 ms** |
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

### Failure classification sweep (spec §4.3)

`auth` · `credits` · `model-unavailable` · `rate-limit` · `timeout` · `network` · `malformed` · `budget` · `api` · `assertion` → **none observed in this run.**

### Honesty notes

- Zero failed journeys → zero retries; this was a single attempt (exit 0 on the first try).
- The actual action counts equal the fixture expectations (join 1 / leave 3 / accept 1 / reject 3 in the asymmetric variants; 1/1 in the balanced variants). That is *validation against fixtures*, recorded as actual-vs-expected — not an independent difficulty claim.
- Aggregate rows count only journeys that genuinely completed; nothing is pre-filled.

## 5. UI end-to-end AI runs (spec §5) — pending (plan Task 2)

## 6. Bounded live repeatability (spec §6) — pending (plan Task 3)
