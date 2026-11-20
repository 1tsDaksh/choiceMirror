# ChoiceMirror — interface validation report

**Date:** 18 November 2026.  
**Scope:** Historical local verification of the scenario launcher, comparison dashboard, mobile layout and keyboard/accessibility behaviour.

The original validation was performed on the running Next.js web app and synthetic benchmark using Playwright browser checks and **real stored Nebius AI comparison records**. Temporary local probe scripts and generated images were not committed. The comparisons were cross-checked against schema-validated stored journey data.

**Result:** **22/22 tested interface and accessibility checks passed**, with two documented low-priority cosmetic observations. This report preserves the individual checks, actual comparison IDs, measured results and screenshot evidence; it is not a claim that every aspect of the current public deployment was independently re-audited.

## Homepage — can a visitor immediately understand…

| # | Spec bullet | Verdict |
|---|---|---|
| H1 | What ChoiceMirror does | **PASS** — visible copy answers it directly: hero paragraph *"ChoiceMirror is designed to run opposing user journeys under matched conditions and link every reported difference to inspectable evidence."* (quoted verbatim from the rendered page). |
| H2 | Why opposing user journeys matter | **PASS** — the h1 poses the question the opposing journeys answer: *"Does this interface make both choices equally easy?"*; the explanation card *"01 Matched journeys — Each opposing goal starts from equivalent controlled state."* and *"02 Observed actions — Ordered events and screenshots will replace unsupported verdicts."* state why one-sided testing is not enough. |
| H3 | How to choose a scenario | **PASS** — the launcher fieldset is labelled *"Select controlled scenario"* and lists four selectable cards, each with id, variant badge and description, e.g. *"membership-asymmetric · Controlled benchmark · asymmetric · Join vs leave — asymmetric — A synthetic workspace where joining stays direct while leaving requires three explicit confirmations."* Before selection the page says *"Select a scenario to inspect its opposing goals."* |
| H4 | How to select AI or deterministic mode | **PASS** — a second fieldset is labelled *"Execution mode"* with two radio cards: *"Deterministic — Replays the app's own validated action plan."* and *"AI (Nebius) — The model observes each page and chooses the next validated action."* After scenario selection the helper line restates the mode's behaviour: *"AI mode lets the Nebius model observe each page and choose the next validated action. Runs execute locally with fixed limits."* |
| H5 | How to launch a comparison | **PASS** — after selecting a scenario the paired-goals panel shows *"Run comparison"* (primary CTA) next to *"Explore manually in benchmark →"*. Verified end-to-end by keyboard only: Tab → Space on the scenario card → Tab → Enter on *Run comparison* navigated to a comparison page that reached `Completed` (`cmp_d590484c8b4fc74e`, deterministic walkthrough, no inference — see header). |

## Comparison dashboard

Verified on both stored real-AI runs — **Run 1** `cmp_04cbef31ed3a44c7`
(membership-asymmetric, Join 1 / Leave 3, difference 2) and **Run 2**
`cmp_dfe25737c0937557` (membership-balanced, 1 / 1, difference 0) — and on the seeded
failure/incomplete states (see bullet D9). All numbers are labelled actual vs expected
(fixture) in §8.4 below.

| # | Spec bullet | Verdict |
|---|---|---|
| D1 | Scenario name and goals are clear | **PASS** — dashboard header: *"Join vs leave — asymmetric"*; goal line *"Join the synthetic workspace. vs Leave the synthetic workspace through three review steps."*; journey panels headed `Goal A` → `join` and `Goal B` → `leave` (goal resolved by journey id, verified in E2E `dashboard.spec.ts` "evidence chip names the goal by journey id, not by array position"). Run 2 equivalents render *"Join vs leave — balanced"* with single-step goals. |
| D2 | The main finding appears prominently | **PASS** — the finding card sits directly under the status banner with the h2 headline *"Leaving required 2 more actions than joining"*, category chips *"Observed asymmetry"* / *"Evidence complete"*, Observed/Calculated/Interpreted sections and the ratio *"(3+1)/(1+1) = 2"*. At a 1440×900 desktop viewport the headline renders ≈500 px from the page top — above the fold (screenshot `run1-desktop-full.png`). Run 2: *"Equal recorded action burden"* with the honest reading *"This run recorded no action-count gap between the two goals."* |
| D3 | Action counts are correct | **PASS** — Run 1 metric cards: Journey A actions **1** (actual; expected, fixture: 1), Journey B actions **3** (actual; expected, fixture: 3), Action difference **2** (actual; expected, fixture: 2); each journey's meta line also cites its fixture expectation (*"fixture expects 1"*, *"fixture expects 3"*). Counts match the stored journey records exactly. Run 2: **1 / 1 / 0** (actual; expected, fixture: 1 / 1 / equal). |
| D4 | Both journeys appear in a readable mirrored layout | **PASS** — `Goal A journey` and `Goal B journey` are two equal 608 px-wide columns on the same row (bounding boxes y = 1304 for both, x = 104 vs 728 at 1440 px) and stack single-column on mobile (see A2). Step chips, outcome badges and screenshot checkpoints align per journey in both views. |
| D5 | Evidence references are properly linked | **PASS** — the finding's *"Supporting evidence"* chips name the exact steps (*"Goal A · steps 2"*, *"Goal B · steps 2,3,4"*); *"Inspect supporting evidence"* jumps the inspector to the heavier journey's first counted action and moves focus to the inspector heading (asserted focused in the probe). Every screenshot request in the session returned HTTP 200 (10/10 artifact PNGs for Run 1), and all rendered at `naturalWidth = 1280`. |
| D6 | Selecting an event reveals the correct screenshot | **PASS** — clicking `Goal A` step 2 (*"Join workspace"*) opened the inspector with *"Step 2: Join workspace"*, the *"After action 1"* checkpoint image (`naturalWidth = 1280`), the event timestamp `2026-11-18T00:46:38.773Z` and *"Counted as an action: Yes"*. Next/Previous step buttons walk the timeline (E2E `previous and next step buttons move between events` covers the same controls). |
| D7 | Model information is correctly labelled | **PASS** — dashboard badge *"Mode: AI · zai-org/GLM-5.3-Flash"*; per-journey card *"AI DECISIONS (MODEL-REPORTED)"* with the standing caveat *"Model statements are recorded as reported, not independently verified."* plus `nebius · zai-org/GLM-5.3-Flash · prompt phase3-v1` and token/usage lines; per-event inspector chip *"MODEL-REPORTED JUSTIFICATION (NOT VERIFIED)"* with the proposed action, `executed` badge, model justification, prompt version and per-call usage (Run 1 Goal A step 2: *"631 tok · 1231 ms"*). The Execution metadata card states *"Model activity recorded for this run — execution cost, not a measure of interface friction."* |
| D8 | Limitations remain visible | **PASS** — the finding card carries a *"Limitations"* disclosure (Run 2 items: *"Action differences are descriptive measurements, not proof of unlawful or intentional manipulation."*, *"Single run against the controlled local benchmark; results describe this execution only."*, *"Counts reflect recorded browser actions; backtracking, interruptions and dead ends are not captured by the trace format."*, *"Model-reported justifications are recorded as reported, not independently verified."*), and the *"How these measurements work"* panel adds *"What these numbers do not show"* and *"AI navigation vs interface friction"* sections. |
| D9 | Unknown and unsuccessful results are handled honestly | **PASS** — exercised in the real UI on five seeded state fixtures written into the app's (gitignored) data dir using the exact E2E seeding module (`tests/e2e/support/seed-fixtures.ts`, ids `cmp_5eed0000000000NN`; the E2E suite covers the same states — `dashboard.spec.ts` lines 215–410). Observed, quoted: **failed run** — banner *"Failed — This run stopped before both goals finished. The error is shown below."* + *"Journey B (reject) failed before both goals finished."*, finding *"Inconclusive — Insufficient evidence — Inconclusive comparison — Journey B (reject) did not complete (failed), so action counts cannot be compared."*, difference card *"— / Not available"*, and the failed journey shows its *"Journey error"* box; **running** — *"Running"* banner, both tracks *"Waiting / Waiting for this goal to run. / Not available"*, *"Inconclusive"* finding, difference card *"— / Not available"*; **corrupt journey file** — banner *"This run finished, but the stored evidence below is incomplete — see the findings and limitations."*, *"Journey B (reject) has no recorded evidence yet, so action counts cannot be compared."* (never "0 recorded actions"); **mismatched seeds** — *"Seeds differ between journeys, so action counts cannot be compared."* with the difference withheld (*"— / Not available"*) while raw counts stay on their own cards; **degraded evidence** — *"Stored evidence failed validation — findings are withheld."* + *"Evidence could not be validated"*, difference withheld. No fake zeros or invented numbers anywhere. |

## Accessibility and responsiveness

| # | Spec bullet | Verdict |
|---|---|---|
| A1 | Desktop layout | **PASS** — verified at 1440×900 (≥1280): mirrored journeys side by side, metric cards in one row, no horizontal overflow; full-page screenshot `run1-desktop-full.png` / `run2-desktop-full.png`. |
| A2 | Mobile layout | **PASS** — verified at 390×844 on both runs: journeys stack (Goal B top ≥ Goal A bottom: y 2082+991.5 ≤ 3089.5 for Run 1), `scrollWidth 390 ≤ clientWidth 390` on homepage and both dashboards (no horizontal scroll); screenshots `run1-mobile.png`, `run2-mobile.png`, `home-mobile.png`. Mirrors E2E `the dashboard stacks into a single column on mobile`. |
| A3 | Keyboard navigation | **PASS** — Tab order recorded stop-by-stop on the Run 1 dashboard: logo link → finding-card *"Limitations"* summary → *"Inspect supporting evidence"* → recorded-step buttons → screenshot-checkpoint buttons → inspector heading (focusable) → Previous/Next step → methodology summary — logical top-to-bottom order with no traps. Enter on a focused step button opened that step in the inspector; Tab + Enter on *"Next step"* advanced to the next step; on the homepage a **complete keyboard-only run activation** (scenario card → Space → *Run comparison* → Enter) launched and completed a comparison. The E2E suite pins the same journey (`keyboard users can reach and operate the inspector`). |
| A4 | Visible focus indicators | **PASS** — under real keyboard focus every interactive element shows a computed outline `solid 3px` (links/buttons/inputs: `outline: 3px solid var(--color-highlight)` = rgb(120,166,255); launcher scenario/mode cards: 3 px solid ring via `:has(:focus-visible)`; screenshots `focused-scenario-card.png`, `focused-mode-card.png`). One cosmetic colour deviation on the card/summary rings is finding #1 below — the ring is clearly visible regardless (white-on-elevated ≈ 13:1), so the criterion is met. |
| A5 | Screenshot descriptions | **PASS** — every checkpoint image has a descriptive alt: all 10 Run 1 track images carry `alt="Screenshot: <label>"` (*"Screenshot: Starting state"*, *"Screenshot: After action 1"*, …, `naturalWidth = 1280` each); the inspector renders the image inside a `<figure>` with alt + visible `<figcaption>` (e.g. *"After action 1"*). |
| A6 | Contrast | **PASS** — the design-token unit tests in `apps/web/lib/contrast.test.ts` pin WCAG AA: body-text pairs (primary/secondary on surface/canvas) ≥ 4.5:1, tinted badge pairs (success/error/warning/highlight over their 15% tints, WCAG-composited) ≥ 4.5:1, journey accents and highlight-on-canvas ≥ 3:1 large-text threshold. Live spot-checks on rendered pages measured: hero h1 17.62:1, secondary hero text 9.30:1, journey-a kicker 9.09:1, chip text 7.16:1, mode badge 7.02:1, "action" badge 6.04:1, error banner/error-heading/Failed badge 6.30–7.03:1, warning *"Not available"* 10.64:1 — all ≥ AA for their sizes. |
| A7 | Reduced-motion behaviour | **PASS** — `app/globals.css` pins a `@media (prefers-reduced-motion: reduce)` block that forces `transition-duration: 0.01ms`, `animation-duration: 0.01ms`, `animation-iteration-count: 1` and `scroll-behavior: auto` on everything. With `reducedMotion: "reduce"` emulated on the Run 1 dashboard: 0 elements with a running animation, 0 transitions longer than 0.01 ms, 0 elements hidden behind opacity — and the full dashboard content (finding, both journeys, inspector, methodology) is present unchanged. No content depends on motion. |
| A8 | Readable headings and statistics | **PASS** — heading hierarchy is strict `h1 → h2 → h3` on both pages (homepage: h1 *"Does this interface make both choices equally easy?"* → h2 *"From action to evidence"* → h3 card titles; dashboard: h1 scenario → h2s finding/journeys/inspector → h3 micro-sections; recorded in `home-headings.json` / `run1-headings.json`). Statistic values render at 32 px in JetBrains Mono with `tabular-nums` (computed style verified: `font-variant-numeric: tabular-nums`), so multi-digit counts keep fixed widths. |

---

## Cosmetic observations recorded during validation

No functional usability defects were found. Two cosmetic items are routed to the
follow-up fix task; neither blocks comprehension or accessibility criteria.

1. **(Cosmetic, Low) Focus-ring colour on launcher cards and `<summary>` elements does not use the designed highlight token.** Under keyboard focus, launcher scenario/mode cards compute `outline-color: currentColor` (rgb(244,247,251)) and the two `<summary>` disclosures fall back to the UA default ring (`auto 1px`), while links/buttons/inputs correctly get `3px solid var(--color-highlight)` (rgb(120,166,255)).
   *Repro:* load `/`, Tab from page top to the *"membership-balanced"* card, inspect the ring colour (also `SUMMARY Limitations`), or read `getComputedStyle` as in the probe (`outline-census.json`, `launcher-focus-diagnostic-2.json`).
   *Diagnosis:* the compiled utility `.has-…outline-highlight:has(:focus-visible){outline-color:var(--color-highlight)}` exists, matches the label in CSSOM, and `--color-highlight` resolves (`#78a6ff`) on the element, yet the computed value is `currentColor` in Chromium 141 (Playwright 1.65). An isolated replication of the same `:has()` + `@layer` + var pattern renders the correct blue, so the cause is specific to the real stylesheet combination. Suggested fix: give `summary` the same `:focus-visible` outline rule as `a/button/input`, and set the card ring with a plain `:focus-within`-style rule instead of the `has-[:focus-visible]:outline-highlight` utility. The ring is 3 px solid and clearly visible today — visible-focus criteria still pass (A4).
2. **(Cosmetic, Low) Stale phase references in homepage copy.** The hero paragraph says *"Phase 1 shipped the foundation; Phase 2 runs both sides of each choice and records the evidence."*, the explanation section says *"Comparisons now execute locally with the deterministic browser runner; metrics and explanations arrive in later phases."*, and the header badge reads *"Phase 2 local runner"* — but the app now also runs **AI (Nebius)** mode and full evidence dashboards (both demonstrated in §8.4). A judge could briefly misread the app as metrics-less. Suggested fix: update the three copy strings to describe the shipped state (or drop the phase framing).

Notes (no action routed):
- The Next.js dev overlay (the small "N" button at the lower-left of dev captures) is a dev-server tool, not part of the app; it does not appear in a production build.
- Checkpoint images use `loading="lazy"`; in the mobile full-page capture the below-fold tiles may not have been fetched at capture time. Expected lazy-load behaviour — the desktop pass fetched all 10 artifact PNGs (HTTP 200, `naturalWidth = 1280`).

---

## Evidence — end-to-end AI run log (absorbed from `docs/submission/ui-runs.md`)

This section merges the former standalone run log `docs/submission/ui-runs.md` (deleted in
the same commit as this report) and is now the single authoritative judge-facing
validation record for UI runs. Every value below was observed on **2026-11-18** through
the **real web UI** (`http://localhost:3000`) against the real benchmark
(`http://localhost:3001`) with genuine Nebius inference (applies to Runs 1–2
below; the §8.1–§8.3 walkthrough spent no inference credits — see header) — no mocks, no API calls standing
in for UI runs. Fixture expected counts appear only in the labelled *expected (fixture)*
parenthetical and are never presented as measurements; observed values are labelled
*actual*. Companion §4 live results: `LIVE_TEST_RESULTS.md` (not duplicated here).

**Setup and endpoint health.** Dev servers `npx pnpm@12.18.0 dev` (`next dev`: :3000 web
+ :3001 benchmark). Both endpoints were confirmed with plain, uncredentialed
`Invoke-WebRequest` navigation on 2026-11-18:

```
GET http://localhost:3000 -> HTTP 200
GET http://localhost:3001 -> HTTP 200
```

(an earlier review previously carried this claim; it is now independently re-confirmed
here, both before and after the §8 walkthrough).

- **Branch:** `feat/phase-5-final-validation`
- **Mode for both runs:** **AI (Nebius)** selected in the launcher radio group; credential from gitignored `apps/web/.env.local` (key value never printed or committed)
- **Initial test driver:** throwaway Playwright script (kept in the gitignored SDD scratch dir, not committed — the validation used stand-alone Playwright probes). It drives the real launcher exactly like `tests/e2e/ai-web.spec.ts` does: check the scenario radio → check the `AI (Nebius)` radio → click **Run comparison** → wait for the detail page's `Completed` status. No code was changed.
- **Validation driver:** throwaway Playwright probe suite in the same scratch dir (14 tests; a stand-alone Playwright driver). Seeded failure-state fixtures were written into `apps/web/data/` (gitignored) by importing the E2E suite's own `writeSeedData` module — the same records `tests/e2e/dashboard.spec.ts` uses — so failed/inconclusive states were viewed in the real UI, not faked.
- **Real-inference evidence:** Next dev does not log outbound HTTPS traffic, so the per-run `ai.inferenceCalls >= 1` values below (with provider/model/token usage, read from the stored JSON records under `apps/web/data/`) are the server-side real-traffic evidence. The dev server log contained no errors during either run.

### Run 1 — `cmp_04cbef31ed3a44c7` · membership-asymmetric

| Field | Value |
|---|---|
| Run id | `cmp_04cbef31ed3a44c7` |
| Scenario | `membership-asymmetric` ("Join vs leave — asymmetric") |
| Mode | `ai` — stored record `record.json` has `"mode":"ai"`, `"status":"completed"` |
| Created | `2026-11-18T00:46:35.082Z` |
| Goal A (join) | `completed` · started `00:46:35.094Z` · completed `00:46:38.893Z` (3.8 s) |
| Goal B (leave) | `completed` · started `00:46:38.902Z` · completed `00:46:55.451Z` (16.5 s) |
| Counts | Join **1 actual** (expected, fixture: 1) · Leave **3 actual** (expected, fixture: 3) · Action difference **2 actual** (expected, fixture: 2) — **no variance** |
| Finding headline | "Leaving required 2 more actions than joining"; ratio `(3+1)/(1+1) = 2`; badge "Observed asymmetry / Evidence complete" |
| Mode badge (dashboard) | **`Mode: AI · zai-org/GLM-5.3-Flash`** |
| Execution metadata card | "6 inference calls · 3326 input / 699 output tokens · 0 rejected · zai-org/GLM-5.3-Flash — Model activity recorded for this run — execution cost, not a measure of interface friction." |
| Journey AI evidence | join `ai`: provider `nebius`, model `zai-org/GLM-5.3-Flash`, prompt `phase3-v1`, **2 inference calls**, 1126 in / 202 out tokens, 0 rejected proposals, `modelErrors: []` · leave `ai`: **4 inference calls**, 2200 in / 497 out tokens, 0 rejected proposals, `modelErrors: []` |
| Per-event AI evidence | every counted action step renders `proposed: click · element-N` + `executed` + a model justification chip; the inspector for Goal A step 2 shows "MODEL-REPORTED JUSTIFICATION (NOT VERIFIED)" with "zai-org/GLM-5.3-Flash · prompt phase3-v1 · 631 tok · 1231 ms" |
| AI-justification chips | present on both journeys ("AI DECISIONS (MODEL-REPORTED)" + `nebius · zai-org/GLM-5.3-Flash · prompt phase3-v1`) |
| Screenshots | real: Goal A track 4/4 images loaded, Goal B track 6/6 loaded; inspector screenshot rendered (`naturalWidth = 1280`); 10 artifact PNGs stored on disk |
| Attempts | **1** (no retry, no error; deterministic mode never used) |
| Anomalies | none |

### Run 2 — `cmp_dfe25737c0937557` · membership-balanced

| Field | Value |
|---|---|
| Run id | `cmp_dfe25737c0937557` |
| Scenario | `membership-balanced` ("Join vs leave — balanced") |
| Mode | `ai` — stored record `record.json` has `"mode":"ai"`, `"status":"completed"` |
| Created | `2026-11-18T00:47:46.042Z` |
| Goal A (join) | `completed` · started `00:47:46.046Z` · completed `00:48:00.616Z` (14.6 s) |
| Goal B (leave) | `completed` · started `00:48:00.621Z` · completed `00:48:13.954Z` (13.3 s) |
| Counts | Join **1 actual** (expected, fixture: 1) · Leave **1 actual** (expected, fixture: 1) · Action difference **0 actual** (expected, fixture: equal counts) — **no variance** |
| Finding headline | "Equal recorded action burden"; badge "Balanced / Evidence complete"; honest balanced reading — "This run recorded no action-count gap between the two goals." |
| Mode badge (dashboard) | **`Mode: AI · zai-org/GLM-5.3-Flash`** |
| Execution metadata card | "4 inference calls · 2216 input / 426 output tokens · 0 rejected · zai-org/GLM-5.3-Flash" |
| Journey AI evidence | join `ai`: provider `nebius`, model `zai-org/GLM-5.3-Flash`, prompt `phase3-v1`, **2 inference calls**, 1108 in / 214 out tokens, 0 rejected proposals, `modelErrors: []` · leave `ai`: **2 inference calls**, 1108 in / 212 out tokens, 0 rejected proposals, `modelErrors: []` |
| Per-event AI evidence | Goal A: step 1 (`join` goal selection) renders `proposed: click · element-2` + `executed`; step 2 (`Join workspace`) renders `proposed: click · element-2` + `executed`, inspector chip "MODEL-REPORTED JUSTIFICATION (NOT VERIFIED)" with "zai-org/GLM-5.3-Flash · prompt phase3-v1 · 633 tok · 12780 ms" (step 1 chip: 689 tok · 1072 ms) · Goal B: step 1 (`leave` goal selection) `proposed: click · element-3` + `executed`; step 2 (`Leave workspace`) `proposed: click · element-2` + `executed` |
| AI-justification chips | present on both journeys ("AI DECISIONS (MODEL-REPORTED)" + `nebius · zai-org/GLM-5.3-Flash · prompt phase3-v1`) |
| Screenshots | real: Goal A track 4/4 images loaded, Goal B track 4/4 loaded; inspector screenshot rendered (`naturalWidth = 1280`); 8 artifact PNGs stored on disk |
| Attempts | **1** (no retry, no error; deterministic mode never used) |
| Anomalies | none |

### Review Focus 2 — every UI run verifiably real AI

Checked from the **stored JSON records** under `apps/web/data/comparisons/` (read-only;
that directory is gitignored and was not committed), not just the UI:

| Check | Run 1 (`cmp_04cbef31ed3a44c7`) | Run 2 (`cmp_dfe25737c0937557`) |
|---|---|---|
| `record.json` `mode` | `"ai"` | `"ai"` |
| `record.json` `status` | `"completed"` | `"completed"` |
| Dashboard badge | `Mode: AI · zai-org/GLM-5.3-Flash` | `Mode: AI · zai-org/GLM-5.3-Flash` |
| Per-event `ai` evidence | yes (model justification chips + `executed` badges on every counted action) | yes (same; values restated above) |
| Journey `ai` summary, `inferenceCalls >= 1` | yes (2 and 4) | yes (2 and 2) |
| `modelErrors` | `[]` | `[]` |
| Any deterministic fallback | none | none |

**Single-flight and matching conditions.** Runs were strictly sequential; the second
started only after the first reached a terminal state. Both journeys of **both** runs
executed under the **same seed** (`seed: "phase-2"` on every journey record and on both
comparison records), satisfying the conditional-display requirement that comparative
numbers only appear under matched conditions. Total real-inference spend: **2 runs,
0 retries** (credit budget respected).

### Screenshot reference captures

Ad-hoc captures live in the gitignored SDD scratch dir
an untracked local QA scratch directory (used during screenshot capture
`docs/submission/assets/`):

- `shot-asymmetric-full.png` — Run 1 dashboard, full page
- `shot-asymmetric-Goal-A-journey.png` / `shot-asymmetric-Goal-B-journey.png` — Run 1 journey panels
- `shot-asymmetric-inspector.png` — Run 1 evidence inspector (step 2, model justification chip)
- `shot-balanced-full.png`, `shot-balanced-Goal-A-journey.png`, `shot-balanced-Goal-B-journey.png`, `shot-balanced-inspector.png` — Run 2 equivalents

The review additionally captured (same scratch dir, the local QA output directory): homepage desktop and
mobile, both run dashboards at desktop and mobile widths, the inspector after step
selection, the keyboard-focused launcher cards, all five seeded honest-state pages, and a
reduced-motion capture — usable as spares or for the accessibility slides.

Evidence JSON from the driver (`evidence-asymmetric.json`, `evidence-balanced.json`) sits
beside them in the same scratch dir.

---

## Appendix — probe inventory (this task)

Throwaway, uncommitted, under
an untracked local QA scratch directory:

- `probes.spec.ts` + `probe.config.ts` — 14 tests: homepage desktop/mobile copy + contrast + headings; Run 1 dashboard desktop (layout boxes, inspector flow, methodology, focus audit, artifact HTTP statuses) and mobile stacking; Run 2 dashboard desktop + mobile; five seeded honest-state pages; keyboard-only dashboard journey; keyboard-only run activation; reduced-motion emulation.
- `contrast-dashboard.spec.ts` — dashboard/failure-state contrast spot-checks + image-alt audit.
- `focus-diagnostic*.spec.ts`, `outline-census.spec.ts`, `isolated-has.spec.ts`, `replicate-tailwind.spec.ts` — finding #1 diagnostics.
- `seed-appdata/` — Playwright globalSetup that writes the E2E seed fixtures into `apps/web/data` (gitignored).
- `out/` — all text dumps, JSON measurements and screenshots cited above.

No production code was changed in this task; the only tracked changes are this report and
the deletion of the absorbed `docs/submission/ui-runs.md`.
