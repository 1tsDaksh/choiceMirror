# ChoiceMirror — product scope and requirements

**Tagline:** See both sides of the click.  
**Live product:** https://choicemirror-production.up.railway.app  
**Event:** SLAY HACKS 2026  
**Maintainer:** [@1tsDaksh](https://github.com/1tsDaksh)

## Problem

Opposing digital choices do not always require equal effort. A quick visual review often misses multi-step friction: repeated prompts, confirmations and buried exit paths. A useful comparison needs to attempt **both goals** under comparable starting conditions and retain the underlying evidence.

## Product

ChoiceMirror compares opposite journeys on **controlled synthetic interfaces**, measures recorded successful interactions, and displays an evidence-linked finding. It does not assign a legal verdict or prove intent.

### Available scenarios

| Category | Balanced control | Asymmetric case |
| --- | --- | --- |
| Membership | Join 1 / Leave 1 | Join 1 / Leave 3 |
| Consent | Accept 1 / Reject 1 | Accept 1 / Reject 3 |

The benchmark expectations are known; AI-mode counts are recorded independently from browser traces, never taken from those expectations.

## Target use cases

- UX researchers assessing whether competing paths require unequal interaction.
- Product teams creating regression tests for cancellation, preference and consent flows.
- Consumer advocates and accessibility practitioners reviewing measurable choice friction.

These are potential applications. The current release is a **synthetic proof of concept**, not a production third-party audit service.

## Implemented requirements

- Scenario launcher with four fixtures, clear opposing goals and deterministic or Nebius AI execution.
- Two isolated Playwright journeys per comparison, fixed starting state, origin-restricted navigation and bounded actions.
- Real AI proposals validated with Zod and an independent action policy before execution.
- Ordered trace events, per-step screenshots and model/inference metadata saved for each journey.
- Deterministic paired metrics: actual successful action counts, difference, action-burden ratio and evidence-backed finding.
- Honesty for missing or invalid data: running/partial/failed/inconclusive states never produce invented comparisons.
- Responsive mirrored dashboard, keyboard navigation, accessible labels and separate model-reported content.
- Public Railway demo with a private backend key, one running comparison at a time, persisted daily quotas and a persistent screenshot store.
- Credential-free CI plus opt-in real-model evaluation.

## Measurement contract

The count is **recorded successful browser actions**; choosing the goal, navigation and unsupported trace categories are not added. Comparative metrics require matching origin, seed, mode and two completed goals.

The ratio is `(max(actionsA, actionsB)+1) / (min(actionsA, actionsB)+1)`. It measures relative action burden in the recorded pair, **not** manipulation severity or a statistical confidence interval.

Model inference counts, token usage and latency are shown as execution metadata and are not used as human-friction measures.

## Product boundaries

- No third-party crawling, custom URLs, authentication, real accounts, payments, personal information or actual changes to consent preferences.
- No promise of legal compliance assessment, explanation of intent, or human behaviour inference.
- No arbitrary model tooling or open-ended computer control.
- No expectation that one run supports population-level claims.
- Public execution stays bounded by credits and environment limits; broad-scale auditing requires additional infrastructure and evaluation.

## Engineering and evidence

[Architecture](Architecture.md) · [Design system](Design.md) · [Engineering standards](ENGINEERING.md) · [Real inference evidence](submission/LIVE_TEST_RESULTS.md) · [UI validation](submission/VALIDATION_REPORT.md) · [Security review](submission/SECURITY_REVIEW.md)

## Next directions

Extend benchmark coverage to subscription cancellations, newsletters and notification permissions; collect structured feedback from independent UX testers; measure performance across repeated model runs; and evaluate opt-in staging environments where operators control test permissions and credentials.
