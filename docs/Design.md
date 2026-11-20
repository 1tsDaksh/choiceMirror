# ChoiceMirror — interface and design system

**Brand line:** *See both sides of the click.*  
**Product tone:** Precise, evidence-first and calm; explain measured differences without claiming malicious intent.

## Visual language

- Dark analytical workspace with deep navy canvas `#0B1020` and card surface `#141C30`.
- **Goal A:** teal; **Goal B:** violet. Always pair colour with goal labels, text and icons.
- Consistent mirrored tracks in a two-column desktop layout that stack vertically on narrow screens.
- Distinct surfaces for recorded evidence, calculated statistics and model-reported commentary.
- Clear headings, concise metrics and obvious access to the evidence inspector.

## Screens

**Scenario launcher** — A concise explanation, four selectable benchmark cards (membership/consent, balanced/asymmetric), a deterministic/AI selector and a prominent **Run comparison** action. On the public demo, AI is the default; usage restrictions are visible.

**Running state** — Visible in-progress status with both journeys identified. The UI must never claim completion before the result is stored.

**Comparison dashboard** — Scenario and execution mode in the header, one evidence-backed main finding, action-count metrics, two mirrored event timelines, and a selectable screenshot inspector.

**Evidence inspector** — Real PNG screenshots with step number, timestamp, action label, recorded outcome and a separate “model-reported” justification when applicable.

**Methodology and limitations** — Explain counting rules, the difference and ratio formula, when evidence is insufficient, and why results do not establish intent or legal compliance.

## Accessibility

- Keyboard-operable controls and predictable focus movement.
- Visible focus rings; descriptive labels for screenshots and actions.
- Text contrast targets compatible with WCAG AA, with design-token checks in `apps/web/lib/contrast.test.ts`.
- Reduced-motion support; no decorative animation should obscure evidence.
- Responsive comparison tracks without horizontal overflow at mobile widths.
- Do not use colour alone to indicate journey A/B or status.

## Copy rules

- Use **“recorded actions”**, **“difference”** and **“inconclusive”** where supported.
- Display **“Not available”**, not a fabricated zero, for unobserved data.
- Label model-generated justifications **model-reported, not independently verified**.
- Keep Nebius usage/call counts separate from UX friction measurements.
- Describe all examples as **synthetic benchmarks**, not audits of named companies.

## Components

Reusable components under `apps/web/components/` include `ScenarioLauncher`, `ComparisonSummary`, `FindingCard`, `MetricCard`, `MirroredJourneys`, `JourneyTimeline`, `EvidenceInspector` and `MethodologyPanel`.

Use the existing layout, focus, spacing and colour tokens when adding features. Genuine screenshot provenance is documented in [assets/PROVENANCE.md](submission/assets/PROVENANCE.md).
