# ChoiceMirror — Design System

**Version:** 0.1 · **Status:** Proposed visual direction
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

## Accessibility and motion
- Aim for WCAG 2.2 AA contrast (verify tokens with contrast tests rather than assuming compliance).
- All UI usable by keyboard, visible focus rings, semantic landmarks and labels.
- At least 44x44px touch targets where feasible.
- Respect `prefers-reduced-motion`; avoid auto-advancing evidence.
- Screenshots require descriptive metadata; provide textual trace alternatives.
- Do not encode harder/easier outcomes using red/green alone.

## Demo presentation
Frame 1: two symmetrical buttons; Frame 2: AI attempts each goal; Frame 3: split-screen evidence; Frame 4: grounded finding and limits.

## Avoid
Overloaded analytics, cyberpunk neon, tiny typography, flashing warning badges, exaggerated AI animations, fake social proof or a design that hides unknown status.

**Implementation condition:** these are design requirements, not claims about completed components.
