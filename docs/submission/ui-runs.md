# UI end-to-end AI runs — spec §5 (Phase 5 plan Task 2)

> Working log; folded into `VALIDATION_REPORT` in plan Task 9. Every value below was
> observed on **2026-11-18** through the **real web UI** (`http://localhost:3000`) against the
> real benchmark (`http://localhost:3001`) with genuine Nebius inference — no mocks, no API
> calls standing in for UI runs. Fixture expected counts appear only in the labelled
> *expected (fixture)* column and are never presented as measurements. Companion §4 live
> results: `LIVE_TEST_RESULTS.md` (not duplicated here).

- **Branch:** `feat/phase-5-final-validation` · dev servers `npx pnpm@12.18.0 dev` (`next dev`, :3000 web + :3001 benchmark)
- **Mode for both runs:** **AI (Nebius)** selected in the launcher radio group; credential from gitignored `apps/web/.env.local` (key value never printed or committed)
- **Driver:** throwaway Playwright script (kept in the gitignored SDD scratch dir, not committed — the OpenCode desktop browser was not attached to this session). It drives the real launcher exactly like `tests/e2e/ai-web.spec.ts` does: check the scenario radio → check the `AI (Nebius)` radio → click **Run comparison** → wait for the detail page's `Completed` status. No code was changed.
- **Real-inference evidence:** Next dev does not log outbound HTTPS traffic, so per the brief the journey `ai.inferenceCalls >= 1` confirmation below (with provider/model/token usage, read from the stored JSON records under `apps/web/data/`) is the server-side real-traffic evidence. The dev server log contained no errors during either run.

---

## Run 1 — `cmp_04cbef31ed3a44c7` · membership-asymmetric

| Field | Value |
|---|---|
| Run id | `cmp_04cbef31ed3a44c7` |
| Scenario | `membership-asymmetric` ("Join vs leave — asymmetric") |
| Mode | `ai` — stored record `record.json` has `"mode":"ai"`, `"status":"completed"` |
| Created | `2026-11-18T00:46:35.082Z` |
| Goal A (join) | `completed` · started `00:46:35.094Z` · completed `00:46:38.893Z` (3.8 s) |
| Goal B (leave) | `completed` · started `00:46:38.902Z` · completed `00:46:55.451Z` (16.5 s) |
| Counts | Join **1** (expected, fixture: 1) · Leave **3** (expected, fixture: 3) · Action difference **2** (expected, fixture: 2) — **no variance** |
| Finding headline | "Leaving required 2 more actions than joining"; ratio `(3+1)/(1+1) = 2`; badge "Observed asymmetry / Evidence complete" |
| Mode badge (dashboard) | **`Mode: AI · zai-org/GLM-5.3-Flash`** |
| Execution metadata card | "6 inference calls · 3326 input / 699 output tokens · 0 rejected · zai-org/GLM-5.3-Flash — Model activity recorded for this run — execution cost, not a measure of interface friction." |
| Journey AI evidence | join `ai`: provider `nebius`, model `zai-org/GLM-5.3-Flash`, prompt `phase3-v1`, **2 inference calls**, 1126 in / 202 out tokens, 0 rejected proposals, `modelErrors: []` · leave `ai`: **4 inference calls**, 2200 in / 497 out tokens, 0 rejected proposals, `modelErrors: []` |
| Per-event AI evidence | every counted action step renders `proposed: click · element-N` + `executed` + a model justification chip; the inspector for Goal A step 2 shows "MODEL-REPORTED JUSTIFICATION (NOT VERIFIED)" with "zai-org/GLM-5.3-Flash · prompt phase3-v1 · 631 tok · 1231 ms" |
| AI-justification chips | present on both journeys ("AI DECISIONS (MODEL-REPORTED)" + `nebius · zai-org/GLM-5.3-Flash · prompt phase3-v1`) |
| Screenshots | real: Goal A track 4/4 images loaded, Goal B track 6/6 loaded; inspector screenshot rendered (`naturalWidth = 1280`); 10 artifact PNGs stored on disk |
| Attempts | **1** (no retry, no error; deterministic mode never used) |
| Anomalies | none |

## Run 2 — `cmp_dfe25737c0937557` · membership-balanced

| Field | Value |
|---|---|
| Run id | `cmp_dfe25737c0937557` |
| Scenario | `membership-balanced` ("Join vs leave — balanced") |
| Mode | `ai` — stored record `record.json` has `"mode":"ai"`, `"status":"completed"` |
| Created | `2026-11-18T00:47:46.042Z` |
| Goal A (join) | `completed` · started `00:47:46.046Z` · completed `00:48:00.616Z` (14.6 s) |
| Goal B (leave) | `completed` · started `00:48:00.621Z` · completed `00:48:13.954Z` (13.3 s) |
| Counts | Join **1** (expected, fixture: 1) · Leave **1** (expected, fixture: 1) · Action difference **0** (expected, fixture: equal counts) — **no variance** |
| Finding headline | "Equal recorded action burden"; badge "Balanced / Evidence complete"; honest balanced reading — "This run recorded no action-count gap between the two goals." |
| Mode badge (dashboard) | **`Mode: AI · zai-org/GLM-5.3-Flash`** |
| Execution metadata card | "4 inference calls · 2216 input / 426 output tokens · 0 rejected · zai-org/GLM-5.3-Flash" |
| Journey AI evidence | join `ai`: provider `nebius`, model `zai-org/GLM-5.3-Flash`, prompt `phase3-v1`, **2 inference calls**, 1108 in / 214 out tokens, 0 rejected proposals, `modelErrors: []` · leave `ai`: **2 inference calls**, 1108 in / 212 out tokens, 0 rejected proposals, `modelErrors: []` |
| Per-event AI evidence | same pattern as Run 1 (`proposed: click · element-N` + `executed` + model justification chip; inspector chip rendered) |
| AI-justification chips | present on both journeys |
| Screenshots | real: Goal A track 4/4 images loaded, Goal B track 4/4 loaded; inspector screenshot rendered (`naturalWidth = 1280`); 8 artifact PNGs stored on disk |
| Attempts | **1** (no retry, no error; deterministic mode never used) |
| Anomalies | none |

---

## Review Focus 2 — every UI run verifiably real AI

Checked from the **stored JSON records** under `apps/web/data/comparisons/` (read-only; that directory is gitignored and was not committed), not just the UI:

| Check | Run 1 (`cmp_04cbef31ed3a44c7`) | Run 2 (`cmp_dfe25737c0937557`) |
|---|---|---|
| `record.json` `mode` | `"ai"` | `"ai"` |
| `record.json` `status` | `"completed"` | `"completed"` |
| Dashboard badge | `Mode: AI · zai-org/GLM-5.3-Flash` | `Mode: AI · zai-org/GLM-5.3-Flash` |
| Per-event `ai` evidence | yes (model justification chips + `executed` badges on every counted action) | yes |
| Journey `ai` summary, `inferenceCalls >= 1` | yes (2 and 4) | yes (2 and 2) |
| `modelErrors` | `[]` | `[]` |
| Any deterministic fallback | none | none |

Single-flight discipline: runs were strictly sequential; the second started only after the first reached a terminal state. Total real-inference spend: **2 runs, 0 retries** (credit budget respected).

## Screenshot candidates for Task 7

Ad-hoc captures live in the gitignored SDD scratch dir `.superpowers/sdd/2026-11-18-phase-5-final-validation/` (Task 7 owns `docs/submission/assets/`):

- `shot-asymmetric-full.png` — Run 1 dashboard, full page
- `shot-asymmetric-Goal-A-journey.png` / `shot-asymmetric-Goal-B-journey.png` — Run 1 journey panels
- `shot-asymmetric-inspector.png` — Run 1 evidence inspector (step 2, model justification chip)
- `shot-balanced-full.png`, `shot-balanced-Goal-A-journey.png`, `shot-balanced-Goal-B-journey.png`, `shot-balanced-inspector.png` — Run 2 equivalents

Evidence JSON from the driver (`evidence-asymmetric.json`, `evidence-balanced.json`) sits beside them in the same scratch dir.
