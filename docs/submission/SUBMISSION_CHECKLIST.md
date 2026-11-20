# SLAY HACKS 2026 — submission checklist

**Project:** ChoiceMirror · **Maintained by:** [@1tsDaksh](https://github.com/1tsDaksh)  
**Target deadline:** **7 December 2026, 17:00 EST / 22:00 GMT**  
**Submission platform:** https://slayy-hacks.devpost.com/

This is the repository's concise publishing checklist. Tick items only after completing them in Devpost or verifying the public link. Creating a GitHub PR or a demo URL is **not** the same as submitting to the hackathon.

## Project and demo

- [x] Public working website: https://choicemirror-production.up.railway.app
- [x] Source code and setup: https://github.com/1tsDaksh/choiceMirror
- [x] Real Nebius execution implemented with server-side credentials, approved benchmark-only navigation and usage limits.
- [x] Public service deployed to Railway with one replica, mounted `/data` volume and public HTTPS domain.
- [x] Public journey completion confirmed by a browser test; comparison API and screenshots returned successfully.
- [x] Technical validation, real-model test results and original screenshots recorded in `docs/submission/`.
- [x] Genuine Nebius case-study and copy/layout variation completed **4/4** paths with **17 real model calls** and **24 verified screenshots** ([evidence report](CASE_STUDY_LIVE_RESULTS.md), [successful run](https://github.com/1tsDaksh/choiceMirror/actions/runs/44837025110)).
- [ ] Save the JSON from a public AI comparison confirming `comparison.mode: "ai"`, two `completed` journeys and nonzero per-journey `ai.inferenceCalls` (historical credentialed runs are already documented).
- [ ] Open the demo and example comparison from a fresh, logged-out browser shortly before submission; check screenshots and quota messaging.
- [ ] Confirm Railway and Nebius usage budgets are adequate for judging.

## Presentation and submission

- [x] Submission copy prepared: [Devpost project description](DEVPOST_DRAFT.md).
- [x] Project screenshots available with [capture provenance](assets/PROVENANCE.md).
- [x] Genuine AI screen recording created, validated and retained in the [successful workflow](https://github.com/1tsDaksh/choiceMirror/actions/runs/44538869335); the raw capture is silent.
- [ ] Finish the final narrated/edit version of the video and upload to a **stable public or unlisted link** that judges can open without repository access.
- [ ] Add the final video URL to the Devpost project and README.
- [ ] Confirm the eligibility and student status of each participant, the registered team members, and any required affiliations or disclosures.
- [ ] Recheck the official rules and judging criteria before submitting; the event and rules pages previously displayed **different rubric and prize figures**.
- [ ] Complete Devpost's required project fields: problem, solution, implementation, AI technology, screenshots, GitHub source, public demo and access instructions.
- [ ] Review published claims for accuracy: **synthetic benchmarks only**; no proof of unlawful conduct or intent; clearly identify Nebius and open-source dependencies.
- [ ] Submit on Devpost and verify the **submission confirmation** and project URL.
- [ ] Check the Devpost listing again after submission from a logged-out session.

## Available evidence

| Resource | Purpose |
| --- | --- |
| [Public demo](https://choicemirror-production.up.railway.app) | Hands-on comparison and screenshot inspector |
| [Recorded example](https://choicemirror-production.up.railway.app/comparisons/cmp_b1594335d7a8207b) | A completed example with stored evidence |
| [Real-model results](LIVE_TEST_RESULTS.md) | Eight-journey evaluation and repeatability measurements |
| [UI validation](VALIDATION_REPORT.md) | Interface, accessibility and regression evidence |
| [Security review](SECURITY_REVIEW.md) | Origin guards, policy checks, integrity and reliability |
| [Video recording workflow](VIDEO_RECORDING.md) | Verified capture and artifact generation |
| [Devpost description](DEVPOST_DRAFT.md) | Ready-to-edit project narrative |

### Competition facts previously checked

The project's November 18 review of the [event page](https://slayy-hacks.devpost.com/) and [rules](https://slayy-hacks.devpost.com/rules) recorded: student eligibility above local age of majority, a **7 December** submission deadline, and judging between **8–14 December 2026**. Two different judging breakdowns were displayed:

- Rules page: Innovation **25**, Technical **25**, Impact **20**, Responsible AI **15**, UX / Presentation **15**.
- Event page section: Innovation **30**, Technical **30**, Design / UX **20**, Presentation / Impact **20**.

The prize figures also differed (**$5,000** versus **$4,500**). Confirm the governing figures in Devpost or with the organisers; this checklist does not resolve that discrepancy by guessing.
