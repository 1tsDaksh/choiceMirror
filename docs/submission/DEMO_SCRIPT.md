# ChoiceMirror — Demo script (spec §10)

**Project:** ChoiceMirror — *See both sides of the click.*
**Target length:** 4:00 (seven segments per the spec's suggested structure)
**Companion assets:** `docs/submission/assets/` (`01-homepage-launcher.png` … `07-finding-limitations.png`, provenance in `assets/PROVENANCE.md`)
**Evidence base:** every number below is transcribed from `LIVE_TEST_RESULTS.md` (§4.2 live evaluation, §6 repeatability) and `VALIDATION_REPORT.md` (§8.4 UI run log). Nothing is anticipated or invented.

> **Recording status:** **screen recording not available in this environment — narration, timing, shot list provided.** Two genuine recording attempts were made (details and exact credit spend under *Recording attempts* below); both captures failed at the headless-browser screencast layer (blank / frozen first frame, frame-verified), while the AI runs they recorded completed genuinely. Per spec §10, no video is claimed or substituted.

---

## Screen sequence and asset list

| Segment | On screen | Source |
|---|---|---|
| 1 · The problem | Homepage hero — "Does this interface make both choices equally easy?" | `01-homepage-launcher.png` |
| 2 · The solution | Launcher with `Join vs leave — asymmetric` selected (paired-goals panel) | `01-homepage-launcher.png` |
| 3 · Real AI execution | **Live action:** select scenario → select **AI (Nebius)** → click **Run comparison** → watch the run; then the completed asymmetric dashboard | `02-ai-mode-selected.png`, `03-comparison-asymmetric.png` |
| 4 · Comparison dashboard | Completed asymmetric dashboard (finding + metric cards), then balanced control | `03-comparison-asymmetric.png`, `04-comparison-balanced.png` |
| 5 · Inspect evidence | Mirrored journey timelines; evidence inspector on Goal A · Step 2; finding + Limitations | `05-mirrored-journeys.png`, `06-evidence-inspector.png`, `07-finding-limitations.png` |
| 6 · Architecture & responsible AI | Any dashboard view + execution metadata card | `03-comparison-asymmetric.png` (execution metadata) |
| 7 · Closing | Homepage hero, end card with tagline | `01-homepage-launcher.png` |

---

## Segment 1 — 0:00–0:25 · The problem

**On screen:** `01-homepage-launcher.png` — homepage hero.

**Narration:**

> Every day we make opposing digital choices: join or leave, accept or reject. But the two sides are rarely symmetric — one direction is often one click, the other a gauntlet of confirmations. We accept this friction as folklore. ChoiceMirror asks: can we *measure* it, with evidence a team can actually inspect?

## Segment 2 — 0:25–0:50 · The solution

**On screen:** launcher with the scenario card `Join vs leave — asymmetric` selected — "A synthetic workspace where joining stays direct while leaving requires three explicit confirmations."

**Narration:**

> ChoiceMirror runs *both* sides of a choice under matched conditions and links every reported difference to inspectable evidence. No screenshots of opinion: measured action counts, recorded events, and per-step captures — on a controlled benchmark page, so the comparison is fair.

## Segment 3 — 0:50–1:40 · Real AI execution

**On screen:** **live action** — check the `Join vs leave — asymmetric` radio, check the **AI (Nebius)** mode radio (`02-ai-mode-selected.png` shows this state), click **Run comparison**, and watch a genuine run. Then cut to the completed dashboard (`03-comparison-asymmetric.png`).

**Narration:**

> Here is a genuinely executed AI navigation — not scripted automation wearing an AI label. The model — Nebius, running `zai-org/GLM-5.3-Flash` — reads the controlled page, proposes each action, and a Playwright runner executes it in a real browser. Every proposal passes schema validation before it can run. In this recorded run, `cmp_04cbef31ed3a44c7`, the dashboard's execution metadata reads: six inference calls, 3,326 input / 699 output tokens, zero rejected — model activity recorded as execution cost, not as a measure of interface friction.

## Segment 4 — 1:40–2:35 · Comparison dashboard

**On screen:** `03-comparison-asymmetric.png` (finding + metric cards), then `04-comparison-balanced.png`.

**Narration:**

> The result: joining took **one** recorded action; leaving took **three**. The finding: "Leaving required 2 more actions than joining" — a measured difference of two, with the matched-seed badge "Observed asymmetry / Evidence complete". And the control? In the balanced scenario run `cmp_dfe25737c0937557`, both sides took one action — "Equal recorded action burden". The tool reports the gap when there is one, and says so honestly when there isn't. This held up at scale in live testing: eight of eight journeys completed in the evaluation suite, and across the twelve-pair, three-round repeatability sweep every scenario-goal pair produced an identical action count round over round — twenty-four journeys, zero errors.

## Segment 5 — 2:35–3:10 · Inspect evidence

**On screen:** `05-mirrored-journeys.png` → click Step 2 on Goal A → `06-evidence-inspector.png` → open Limitations → `07-finding-limitations.png`.

**Narration:**

> Every number is backed by evidence you can open. The mirrored timelines show each recorded step with its screenshot checkpoint, taken at execution time. The inspector opens the actual stored capture for "Join workspace", alongside the model's justification — clearly labelled *model-reported, not verified*. And the Limitations section states the boundaries up front: action differences are descriptive measurements — not proof of unlawful or intentional manipulation; this is a single run on the controlled local benchmark; counts reflect recorded browser actions only — backtracking, interruptions, and dead ends are not captured by the trace format; and model-reported justifications are recorded as reported, not independently verified.

## Segment 6 — 3:10–3:40 · Architecture and responsible AI

**On screen:** execution metadata card on `03-comparison-asymmetric.png`.

**Narration:**

> Under the hood, five commitments keep this honest. **Nebius** provides the AI navigation — the model proposes, it never acts alone. **Playwright** executes every proposal in a controlled browser against a synthetic local benchmark — no accounts, no external services. **Zod** validates every proposed action against a strict schema; invalid proposals are rejected, never executed. The **metrics are deterministic** — action counts are computed from recorded events, never from model self-report. **Origin restrictions** pin every journey to the benchmark origin, and **evidence integrity** comes from per-step screenshots and stored run records under matched seeds — with honest "inconclusive" states when evidence is missing or mismatched.

## Segment 7 — 3:40–4:00 · Closing

**On screen:** homepage hero; end card.

**Narration:**

> The potential: UX researchers can quantify friction on cancel versus subscribe flows; accessibility auditors can flag where one direction of a choice piles on extra steps. ChoiceMirror doesn't judge intent — it shows both sides of the click, with the evidence to prove it. See both sides of the click.

**Banned claims (spec §10):** this demo must not claim or imply proven malicious intent or legal violations by any real product. All findings describe *measured friction on synthetic benchmark interfaces*; the closing covers UX-research and accessibility-auditing potential only.

---

## Recording attempts (genuine, bounded — full disclosure)

Two real AI comparisons were executed for this task — the only credit spend, now capped. Both runs **completed genuinely** (stored records verified via the app's own API); both **screen captures failed** at the headless-chromium screencast layer and were rejected after frame-level verification (canvas-decoded samples across the full timeline). No video is presented in place of a working capture.

| | Attempt 1 | Attempt 2 |
|---|---|---|
| Run id | `cmp_09fbe35b4c4be058` | `cmp_fb58cba4edf96e40` |
| Flow driven | homepage → `Join vs leave — asymmetric` → AI (Nebius) → Run comparison → Completed → dashboard → inspector | same |
| Stored outcome | `mode: "ai"`, `status: "completed"` — join **1** action (2 calls, 1,126 in / 190 out), leave **3** actions (4 calls, 2,200 in / 444 out) | `mode: "ai"`, `status: "completed"` — join **1** action (2 calls, 1,126 in / 194 out), leave **3** actions (4 calls, 2,200 in / 508 out) |
| Inference spend | 6 calls · 3,326 input / 634 output tokens · 0 rejected · `modelErrors: []` | 6 calls · 3,326 input / 702 output tokens · 0 rejected · `modelErrors: []` |
| Capture result | **Rejected:** webm entirely blank (canvas-verified pure white at 9 sampled timestamps; 40.0 s) | **Rejected:** webm frozen on the first frame, repeated for the full duration (8/8 sampled timestamps pixel-identical; 51.3 s) |
| Credential sweep | page-text scan: 0 hits for key/Bearer patterns | page-text scan: 0 hits; 0 console errors; no dev overlay |

**Total recording-task spend: 2 comparisons — 12 inference calls, 6,652 input / 1,336 output tokens.** Model `zai-org/GLM-5.3-Flash`, prompt `phase3-v1`, provider Nebius. The API key lives only in the gitignored `apps/web/.env.local`, loaded server-side by the dev server; it was never printed, opened, or committed. Capture scripts and artifacts remain untracked scratch.

**Timing honesty:** the seven segment timings above are the narration/edit plan (4:00 total). The raw capture attempts produced 40.0 s and 51.3 s artifacts respectively; neither is usable footage, so no "raw cut length" is claimed. With a working screen recorder, the same shot list and this narration yield the 4:00 cut directly.
