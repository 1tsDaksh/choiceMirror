# ChoiceMirror — Product Requirements Document (PRD)

**Version:** 0.1 · **Date:** 2026-11-13 · **Status:** Proposed MVP, not implemented
**Event:** SLAY HACKS 2026 · **Submission deadline:** 2026-12-07 17:00 EST / 22:00 GMT

## 1. Product summary
**ChoiceMirror — See both sides of the click.** An AI-assisted behavioural UX auditor that compares opposing user journeys under matched conditions. Rather than claiming all differences are manipulative, it collects observed steps, interruptions and evidence, then explains likely asymmetry and uncertainty.

### One-line pitch
An AI agent takes both sides of a choice so people can see whether a digital experience treats those choices fairly.

## 2. Problem
Websites may make a desirable action easy (join, accept, subscribe) while making its opposite difficult (leave, reject, unsubscribe). Conventional visual scans often miss multi-step friction such as confusing routing, buried exits and repeated prompts. Humans need an accessible, repeatable way to compare both journeys with evidence.

## 3. Target users
- **Primary:** UX researchers, consumer-rights advocates and accessibility reviewers seeking reproducible evidence.
- **Secondary:** designers/product teams evaluating whether their interfaces preserve genuine user choice.
- **Hackathon judges:** nontechnical viewers who should understand the result within 30 seconds.

## 4. Jobs to be done
- When auditing a flow, run both choices from an equivalent starting state.
- See which path completed and what was required.
- Inspect screenshots, click traces and interruptions rather than trusting an ungrounded AI verdict.
- Export/share a concise, clearly labelled report.

## 5. MVP scope (must have)
1. **Controlled local benchmark:** original test pages with *balanced* and *asymmetric* paired choice flows, plus documented expected properties and resettable starting states.
2. **Paired scenario selector:** choose benchmark and opposing goals (initially `join vs leave` and `accept vs reject`), with fixed session configuration.
3. **AI-assisted browser agent:** use page accessibility/DOM observations to select next safe action; output structured rationale; fall back to deterministic navigation if model unavailable, clearly labelled as fallback.
4. **Independent journey execution:** reset browser context/state between goals; use identical viewport, account/session fixture, action and time budgets.
5. **Evidence capture:** ordered action log, navigational state, screenshots at key checkpoints, outcome status, step count, elapsed time, dead ends, misleading prompts/interruptions (with reviewable evidence).
6. **Comparison screen:** side-by-side timeline; outcome table; normalized friction indicators; confidence/limitations; source-linked observations.
7. **Responsible AI:** bound model actions to a sandbox, allowlisted origins, explicit stop conditions, avoid personal information, and do not make legal conclusions.
8. **Demo-ready:** deployable public UI or recorded fully working demo, documented repo and 2–4 minute walkthrough.

## 6. Stretch goals (only after MVP)
- Public website **read-only** inspection subject to authorization and domain restrictions; no consequential submissions.
- Additional choices: enable/disable notifications or retain/delete test account.
- Replay animations, PDF/JSON export, baseline comparisons between design revisions.
- Multiple independent runs and confidence intervals.

## 7. Non-goals
- General autonomous web-browsing agent.
- Detecting every dark pattern, legal compliance certification or regulatory advice.
- Logging into third-party services, purchasing, subscribing, deleting real accounts or changing consent on real websites.
- Scraping websites at scale or bypassing anti-bot defenses.
- Real users' personal browsing sessions and production telemetry.

## 8. Functional requirements / acceptance criteria
| ID | Requirement | Definition of done |
|---|---|---|
| FR-01 | Choose scenario | At least two contrasting controlled fixtures selectable in UI |
| FR-02 | Run both paths | Fresh context, same configuration, per-goal independent trace |
| FR-03 | Meaningful AI | A model observes page state and proposes at least some navigation actions in an actual demo |
| FR-04 | Evidence | Actions, outcomes and checkpoint screenshots saved with run IDs |
| FR-05 | Comparison | Render both paths and explain each reported difference with cited trace events |
| FR-06 | Honest scoring | Display raw metrics; score derived from documented formula; missing data shown as unknown |
| FR-07 | Reliability | At least 3 repeat runs per fixture; note variance; no fabricated benchmark output |
| FR-08 | Accessibility | Keyboard navigation, labels, contrast and reduced motion support |
| FR-09 | Safety | Block external domains and consequential actions automatically |
| FR-10 | Submission | Source, setup docs, screenshots and video ready by Dec 7 |

## 9. Friction and scoring
Track **completion** (success/failure/unknown), action count, navigations, elapsed time, backtracking, interruptions and human takeover. Present metrics separately before an optional **asymmetry indicator**. Proposed initial descriptive formula:
`difference = metric(harder journey) - metric(easier journey)`.
For normalized action burden when both succeed:
`action_ratio = (max(actionsA, actionsB) + 1) / (min(actionsA, actionsB) + 1)`.
No invented ground-truth manipulation score; do not conflate elapsed model latency with true UX burden. Clearly label which metric includes agent hesitation and which reflects interface mechanics. Review reports against fixture expectations and human annotations.

## 10. AI rationale and responsible use
AI adds state-dependent navigation, semantic interpretation of button purposes and grounded explanation. It **does not** supply undisputed ground truth. Log model/provider/version, task prompt hash and action selection, redact sensitive strings, and never allow the model to execute arbitrary shell commands or navigate off an allowlist. Deterministic evaluation calculates metrics from logs.

## 11. UX success criteria
- A judge can launch a comparison in ≤3 interactions.
- Main dashboard shows two paths and a supported key finding above the fold.
- Every claim about friction can be opened to supporting trace/screenshot.
- Disabled/incomplete demos say so instead of simulating success.

## 12. Submission evidence
- Public repository and setup instructions; deployed link or accessible demo alternative.
- Captured images illustrating successful paired comparison.
- 2–4-minute video: problem → paired run → evidence → responsible limitations.
- Explicit declaration of APIs, frameworks, open-source dependencies and original contribution.

## 13. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Browser agent nondeterminism | Fixed fixture seeds, explicit budgets, retries, replayable traces |
| Unequal start states | Reset storage, cookie/session fixture and viewport |
| Overconfident classifications | Raw measurements, qualified language, human review |
| API costs/rate limits | Small bounded runs; optional deterministic fallback |
| Deadline pressure | Controlled benchmark first; no unsupported live-web promises |
| Misstated eligibility/rubric | Confirm on official Devpost page; keep verification open |

## 14. Open decisions
- Model provider and allowed budget.
- Hosting and worker deployment limits.
- Whether first demo uses an in-process benchmark or separate local test origin.
- Team size, named owners and submission eligibility.

**Change control:** any material scope change must update `Phases.md` and `Memory.md`.
