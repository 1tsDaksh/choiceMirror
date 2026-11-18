# Demonstration asset provenance

Captured **2026-11-18** against the live local app (`http://localhost:3000`, ChoiceMirror
web; benchmark fixture on `:3001`). Every screenshot is a real rendered frame of the
running Next.js app — real launcher, real stored comparison records served from the
file-backed store, real journey evidence images rendered from storage. No fabricated,
mocked, or illustrative pages; no image was cropped or edited after capture (the only
pre-capture adjustment was hiding the Next.js dev-only floating launcher button
`#devtools-indicator`, a development artifact that is not part of the product UI).

Capture method: a throwaway Playwright (chromium) script
(`page.screenshot`, `fullPage: true` for full-page shots), run from the repo-root
`node_modules`. The script is kept in a local temp dir and is **not committed**. The
script verified each intended state before shooting (radio checked, status banner
"Completed", finding headline present, inspector image `naturalWidth > 0`,
`<details open>` for Limitations) and collected zero browser console errors across
all seven captures. The Next.js dev error overlay was asserted absent before every shot.

| File | State captured | Run / source | Scenario · Mode | Viewport |
| --- | --- | --- | --- | --- |
| `01-homepage-launcher.png` | Homepage with `membership-asymmetric` scenario selected (paired-goals panel visible) | launcher only — no run | membership-asymmetric · n/a (mode not chosen) | 390×844 (mobile-width) |
| `02-ai-mode-selected.png` | Launcher with `membership-asymmetric` selected **and** "AI (Nebius)" mode selected; "Run comparison" **not** clicked | launcher only — no run | membership-asymmetric · AI (Nebius) | 1280×820 |
| `03-comparison-asymmetric.png` | Full completed comparison dashboard: finding "Leaving required 2 more actions than joining", Journey A = 1 / Journey B = 3 / difference = 2, execution metadata (6 inference calls), both journey timelines with screenshot checkpoints | `cmp_04cbef31ed3a44c7` | membership-asymmetric · AI (Nebius, zai-org/GLM-53-Flash) | 1280×820 |
| `04-comparison-balanced.png` | Full completed comparison dashboard: finding "Equal recorded action burden", Journey A = 1 / Journey B = 1 / difference = 0, execution metadata (4 inference calls) | `cmp_dfe25737c0937557` | membership-balanced · AI (Nebius, zai-org/GLM-53-Flash) | 1280×820 |
| `05-mirrored-journeys.png` | Mirrored journey timelines (Goal A join vs Goal B leave) with recorded steps and screenshot checkpoints, from run `cmp_04cbef31ed3a44c7` | `cmp_04cbef31ed3a44c7` | membership-asymmetric · AI | 1280×820 |
| `06-evidence-inspector.png` | Evidence inspector open on Goal A · Step 2 "Join workspace", showing the real stored benchmark screenshot captured during the run, with model-reported justification (631 tok · 1231 ms) | `cmp_04cbef31ed3a44c7` | membership-asymmetric · AI | 1280×820 |
| `07-finding-limitations.png` | Main finding card with the **Limitations** section expanded (all four limitation bullets visible) | `cmp_04cbef31ed3a44c7` | membership-asymmetric · AI | 1280×820 |

## Credential / PII sweep (Review Focus 1)

Each PNG was opened and visually inspected after capture. Checked for: API-key-shaped
strings (`v1.`-style key material), `Bearer` / authorization headers, any credential
or token values, personal data (names, emails, addresses), and anything secret-like.

| File | Sweep result |
| --- | --- |
| `01-homepage-launcher.png` | **Clean.** Public marketing copy, scenario catalog, scenario ids only. No keys, tokens, Bearer strings, or personal data. |
| `02-ai-mode-selected.png` | **Clean.** Launcher UI only; model *name* label "AI (Nebius)" is product copy, not a credential. No keys/tokens/PII. |
| `03-comparison-asymmetric.png` | **Clean.** Shows run id, ISO timestamps, model id (`zai-org/GLM-53-Flash`), and aggregate token *counts* — none of which are secrets. No key material, no `Bearer`, no personal data. |
| `04-comparison-balanced.png` | **Clean.** Same categories as shot 3 (run id, timestamps, model id, token counts). No key material, no `Bearer`, no personal data. |
| `05-mirrored-journeys.png` | **Clean.** Timeline steps, element refs (`element-2`/`element-3` are DOM fixture labels, not credentials), token counts. No keys/tokens/PII. |
| `06-evidence-inspector.png` | **Clean.** The embedded image is genuine stored run evidence (synthetic benchmark fixture: "Synthetic local data. No accounts, submissions, or external services are used."). Timestamp, model id, token count only. No key material, no `Bearer`, no personal data. Note: the embedded stored screenshot contains the benchmark app's own tiny devtools badge, baked into the evidence image at run time — part of the real stored evidence, left untouched. |
| `07-finding-limitations.png` | **Clean.** Finding text and limitation bullets only. No keys/tokens/PII. |

**Sweep outcome: 7/7 clean — no credential or PII hits; nothing recaptured for sweep
reasons.** (One pre-capture adjustment — hiding the dev-only Next.js launcher button —
was made for all shots; see the note above.)
