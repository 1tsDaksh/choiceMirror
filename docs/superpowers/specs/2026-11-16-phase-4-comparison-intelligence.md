# ChoiceMirror — Phase 4 Development Instructions (Spec)

> Captured verbatim from the project owner's Phase 4 instructions, 2026-11-16.
> This is the specification the Phase 4 implementation plan implements.

## Role and Objective

You are the **Lead Full-Stack Engineer, Data/Analytics Engineer, and UI/UX Engineer** responsible for developing **Phase 4: Comparison Intelligence, Evidence-Linked Findings, and Dashboard Polish**.

**Repository:** https://github.com/1tsDaksh/choiceMirror

**Base branch:** `main`

**Feature branch:** `feat/phase-4-comparison-intelligence`

**Current status:** Phases 1, 2, and 3 have been completed and merged into `main`.

**AI provider:** Nebius Token Factory
**Existing AI model:** `zai-org/GLM-5.3-Flash`

**Hackathon deadline:** December 7, 2026.

### Main Objective

Transform ChoiceMirror into an application that clearly demonstrates **how two opposing digital choices differ in measurable effort**.

Users should be able to run an AI-powered comparison, immediately understand which journey involved more recorded steps, explore the underlying evidence, and understand the limitations of the findings.

The completed Phase 4 experience should feel like a polished, credible product rather than a developer testing interface.

---

## 1. STRICT SCOPE — PHASE 4 ONLY

You must implement **Phase 4 only**.

### You ARE responsible for:

- Deterministic comparison metrics.
- Evidence-linked findings.
- Side-by-side journey visualisation.
- Screenshot and event inspection.
- Professional dashboard design.
- Responsive and accessible UI.
- Proper handling of incomplete and unsuccessful journeys.
- Repeatability testing and documentation.
- Updating project memory and architecture documentation.

### You are NOT responsible for:

- Phase 5 deployment.
- Hackathon submission preparation.
- Creating a presentation or demo video.
- Adding real third-party website scanning.
- Adding new AI models or changing AI providers.
- Rebuilding the browser runner.
- Adding user accounts, payments or subscriptions.
- Developing an unrelated AI chatbot.
- Implementing unsupported legal-compliance judgments.

**Do not begin Phase 5 under any circumstances.**

---

## 2. Read and Understand the Existing Codebase

Before making changes:

1. Pull the latest changes from `main`.
2. Read the README and applicable `AGENTS.md` instructions.
3. Review all six documents in `/docs`:
   - `PRD.md`
   - `Architecture.md`
   - `Rules.md`
   - `Phases.md`
   - `Design.md`
   - `Memory.md`
4. Examine the existing comparison API, evidence schemas, file-backed storage, Playwright runner, AI navigation and UI components.
5. Review the existing automated tests and development conventions.
6. Establish what is already working before changing any implementation.

Preserve all functionality from Phases 1–3.

The existing system already captures:

- Comparison IDs and scenario IDs.
- Opposing goals.
- Journey completion statuses.
- Ordered trace events.
- Action counts and timestamps.
- Screenshot references.
- AI action proposals and validation outcomes.
- Nebius model provenance and token usage.

**Use this existing evidence as the basis of Phase 4. Do not generate artificial metrics or mock results for the actual application.**

---

## 3. Build the Deterministic Metrics Engine

Create a dedicated metrics module, ideally:

`packages/metrics/`

Keep all calculations separate from React components, the Nebius adapter and browser execution.

### Required metrics

For each journey, calculate:

1. **Completion outcome** — completed, failed, blocked, timed out or not yet available.
2. **Recorded action count** — based on successful, counted trace events.
3. **Recorded navigation events** — only where directly observable.
4. **Journey duration** — derived from stored timestamps.
5. **Rejected AI proposals** — available in AI mode.
6. **Model inference calls and token usage** — where available.
7. **Evidence completeness** — whether the trace and required screenshots exist.

For the paired comparison, calculate:

- Action-count difference between Journey A and Journey B.
- Which journey required more recorded actions.
- Relative action burden, when both journeys completed successfully.
- Whether the two journeys were completed under comparable conditions.
- An overall comparison result: balanced, observed asymmetry, or inconclusive.

### Important measurement rules

**The goal-selection click does not count as an action.** This convention was established in Phase 2 and must remain consistent.

Do not count failed AI proposals as successful browser actions.

Do not use `expectedActionCount` as the measured result. Derive measurements from actual execution records; use fixture expectations only for validation.

Do not invent backtracking, interruptions, dead ends or navigation events that the current trace format cannot prove. If these are not captured, label them as unavailable rather than reporting zero.

Do not use model inference latency as a direct measure of human interface difficulty.

A comparison controller marked `completed` does not necessarily mean both individual journeys succeeded. Check each journey's actual outcome.

### Example

For the asymmetric membership benchmark:

| Metric | Join | Leave |
|---|---|---|
| Recorded actions | 1 | 3 |
| Completed | Yes | Yes |

The system should derive:

- Difference: 2 additional recorded actions to leave.
- More demanding recorded journey: Leave.
- Finding: "Leaving required three recorded actions, compared with one for joining."

This is a **descriptive measurement**, not proof that the website deliberately manipulates users.

### Optional asymmetry indicator

You may implement a simple normalized action-burden indicator if useful.

Use the existing PRD convention when both journeys successfully complete:

`action_ratio = (max(actionsA, actionsB) + 1) / (min(actionsA, actionsB) + 1)`

Explain the formula in the interface and documentation.

Prefer displaying actual counts and their difference over introducing an arbitrary score out of 100.

Never produce a definitive manipulation score, legal verdict, or unsupported percentage.

---

## 4. Implement Evidence-Linked Findings

This is one of the most important features of Phase 4.

Create a deterministic explanation engine that converts verified comparison metrics into clear, understandable findings.

### Example finding

**Observed choice asymmetry**

"Leaving the workspace required two additional recorded actions compared with joining."

**Supporting evidence:**

- Join journey: one successful counted action.
- Leave journey: three successful counted actions.
- Links to the corresponding trace events.
- Relevant screenshots showing the recorded stages.

### Finding requirements

Each finding must contain:

- A unique identifier.
- A clear title.
- A concise explanation.
- A finding category.
- References to supporting journey IDs and trace events.
- Available screenshot references.
- Evidence limitations.
- A defensible evidence-quality or confidence label.

### Evidence integrity

Every referenced event must actually exist in the stored journey.

Every screenshot reference must correspond to a recorded artifact.

Never allow model-generated text to invent event IDs, action counts, screenshots or causal explanations.

Separate the following concepts:

- **Observed:** recorded browser events and screenshots.
- **Calculated:** action differences, ratios and durations.
- **Interpreted:** cautious explanations of what the recorded differences might mean.

Evidence quality is not the same as statistical confidence. A single successful run cannot establish that a website always behaves that way.

### AI integration

Retain the existing Phase 3 Nebius agent for browser navigation.

A second AI explanation call is **not required** for Phase 4. Prefer deterministic, evidence-grounded explanations for the MVP.

If considering additional model-generated wording, it must be strictly evidence-bounded, validated against real trace references, optional, and must not replace deterministic findings.

Do not increase model costs unnecessarily.

---

## 5. Design the Comparison Dashboard

Replace the current developer-oriented comparison presentation with a cohesive, professional dashboard while preserving access to all existing evidence.

Follow `docs/Design.md`.

### Main dashboard layout

#### A. Comparison header

Display:

- Benchmark scenario name.
- Paired goals.
- Execution mode: Deterministic or AI (Nebius).
- Actual completion states.
- Model identifier when using AI.
- Comparison timestamp.

Avoid making the comparison ID the main page title. Keep it available as secondary metadata.

#### B. Main finding

Place the most important verified finding near the top of the page.

A visitor should understand the core result within approximately 10 seconds.

Example:

**Leaving required 2 more actions than joining.**

Supporting description:

"Both journeys completed successfully in the controlled benchmark. The leaving journey required three recorded actions, compared with one for joining."

Include a direct interaction to inspect the supporting evidence.

For balanced journeys, report that the observed action burden was equal rather than inventing a finding.

For incomplete comparisons, show **Inconclusive** and explain which evidence is missing.

#### C. Metric summary

Display clear metric cards for:

- Journey A actions.
- Journey B actions.
- Action difference.
- Completion outcomes.
- Relevant AI execution metadata.

Metrics should include units and definitions.

Do not mix token usage with human UX friction metrics.

#### D. Mirrored journey comparison

Implement two visual journey tracks.

**Journey A — Teal**

**Journey B — Violet**

Each track should show:

- Initial state.
- Goal selection.
- Recorded action steps.
- Completion or failure.
- Relevant screenshot checkpoints.

Use equal-width columns on desktop and a readable stacked layout on mobile.

The comparison must remain understandable without relying on colour alone.

#### E. Evidence inspector

Allow users to select a recorded event and inspect:

- The actual screenshot.
- Event number and timestamp.
- Action label.
- Execution outcome.
- Whether it counted as an action.
- AI-proposed action, where available.
- Validation result.
- Model-reported justification, clearly labelled.

Use the existing screenshot API.

Do not fabricate or reconstruct screenshots.

A basic event-stepper or selectable timeline is acceptable. A complex animated browser replay is optional and must not take priority over core functionality.

#### F. Limitations and methodology

Include a concise, accessible explanation of:

- The controlled benchmark environment.
- How actions are counted.
- Which measurements are directly observed.
- Why an action difference is not proof of unlawful or intentional manipulation.
- The distinction between AI navigation and measured interface friction.

Keep technical details available without overwhelming the primary dashboard.

---

## 6. Visual Design Requirements

Follow the existing ChoiceMirror design system.

### Colours

| Element | Colour |
|---|---|
| Background | `#0B1020` |
| Card surfaces | `#141C30` |
| Elevated surfaces | `#1C2940` |
| Primary text | `#F4F7FB` |
| Secondary text | `#A8B7CC` |
| Journey A | `#4FD1C5` |
| Journey B | `#A78BFA` |
| Highlight | `#78A6FF` |
| Warning | `#F5C66B` |
| Error | `#FB7185` |

### Typography

- Primary font: Inter.
- Technical details: JetBrains Mono.
- Clear, high-contrast headings.
- Consistent text hierarchy.
- Legible numerical statistics.
- Generous whitespace.

### Design direction

The application should feel like a modern UX research and AI auditing tool.

Prioritise clarity, evidence, thoughtful visual hierarchy and a clean analytical interface.

Avoid:

- Excessive gradients or animations.
- Unnecessary 3D effects.
- Overcrowded dashboards.
- Decorative charts without meaningful data.
- Fake AI activity indicators.
- Unsupported claims or dramatic warning labels.

The visual centrepiece should be the **mirrored comparison of two user choices**.

---

## 7. Reliability, Partial Results and Error Handling

The interface must correctly handle:

- A comparison that is still running.
- Only Journey A having completed.
- A journey failing.
- A blocked journey.
- A timed-out journey.
- Missing screenshots.
- Missing events.
- Legacy Phase 2 comparison records.
- AI mode without complete model metadata.
- Corrupted or invalid evidence.

A failed journey must never be presented as requiring fewer actions simply because it stopped early.

Do not compare partially completed paths as though their action counts represented full user journeys.

Never hide failures or display placeholder metrics as real results.

Use clear **Pending**, **Running**, **Completed**, **Failed**, **Blocked**, **Timed out** and **Inconclusive** states.

---

## 8. Preserve Existing Security and AI Behaviour

Phase 4 must not weaken the safety controls from Phases 2–3.

Preserve:

- Exact-origin browser restrictions.
- Request interception and redirect protection.
- Isolated browser contexts.
- Bounded action and decision limits.
- Safe model action validation.
- Prompt-injection protections.
- Server-side Nebius credentials.
- Existing inference cost limits.
- The distinction between AI and deterministic execution.

No real API key may appear in source code, screenshots, logs, test snapshots or GitHub commits.

Do not modify the existing AI decision policy unless a demonstrated regression requires a small corrective change.

---

## 9. Testing and Benchmark Validation

Write comprehensive unit tests, integration tests and Playwright E2E tests.

### Metrics unit tests

Cover:

- Balanced journeys with equal action counts.
- Asymmetric journeys with differing action counts.
- Action-count differences and ratios.
- Missing journeys.
- Incomplete journeys.
- Failed, blocked and timed-out journeys.
- Non-counting goal selection.
- Rejected AI proposals.
- Invalid timestamps.
- Legacy comparison records.
- Missing or invalid evidence references.

### Findings tests

Verify that:

- Findings reference existing events.
- Action-count claims match the source data.
- Inconclusive runs do not produce definitive findings.
- No legal or manipulation verdict is generated.
- Missing screenshots cannot create fabricated evidence.

### Dashboard E2E tests

Verify that:

- The comparison dashboard loads correctly.
- Balanced scenarios show balanced results.
- Asymmetric scenarios show the correct action difference.
- Journey A and B remain correctly assigned.
- Selecting a timeline event displays its corresponding evidence.
- Screenshots load successfully.
- Keyboard users can access the inspector.
- Mobile layouts remain usable.
- AI metadata remains visible and accurately labelled.
- Loading, partial and error states are handled correctly.

### Repeatability testing

Perform at least **three independent runs per controlled fixture** using the deterministic runner.

Record the actual outcomes and any variance.

Use the existing mocked-model E2E tests to check integration without spending Nebius credits.

Where valid credentials and an agreed usage budget are available, perform limited repeat runs using the real Nebius model as a separate opt-in evaluation.

**Never describe mocked-model results as real-model performance.**

Document actual observed reliability rather than claiming perfect reliability from one successful run.

---

## 10. Architecture Requirements

Prefer a structure similar to:

```text
packages/
  metrics/
    src/
      journey-metrics.ts
      comparison-metrics.ts
      findings.ts
      evidence-validation.ts
      index.ts

apps/
  web/
    components/
      comparison-summary.tsx
      metric-card.tsx
      mirrored-journeys.tsx
      journey-timeline.tsx
      evidence-inspector.tsx
      finding-card.tsx
      methodology-panel.tsx
```

These are suggested names, not mandatory files. Reuse existing components and follow the repository's established conventions.

Keep metrics calculation pure and deterministic.

Use Zod contracts for calculated results.

Prefer deriving metrics on the server from stored evidence. Persist derived reports only if there is a concrete need; if persistence is used, include a schema/version and handle outdated records correctly.

Do not introduce a new database, queue, microservice or model provider solely for Phase 4.

---

## 11. Required Verification Commands

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

Run any additional Phase 4 metrics and accessibility tests.

Keep real Nebius evaluation separate, opt-in and limited by the configured credit budget.

Fix introduced test failures before opening the PR.

If a required test cannot execute, report the limitation accurately.

---

## 12. Documentation Updates

Update the existing documents:

**`docs/Architecture.md`**

Document the metrics engine, finding generation, evidence references and dashboard data flow.

**`docs/Memory.md`**

Record completed work, architectural decisions, testing evidence, design decisions, important bugs, limitations and next steps.

**`docs/Phases.md`**

Mark Phase 4 complete only after its exit criteria have been demonstrated.

**`docs/Design.md`**

Document any new reusable visual components or design tokens.

**`README.md`**

Explain how to interpret metrics and findings, navigate the evidence dashboard, and understand the application's limitations.

Keep the project memory accurate and avoid claiming untested functionality is complete.

---

## 13. GitHub Development Workflow

1. Pull the latest `main`.
2. Create `feat/phase-4-comparison-intelligence`.
3. Implement the metrics contracts and pure calculation functions.
4. Add comprehensive metrics and findings tests.
5. Integrate calculations with existing comparison evidence.
6. Implement the evidence-linked findings.
7. Build the dashboard and mirrored journey timelines.
8. Add the interactive screenshot inspector.
9. Implement loading, partial, failure and unknown states.
10. Improve accessibility and responsive design.
11. Complete repeatability and integration testing.
12. Run the full verification suite.
13. Update the project documents.
14. Commit logical changes incrementally.
15. Push the feature branch.
16. Open a pull request targeting `main`.

**DO NOT MERGE THE PULL REQUEST.**

Leave it ready for independent review.

---

## 14. Phase 4 Definition of Done

Phase 4 is complete only when:

- [ ] Deterministic metrics are calculated from actual trace evidence.
- [ ] Action counting remains consistent with Phase 2.
- [ ] Balanced and asymmetric journeys are distinguished correctly.
- [ ] Failed or incomplete journeys produce honest, inconclusive findings.
- [ ] Evidence-linked explanations reference real recorded events.
- [ ] All finding references are validated.
- [ ] The comparison dashboard clearly displays the key result.
- [ ] Both journeys appear in a mirrored visual timeline.
- [ ] Users can inspect individual events and their screenshots.
- [ ] The design is polished, responsive and accessible.
- [ ] AI metadata is retained and correctly identified.
- [ ] Existing browser and model safety controls remain intact.
- [ ] At least three repeat runs per benchmark fixture have been evaluated.
- [ ] Relevant unit and E2E tests pass.
- [ ] Typecheck, lint and production builds pass.
- [ ] All six project documents remain accurate.
- [ ] A GitHub pull request is opened for review.
- [ ] No Phase 5 functionality has been implemented.

---

## 15. Final Instructions

You are building the part of ChoiceMirror that communicates its real-world value.

The most important outcome is not another AI feature. It is the ability to **turn genuine AI navigation evidence into a clear, defensible comparison that anyone can understand**.

A successful example would show a visitor that joining a controlled website required one action, leaving required three, and let them inspect exactly which recorded steps account for that difference.

Prioritise:

1. Correct and reproducible measurements.
2. Trustworthy evidence-linked findings.
3. A visually compelling mirrored comparison.
4. A seamless evidence-inspection experience.
5. Reliable, accessible implementation.

Avoid unnecessary complexity.

Make reasonable engineering decisions autonomously, document those decisions, and resolve technical issues within the existing architecture.

**Do not begin Phase 5, do not deploy the application, and do not merge your own PR.**

When finished, provide a report containing:

- Implemented functionality.
- Important architectural changes.
- Screenshots or a description of the completed dashboard.
- Actual benchmark results.
- Verification results.
- Outstanding limitations.
- GitHub pull request URL.

**Begin Phase 4 implementation now.**
