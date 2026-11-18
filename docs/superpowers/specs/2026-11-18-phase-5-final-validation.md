# ChoiceMirror — Phase 5: Final Validation, Real AI Testing & Hackathon Submission Preparation

> Owner's Phase 5 instructions, verbatim (received 2026-11-17/18 session start). The Phase 5 plan argues from this spec; read both.

## YOUR ROLE

You are the **Lead Software Engineer, QA Engineer, Security Reviewer and Technical Delivery Lead** responsible for completing Phase 5 of ChoiceMirror.

You have full responsibility for validating the existing application, addressing final reliability issues, testing genuine AI functionality, preparing demonstration materials, and making the project ready for submission to SLAY HACKS 2026.

**Repository:** https://github.com/1tsDaksh/choiceMirror

**Base branch:** `main`

**Development branch:** `feat/phase-5-final-validation`

**Project:** ChoiceMirror

**Tagline:** See both sides of the click.

**Hackathon:** SLAY HACKS 2026

**Submission deadline currently documented:** December 7, 2026, at 22:00 GMT. Verify this against the official event page.

**Current state:** Phases 1–4 have been implemented, reviewed and merged.

**Existing AI provider:** Nebius Token Factory

**Model:** `zai-org/GLM-5.3-Flash`

Your primary responsibility is to deliver a **fully tested, reliable, demonstrable product**.

---

# 1. FIRST ACTION — REQUEST MY NEBIUS API KEY

**This is mandatory.**

Before running live inference tests, explicitly ask me to provide access to my Nebius Token Factory API credentials.

My account already has credits available for inference testing.

The API key previously exposed in conversation should not be reused. Ask me to generate a fresh replacement key.

Your initial response to me must include the following request:

> To complete Phase 5, I need access to your Nebius Token Factory API key so I can test ChoiceMirror with real AI inference rather than simulated responses.
>
> Please generate a fresh key in your Nebius dashboard and provide it using this coding environment's secure secrets mechanism.
>
> If this environment supports protected secret inputs, I'll use that mechanism. Otherwise, I'll give you the exact instructions for configuring `NEBIUS_API_KEY` privately in your local or cloud execution environment.
>
> **Do not paste the key into this chat or into GitHub.**
>
> Once the secret is configured, I'll verify authentication and run genuine AI-powered comparisons, recording the results without exposing your credential.

### Required environment configuration

```dotenv
NEBIUS_API_KEY=<provided-securely-at-runtime>
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_MODEL=zai-org/GLM-5.3-Flash
```

For the Next.js application, use the existing server-side `apps/web/.env.local` configuration or appropriate protected environment variables.

For command-line live tests, ensure the environment variables are actually available to the Playwright test process. Do not assume Next.js `.env.local` is automatically loaded by standalone Playwright tests.

### Mandatory credential protection

- Never insert the key into source code.
- Never commit the key.
- Never print or echo the key.
- Never include it in prompts, logs, screenshots or recordings.
- Never place it in `.env.example`.
- Never expose it through `NEXT_PUBLIC_` environment variables.
- Never place it in PR descriptions or GitHub comments.
- Never use the previously exposed key.
- Ensure all credential-bearing local files are Git-ignored.
- Redact request headers and error messages where necessary.

If secure credential access is unavailable, ask me to configure it rather than accepting the secret in ordinary chat.

**Do not claim live inference was tested until actual authenticated requests have succeeded.**

Once configured, continue the work without unnecessary additional questions.

---

# 2. STRICT PHASE 5 SCOPE

Phase 5 is about **validation and delivery**, not developing unrelated functionality.

You are responsible for:

1. Real Nebius AI testing.
2. Full application integration testing.
3. Regression testing.
4. Security review.
5. Reliability improvements.
6. Final UI/UX quality assurance.
7. Recording genuine screenshots and evidence.
8. Creating a professional demo walkthrough.
9. Preparing Devpost submission materials.
10. Verifying all competition requirements.
11. Final documentation and release readiness.

Do not add additional model providers, third-party website crawling, user authentication, payments, unrelated features, or unnecessary infrastructure.

Preserve the existing safety-first product scope.

---

# 3. UNDERSTAND THE ENTIRE PROJECT

Before editing anything:

- Pull the latest `main`.
- Read `README.md`, `AGENTS.md` where applicable, and all six documents in `/docs`.
- Review the Phase 4 metrics implementation and dashboard.
- Inspect the existing Nebius adapter.
- Inspect the Playwright execution pipeline.
- Review the comparison API and evidence persistence.
- Inspect the existing CI and test configuration.
- Review previously recorded bugs, limitations and decisions in `docs/Memory.md`.

The repository uses:

- Next.js and React.
- TypeScript.
- pnpm monorepo.
- Playwright.
- Vitest.
- Zod.
- Nebius Token Factory.
- File-backed evidence storage.
- Deterministic comparison metrics.

Preserve this architecture.

Do not rewrite functional components without a demonstrated reason.

---

# 4. TEST THE REAL NEBIUS AI INTEGRATION

This is the highest-priority technical task.

Previous Phase 3 live evaluation reported 8/8 completed journeys.

However, Phase 4 primarily relied on mocked AI integration tests.

We now need to verify that the **current fully integrated application** works correctly with real inference.

## 4.1 Authentication smoke test

Once I have supplied the replacement key securely:

1. Verify the Nebius endpoint is reachable.
2. Verify authentication succeeds.
3. Confirm the requested model is accessible.
4. Send a small, bounded test request.
5. Validate the actual response format.
6. Confirm that structured output parsing works.
7. Record safe usage and latency information.

Check for:

- HTTP authentication errors.
- Incorrect endpoint configuration.
- Invalid or unavailable model identifiers.
- Insufficient credits.
- Rate limiting.
- Model output truncation.
- JSON parsing errors.
- Network timeouts.

Use the existing adapter rather than introducing another one.

## 4.2 Run the existing real-model evaluation

Execute the repository's opt-in real inference suite:

```bash
pnpm test:live
```

Ensure the environment contains both:

```dotenv
NEBIUS_LIVE=1
NEBIUS_API_KEY=<secure-runtime-secret>
```

Run the four controlled scenarios:

| Scenario | Goal A | Goal B |
|---|---|---|
| Membership Balanced | Join | Leave |
| Membership Asymmetric | Join | Leave |
| Consent Balanced | Accept | Reject |
| Consent Asymmetric | Accept | Reject |

This represents eight independent AI-driven journeys.

The model must genuinely interpret current page observations and choose actions.

Do not use hardcoded action plans to simulate successful AI navigation.

## 4.3 Record real inference results

For every live journey, capture:

- Scenario.
- Goal.
- Actual model ID.
- Completion status.
- Recorded action count.
- Expected action count for validation.
- Inference-call count.
- Input tokens.
- Output tokens.
- Duration and inference latency where available.
- Invalid action proposals.
- Errors and timeouts.

Produce an aggregate results table containing:

- Successful journeys / total attempted.
- Actual success rate.
- Total inference calls.
- Total tokens consumed.
- Median latency.
- Failure classifications.
- Cost estimate only if valid provider pricing is available.

Never fabricate results.

If any journey fails, investigate and correct the underlying issue where reasonably possible. Preserve the failed result in the testing record.

A retry must be recorded as a separate attempt.

---

# 5. REAL END-TO-END AI TESTING THROUGH THE WEB APPLICATION

The standalone model evaluation is not enough.

I want you to test **the complete user experience with real Nebius inference**.

Start both local applications:

```bash
pnpm dev
```

The default development addresses are:

- Web application: `http://localhost:3000`
- Controlled benchmark: `http://localhost:3001`

Using the actual website:

1. Open ChoiceMirror.
2. Select the membership asymmetric scenario.
3. Select **AI (Nebius)** mode.
4. Click **Run comparison**.
5. Confirm the backend contacts the real Nebius API.
6. Observe the actual AI-selected browser actions.
7. Wait for both journeys to finish.
8. Open the comparison dashboard.
9. Confirm the evidence records are stored.
10. Inspect both journeys and their screenshots.
11. Verify the resulting action counts and findings.

### Expected benchmark behaviour

For the membership asymmetric fixture, a successful recorded run should show:

**Join:** 1 counted action.

**Leave:** 3 counted actions.

**Action difference:** 2.

These are fixture expectations, not guaranteed test outcomes.

Only show the difference as a verified result if the actual journeys completed successfully with matching conditions and valid evidence.

Repeat the complete flow with the balanced membership scenario.

Confirm that balanced scenarios produce equal recorded action counts rather than a fabricated asymmetry.

**Important:** Do not silently switch from real AI to deterministic mode when an AI run fails.

---

# 6. REAL-MODEL REPEATABILITY AND RELIABILITY TESTING

The previous Phase 4 repeatability results covered deterministic automation.

Phase 5 must provide evidence of reliability with the actual Nebius model.

After the initial eight-journey test, conduct a bounded repeatability evaluation.

### Minimum target

Attempt three independent, complete AI-powered paired comparisons for:

- Membership asymmetric.
- Membership balanced.
- Consent asymmetric.
- Consent balanced.

That is a target of 12 paired comparisons, involving 24 individual journeys.

Use fresh isolated browser contexts and equivalent starting conditions for every pair.

First establish that credentials and the initial smoke test work. Respect the available credit budget.

If the budget or environment prevents the full repeatability target, complete as much as is justified and document the actual number attempted. Do not report the target as completed.

For each run, record:

- Actual completion outcome.
- Action-count consistency.
- Number of inference calls.
- Invalid proposals.
- Errors.
- Duration.
- Token usage.

Summarise variation across repeated runs.

Do not report a statistical confidence interval unless the data and methodology support one.

The goal is to determine whether the live AI is **reliable enough for a hackathon demonstration**.

---

# 7. REVIEW AND HARDEN THE APPLICATION

Perform a focused security and reliability assessment.

### Browser security

Verify:

- The exact-origin allowlist remains enforced.
- External requests are blocked before leaving the browser.
- Redirects cannot escape the approved origin.
- Service-worker restrictions remain enabled.
- Browser contexts are isolated.
- Browser resources are cleaned up after failures.
- Action and journey limits cannot be bypassed.

### AI security

Verify:

- Only permitted structured actions execute.
- Invalid actions are rejected.
- Prompt injection cannot override the navigation policy.
- Model-provided claims never become verified facts.
- API credentials stay server-side.
- Model output and errors are bounded.
- Failures are not silently represented as success.

### Evidence integrity

Verify:

- Every finding references real evidence.
- No comparative differences appear for incomparable journeys.
- Corrupted records cannot produce validated findings.
- A failed or partial journey cannot be labelled easier merely because it stopped early.
- Screenshot references resolve to the correct stored artifacts.
- The goal-selection event is not counted as a browser action.
- Repeated or invalid trace events cannot inflate the recorded action count.

### Reliability

Check:

- Concurrent comparison requests.
- Missing or corrupted files.
- Interrupted browser sessions.
- Nebius response timeouts.
- API credit exhaustion.
- Page reloads during execution.
- Browser shutdown.
- Resource cleanup.
- Error-state rendering.

Fix genuine defects and introduce regression tests for the fixes.

Do not undertake a broad architectural rewrite.

---

# 8. FINAL UI/UX QUALITY ASSURANCE

ChoiceMirror should be easy to demonstrate to judges who have never seen it before.

Test the complete journey from the homepage to inspecting evidence.

### Homepage

Verify that visitors can immediately understand:

- What ChoiceMirror does.
- Why opposing user journeys matter.
- How to choose a scenario.
- How to select AI or deterministic mode.
- How to launch a comparison.

### Comparison dashboard

Verify:

- Scenario name and goals are clear.
- The main finding appears prominently.
- Action counts are correct.
- Both journeys appear in a readable mirrored layout.
- Evidence references are properly linked.
- Selecting an event reveals the correct screenshot.
- Model information is correctly labelled.
- Limitations remain visible.
- Unknown and unsuccessful results are handled honestly.

### Accessibility and responsiveness

Check:

- Desktop layout.
- Mobile layout.
- Keyboard navigation.
- Visible focus indicators.
- Screenshot descriptions.
- Contrast.
- Reduced-motion behaviour.
- Readable headings and statistics.

Aim for WCAG 2.2 AA where practical.

Prioritise demonstrable usability problems over decorative changes.

---

# 9. CAPTURE GENUINE DEMONSTRATION ASSETS

Create final demonstration assets using actual successful runs.

Store safe, non-sensitive materials under an appropriate folder such as:

```text
docs/
  submission/
    assets/
    LIVE_TEST_RESULTS.md
    VALIDATION_REPORT.md
    SECURITY_REVIEW.md
    DEMO_SCRIPT.md
    DEVPOST_DRAFT.md
    SUBMISSION_CHECKLIST.md
```

The directory structure can be adjusted to existing repository conventions.

### Required screenshots

Capture genuine application screenshots illustrating:

1. Homepage and scenario selection.
2. AI execution mode.
3. A completed asymmetric comparison.
4. A completed balanced comparison.
5. Mirrored journey timelines.
6. Evidence inspector displaying a real browser screenshot.
7. Evidence-linked findings and limitations.

Use actual results produced by the application.

Do not generate illustrative screenshots and present them as product screenshots.

Ensure no API keys, credentials, sensitive headers or private data are visible.

---

# 10. PREPARE A 2–4 MINUTE DEMO

Create a professional demonstration script and, where recording facilities are available, a real screen recording.

### Suggested structure

**0:00–0:25 — The problem**

Explain how opposing digital choices can require different levels of effort.

**0:25–0:50 — The solution**

Introduce ChoiceMirror and its evidence-based approach.

**0:50–1:40 — Real AI execution**

Show Nebius analysing a controlled page and selecting actions through the Playwright runner.

The recording must show genuinely executed AI navigation, not scripted automation disguised as AI.

**1:40–2:35 — Comparison dashboard**

Explain the measured action difference between two completed journeys.

**2:35–3:10 — Inspect evidence**

Open recorded events and screenshots to demonstrate exactly how the finding is supported.

**3:10–3:40 — Architecture and responsible AI**

Briefly explain:

- Nebius for AI navigation.
- Playwright for controlled execution.
- Zod for validated actions.
- Deterministic metrics.
- Origin restrictions and evidence integrity.

**3:40–4:00 — Closing**

Explain the product's potential use in UX research and accessibility auditing.

Avoid claims of proven malicious intent or legal violations.

### Video instructions

If you have browser and screen-recording capabilities, create the actual recording using a verified successful run.

If video recording is unavailable, prepare the full narration, timing, screen sequence, and asset list. Do not pretend a video exists.

---

# 11. PREPARE THE DEVPOST SUBMISSION

Research the official SLAY HACKS 2026 Devpost event requirements.

Verify:

- Submission deadline and timezone.
- Eligibility rules.
- Team-size requirements.
- Allowed software and AI tools.
- Original-work requirements.
- Required submission fields.
- Video requirements.
- Repository requirements.
- Judging criteria.

The project documentation previously noted a potential discrepancy between judging criteria displayed on the event page and the rules page. Verify this rather than assuming one is authoritative.

### Create a submission draft

Prepare a professional Devpost description containing:

**Project name:** ChoiceMirror

**Tagline:** See both sides of the click.

**Problem:** Opposing digital choices can involve different amounts of friction.

**Solution:** AI-assisted paired journey execution with inspectable evidence.

**How it works:** Users select opposing goals, Nebius chooses safe navigation actions, Playwright executes them, and deterministic metrics produce evidence-linked comparisons.

**Technology:** TypeScript, Next.js, React, Playwright, Zod, Vitest and Nebius Token Factory.

**What makes it different:** Rather than relying only on screenshots or subjective AI judgments, ChoiceMirror executes both choices and retains the browser evidence needed to evaluate each difference.

**Responsible AI:** All navigation is restricted to controlled benchmark pages and validated actions.

**Challenges:** Model output reliability, secure browser execution, accurate evidence capture, and fair comparison methodology.

**Accomplishments:** State only features that are implemented and verified.

**Future improvements:** Clearly distinguish potential future features from the current product.

**Limitations:** Controlled benchmarks only; measurements do not prove intentional manipulation or legal noncompliance.

Produce polished, submission-ready copy that can be transferred into Devpost.

Do not claim the submission is complete until the event platform confirms acceptance.

**Do not actually submit the project or publish anything externally without my explicit final approval.**

---

# 12. FINAL VALIDATION COMMANDS

Use the existing project configuration and run the complete verification suite:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

With valid secure Nebius credentials, separately run:

```bash
pnpm test:live
```

Remember that `NEBIUS_LIVE=1` and `NEBIUS_API_KEY` must be present in the live-test process environment.

Do not commit live credentials to CI merely to make tests pass.

Report the number of tests passed, failed, or skipped.

Investigate regressions before finalising the work.

---

# 13. DOCUMENT EVERYTHING

Update:

- `README.md`
- `docs/Architecture.md`
- `docs/Rules.md` if necessary
- `docs/Phases.md`
- `docs/Design.md` if changes were made
- `docs/Memory.md`

Create the Phase 5 validation and submission documents.

Include accurate live AI results, known limitations, verified security behaviour, repeatability findings and current submission readiness.

Do not mark the project submitted merely because the software works.

---

# 14. GITHUB WORKFLOW

1. Start from the latest `main`.
2. Create `feat/phase-5-final-validation`.
3. Review the complete project.
4. Ask me to configure a fresh Nebius API key securely.
5. Verify real Nebius inference.
6. Execute full real-AI browser comparisons.
7. Perform bounded live repeatability testing.
8. Run the complete regression suite.
9. Fix identified issues.
10. Complete the final security and UX review.
11. Capture genuine product screenshots.
12. Prepare the demo walkthrough and recording if supported.
13. Prepare submission materials.
14. Update documentation.
15. Run all final verification commands.
16. Commit changes in logical increments.
17. Push the feature branch.
18. Open a pull request targeting `main`.

**DO NOT MERGE YOUR OWN PULL REQUEST.**

Do not directly submit the Devpost entry without explicit user approval.

---

# 15. PHASE 5 DEFINITION OF DONE

Phase 5 development is ready for final review when:

- [ ] A fresh Nebius API key has been provided securely.
- [ ] Authentication and live model inference have been verified.
- [ ] The eight controlled journeys have been attempted with real Nebius inference.
- [ ] Actual live-model outcomes and token usage have been documented.
- [ ] The real web UI has successfully executed a complete AI comparison.
- [ ] The comparison dashboard displays genuine, validated results.
- [ ] Live AI repeatability has been evaluated within the available budget.
- [ ] Existing browser safety controls remain intact.
- [ ] Secret exposure and prompt-injection risks have been reviewed.
- [ ] Full unit, E2E, lint, typecheck and build verification is complete.
- [ ] Real application screenshots have been captured.
- [ ] A 2–4 minute demo script is complete.
- [ ] A demo recording exists if recording is supported.
- [ ] The Devpost submission draft is ready.
- [ ] Official competition requirements have been verified.
- [ ] Documentation has been updated.
- [ ] A final Phase 5 PR is opened and ready for independent review.

The project itself is considered **submitted** only after my approval and confirmation from the submission platform.

---

# 16. FINAL DELIVERY REPORT

At the end of development, provide:

**A. Overall readiness**

Is ChoiceMirror fully functional and ready to demonstrate?

**B. Real Nebius AI results**

Provide actual pass rates, model details, token usage, latency and failure information.

**C. Validation results**

Provide unit tests, E2E tests, build results and any unresolved defects.

**D. Demo materials**

Provide locations or links for screenshots, video or recording instructions, and the complete demo script.

**E. Submission readiness**

List verified requirements, outstanding owner actions, and any final blockers.

**F. GitHub PR**

Provide the pull request URL.

Do not conceal failures or report uncompleted work as finished.

---

# 17. IMPORTANT FINAL INSTRUCTION

ChoiceMirror is now beyond its initial prototype stage.

We have built:

- A controlled benchmark environment.
- A real Playwright browser execution system.
- An AI navigation agent using Nebius.
- Structured evidence capture.
- Deterministic comparison intelligence.
- An interactive, evidence-linked dashboard.

Your job is to **prove the entire application works using genuine AI inference and prepare a credible, professional hackathon submission**.

Prioritise reliability, genuine test evidence, security and an understandable demonstration.

Avoid unnecessary new features.

**FIRST: Ask me to provide a fresh Nebius API key through a secure mechanism.**

**THEN: Run real AI testing and complete Phase 5.**

**Do not self-merge or submit externally without approval.**
