# OrbitPass — realistic cancellation-pattern case study

**Status:** Fictional, source-informed benchmark and a test protocol. Historical FTC material is real; OrbitPass and its buttons are invented.

## Source and limits

The [Federal Trade Commission's June 2023 press release](https://www.ftc.gov/news-events/news/press-releases/2023/06/ftc-takes-action-against-amazon-enrolling-consumers-amazon-prime-without-consent-sabotaging-their) described allegations concerning an older Prime cancellation process involving extra pages and retention offers. The [public redacted complaint](https://www.ftc.gov/system/files/ftc_gov/pdf/amazon-rosca-public-redacted-complaint-to_be_filed.pdf) documents the historical allegations and contrasts enrolment versus cancellation effort.

OrbitPass is a **fictional streaming service**, not a copy of Amazon's interface or an evaluation of a real current product. Its one-click Join and five-click Cancel paths are deliberately designed illustrations, **not numbers measured on Amazon**.

## Experiment A — paired browser evidence

The browser starts both goals from the same reset state and records actual successful clicks, ordered events and PNG screenshots:

| Goal | Fictional journey | Intended count |
| --- | --- | ---: |
| Join | Activate the sample membership | 1 |
| Cancel | Account options → cancellation review → decline retention offer → bypass feedback → final confirmation | 5 |

The application calculates the difference from real recorded events, not from these intended counts. Failed or missing evidence is inconclusive. **This is not a claim of newly discovering a hidden issue**; the asymmetry was intentionally constructed to demonstrate the measurement.

## Experiment B — copy variation and AI necessity

Two catalogued scenarios share the same goals, step count and fictional account:

- `membership-case-study` — reference button wording.
- `membership-copy-variant` — alternative wording for every action, with the same intended result.

An unchanged, exact-label Playwright script aimed at the reference page fails on the reworded page. A maintained deterministic plan succeeds: we do **not** claim that all scripted automation fails. The test isolates the fragility of **unmaintained fixed selectors**.

A credential-free E2E test uses a **mocked Nebius-compatible adapter** to prove the observation/policy/browser loop can navigate the changed copy. Mock calls must never be described as real Nebius inference.

For real model evidence, use the opt-in `tests/live/case-study.spec.ts` test. It requires `NEBIUS_LIVE=1`, `NEBIUS_CASE_STUDY=1` and a private `NEBIUS_API_KEY` and tests two goals on each interface, recording actual status, count, inference calls and errors. The [manual protected workflow](../../.github/workflows/case-study-live.yml) executes only on trusted main and never on pull requests.

### Genuine model result — verified 20 November 2026

The protected [GitHub Actions run #44837025110](https://github.com/1tsDaksh/choiceMirror/actions/runs/44837025110) **passed** using real Nebius Token Factory `zai-org/GLM-5.3-Flash`, with no mock endpoint. The recorded outcomes were **4/4 completed**, with **17 inference calls**, **24 stored PNG screenshots**, **10,958 input tokens** and **1,880 output tokens**. Every journey had **zero rejected proposals and zero model errors**. All 24 PNG payloads matched their saved SHA-256 hashes.

| Synthetic fixture | Goal | Actual actions | Calls | PNGs | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Reference | Join | 1 | 2 | 4 | Completed |
| Reference | Cancel | 5 | 7 | 8 | Completed |
| Reworded/rearranged | Join | 1 | 2 | 4 | Completed |
| Reworded/rearranged | Cancel | 5 | 6 | 8 | Completed |

The [full evidence manifest](CASE_STUDY_LIVE_RESULTS.md) includes run and artifact IDs, model provenance, token usage and archive checksum; the [GitHub Actions artifact](https://github.com/1tsDaksh/choiceMirror/actions/runs/44837025110/artifacts/14678592656) has the genuine screenshot checkpoints and redacted results JSON, retained until **20 December 2026**.

**Interpretation:** For this particular fictional pair and rewording/layout variation, the genuine model completed both routes without updating a fixed action plan. A maintained Playwright script also succeeds. A single successful run of each path does **not** establish statistically reliable superiority, generalisation to arbitrary external sites or evidence of a current real-world legal violation.

## How to reproduce

1. Run `pnpm test:e2e` (mocked model; no paid calls). The case study's browser tests check counts, real screenshots, fixed-selector failure and maintained-script success.
2. For real Nebius, privately configure the key and flags, then run:
   `pnpm exec playwright test --config playwright.live.config.ts tests/live/case-study.spec.ts`.
3. Preserve the unedited run logs and screenshots. Verify positive inference calls and completed journeys before claiming genuine generalisation.
4. Describe this as **controlled synthetic testing**, not a live commercial website audit, legal judgment or human usability study.

## Additional caveats

- The five cancellation steps are intentionally planted, not independently discovered.
- Prompt/model explanations are not verified descriptions of user intent.
- No real accounts, payments, third-party sites or personal data are involved.
- Human effort and legal compliance cannot be inferred from one pair of action counts.
