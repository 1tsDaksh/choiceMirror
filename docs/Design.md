# ChoiceMirror — Design System

**Version:** 0.2 · **Status:** Visual direction; Phase 4 dashboard components shipped against it
**Personality:** evidence-first, precise, calm, trustworthy and technically sophisticated.

## Brand concept
ChoiceMirror places **two equal journeys side by side**, showing their paths as mirrored tracks. A visual split is useful, but do not visually imply wrongdoing before evidence is presented.

**Brand line:** *See both sides of the click.*
**Product positioning:** *AI-powered evidence for fairer digital choices.*

## Theme
**Primary:** Dark-mode analysis workspace with optional light surfaces for screenshots.
- Canvas: `#0B1020` — deep navy.
- Surface: `#141C30` — cards and inspection panels.
- Elevated surface: `#1C2940` — dialogs / active panels.
- Primary text: `#F4F7FB` — soft white.
- Secondary text: `#A8B7CC` — readable muted slate.
- Accent A (journey A): `#4FD1C5` — teal.
- Accent B (journey B): `#A78BFA` — violet.
- Highlight: `#78A6FF` — selected elements / links.
- Warning: `#F5C66B` — uncertainty/attention.
- Error: `#FB7185` — actual technical failures.
- Success: `#57D9A3` — verified completed actions.

Color must *not* be the sole carrier of status. Pair with labels, icons and patterns.

## Typography
- **Primary UI font:** Inter (system sans-serif fallback).
- **Technical data/IDs:** JetBrains Mono (ui-monospace fallback).
- Headline: 34–40px, weight 700, line-height 1.15.
- Section title: 22–26px, weight 650–700.
- Card heading: 16–18px, weight 600.
- Body: 15–16px, weight 400, line-height 1.5.
- Secondary metadata: 12–13px, weight 450, with accessible contrast.
- Numeric evidence: 24–32px, tabular numbers and monospaced labels where appropriate.

## Layout
- Max main content width: 1280px.
- Desktop: persistent left navigation (or compact top navigation); 12-column grid, generous gutters.
- Side-by-side comparison: equal 50/50 columns for Journey A and Journey B.
- Mobile: journeys stack vertically while preserving the same order and labels.
- Standard spacing increments: 4, 8, 12, 16, 24, 32px.
- Surface radius: 12–16px; controls: 8–12px.
- Thin neutral borders; subtle shadows; no heavy glassmorphism.

## Key screens
### 1. Landing / scenario launcher
- Hero: `Does this interface make both choices equally easy?`
- One-sentence description; paired goal selector and “Run comparison” CTA.
- Fixture badges say `Controlled benchmark`, with concise explanation.
- Honest disabled state if runner is unavailable.

### 2. Running state
- Visual mirror of two bounded progress tracks.
- Current goal, last recorded action, elapsed time and step budget.
- Clear “Stop run” control, technical failure and “unknown” states.
- Never display fictional interim results.

### 3. Comparison dashboard
- Top: named benchmark + completion status for each journey.
- Middle: action counts, navigations, interruptions, timestamps with scope notes.
- Main evidence: paired journey timelines with highlighted steps, screenshot thumbnails and click-to-inspect views.
- Bottom: cautiously worded takeaways with trace IDs, confidence and known limitations.
- Focus the eye on **evidence**, not a sensational one-number grade.

### 4. Evidence detail
- Screenshot and source event on one side; event properties and reasoning on other.
- Show whether evidence is observed, measured or model-interpreted.
- Include environment and model provenance for auditability.

## Visual components
- `JourneyColumn`: consistent labels A and B, distinct color token and goal.
- `EvidenceCard`: observation, event index, screenshot, provenance.
- `MetricTile`: number, unit and measurement definition.
- `RunStatus`: pending/running/completed/partial/failed with text + icon.
- `DifferenceIndicator`: avoids unsupported causal claims and includes both base values.

### Shipped components (Phase 4)
The original names above shipped as reusable components in `apps/web/components/`, reusing the existing design tokens unchanged (no new colours, spacing, or typography):
- `ComparisonSummary` — scenario-name header: status banner, mode badge (`Mode: Deterministic` / `Mode: AI · <model>`), seed/origin line.
- `FindingCard` — the main finding: title, explanation, observed/calculated/interpreted lists, limitations, quality chip, and the **Inspect supporting evidence** action (role `Main finding`).
- `MetricCard` — number with unit and measurement definition; friction metrics and AI execution metadata are kept in separate cards.
- `MirroredJourneys` — equal desktop columns for Goal A (teal) and Goal B (violet) that stack on mobile; labels and status badges accompany colour so it is never the sole carrier.
- `JourneyTimeline` — selectable recorded steps per track: goal selection, counted actions, completion, screenshots, validation badges.
- `EvidenceInspector` — screenshot plus step number, timestamp, action label, outcome, counted-as-action, model-reported justification, and a previous/next stepper with focus management.
- `MethodologyPanel` — static `How these measurements work` disclosure: scope, counting rules, observed/calculated/interpreted, the ratio formula, limits, and AI-metadata-vs-friction.

### Copy standards (introduced Phase 4)
- **Verdict-language ban:** finding titles and explanations never assert manipulation, illegality, or intent ("dark pattern", "scam", "illegal"); the descriptive-not-proof disclaimer appears only in limitations.
- **`Not available` over `0`:** unobservable metrics render as `Not available` / `—`, never a fabricated zero.
- **Evidence classes stay separated:** observed (from stored events), calculated (documented formulas), interpreted (a reading of the evidence) are labelled distinctly.
- **Model output is labelled:** justifications render as model-reported, and token/latency figures are execution metadata, not friction measures.

## Accessibility and motion
- Aim for WCAG 2.2 AA contrast — enforced since Phase 4 by `apps/web/lib/contrast.test.ts`, which pins 4.5:1 for body-text pairs, 4.5:1 for 15%-tinted badge pairs after compositing, and 3:1 for journey accents against the `globals.css` tokens.
- All UI usable by keyboard, visible focus rings, semantic landmarks and labels.
- At least 44x44px touch targets where feasible.
- Respect `prefers-reduced-motion`; avoid auto-advancing evidence.
- Screenshots require descriptive metadata; provide textual trace alternatives.
- Do not encode harder/easier outcomes using red/green alone.

## Demo presentation
Frame 1: two symmetrical buttons; Frame 2: AI attempts each goal; Frame 3: split-screen evidence; Frame 4: grounded finding and limits.

## Avoid
Overloaded analytics, cyberpunk neon, tiny typography, flashing warning badges, exaggerated AI animations, fake social proof or a design that hides unknown status.

**Implementation condition:** these are design requirements. Phase 4 shipped the components listed above against them; anything new must follow the same tokens, copy standards, and accessibility checks.
