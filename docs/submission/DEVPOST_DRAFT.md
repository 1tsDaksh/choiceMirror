# ChoiceMirror — Devpost project description

**Project:** ChoiceMirror  
**Tagline:** See both sides of the click.  
**Live demo:** https://choicemirror-production.up.railway.app  
**Source:** https://github.com/1tsDaksh/choiceMirror  
**Video:** Add the published final-video link here after editing and upload.

## Inspiration

When a website offers two opposite choices, it isn't always equally easy to take either path. Joining can take one click while leaving requires repeated confirmations. Accepting may be immediate while rejecting means navigating extra screens.

I wanted a way to compare the two journeys **using evidence rather than opinions**. A screenshot of a difficult button tells only part of the story. A useful measurement has to attempt both goals from comparable starting conditions and retain what actually happened.

## What it does

ChoiceMirror runs the two sides of a choice in controlled browser sessions and measures the recorded action burden.

I created four original synthetic scenarios: **membership** (join / leave) and **consent** (accept / reject), each with **balanced** and **asymmetric** versions. They give the tool a meaningful positive control: it should report equality when the paths are equal, rather than always manufacturing a finding.

The fictional OrbitPass case study adds a realistic subscription journey informed by the FTC's historical description of multi-page cancellation, with a semantically equivalent reworded variant. The pages are original synthetic examples, not a reproduction of any real company's current service. The reworded variant distinguishes a brittle fixed-selector baseline from observation-driven navigation: the unchanged reference script fails on the changed wording, while an updated deterministic script succeeds. In a separately protected **genuine Nebius** test on 20 November 2026, **all four synthetic Join/Cancel journeys completed** on the reference and reworded/rearranged layouts, with **17 real model calls and 24 PNG checkpoints**. This demonstrates one successful controlled trial per path, not superiority to maintained scripts or general-purpose website auditing. [Actual inference evidence](CASE_STUDY_LIVE_RESULTS.md).

After both journeys finish, the comparison dashboard displays their action counts, difference, ratio, mirrored timelines and original screenshots. Every finding links back to the evidence used to calculate it. If a run is incomplete or corrupt, the system reports insufficient evidence rather than pretending the two sides were equally easy.

**Try it:** https://choicemirror-production.up.railway.app. Select a scenario, choose **AI (Nebius)** and run the comparison. The public service includes daily usage limits to protect the model budget.

## How I built it

I structured ChoiceMirror as a TypeScript monorepo with Next.js and React for the interface, Playwright for browser execution, Zod for typed validation, and a separate pure metrics package.

The navigation model is **Nebius Token Factory's `zai-org/GLM-5.3-Flash`**. For each goal, it receives an observation of the current benchmark page and proposes a structured action. It **cannot directly control the browser**. Before execution, a fixed schema and policy gate verify that the proposed element exists, is allowed and belongs to the selected journey. Playwright then executes the validated click inside an isolated browser context.

I deliberately separate three things:

1. **Observed evidence:** successful browser actions, trace events and PNG screenshots.
2. **Calculated metrics:** step counts, differences and the action-burden ratio derived from the stored traces.
3. **Model-reported output:** the AI's action proposal and brief justification, displayed as model-reported rather than verified fact.

The live demo runs in a Docker-based Railway deployment. The public Next.js app connects to an internal benchmark bound to loopback; only the web app is exposed. The Nebius key remains a **private server-side variable**. A persistent volume stores records and screenshots, with a single-flight controller and daily usage quotas.

**Technology:** TypeScript, Next.js, React, Tailwind CSS, Playwright Chromium, Zod, Vitest, Docker, Railway and Nebius Token Factory. Open-source dependencies and the external model are clearly identified in the repository.

## Challenges

**Reliable model navigation.** The reasoning model could consume its response budget before producing a valid structured action. I investigated this in real inference runs, increased the response-token allowance and added tests to prevent silent truncation.

**Safe browser execution.** The model must not turn a benchmark test into arbitrary web navigation. I constrained its actions to observed controls, pinned the browser to the internal benchmark origin, blocked service workers, validated redirect chains and tested prompt-injection and off-origin request cases.

**Trustworthy measurements.** Selecting a goal is not the same as taking an action toward it. I kept action counting deterministic, linked metrics to stored event and screenshot IDs, and made incomplete or inconsistent evidence produce an inconclusive result.

**Hosting a real browser.** The public app needs a long-running Node.js process and persistent files; it is not a static showcase. I deployed the web app, benchmark and Playwright runtime in one Railway service, with a private benchmark and limits that protect live inference credits.

## Accomplishments

- **Real model-driven browser journeys.** The recorded Nebius walkthrough completed both sides of an asymmetric membership comparison in **1 versus 3 actions**, with **2 versus 4 inference calls**. The balanced control completed in **1 versus 1 action**, with **2 calls per journey**. These are genuine recorded runs, not a deterministic script presented as AI.
- **Reproducible controlled evaluation.** In the documented real-model evaluation, **8/8 journeys** completed, and a separate repeatability sweep completed **12/12 paired comparisons** across three rounds per scenario. These results apply to our controlled fixtures, not all websites.
- **Inspectable provenance.** Each completed comparison stores trace events and actual PNG screenshots, and the UI links the reported difference to the contributing steps.
- **Public deployment.** ChoiceMirror is accessible at https://choicemirror-production.up.railway.app, with server-side credentials, a protected action surface and per-day request limits.
- **Automated verification.** The project includes unit tests, Playwright end-to-end tests, CI builds and an actual Docker smoke test covering the deployed browser runtime and public-demo protections.

## What I learned

An AI model can be useful as a navigation component without being trusted to make the final judgment. The hardest part was not generating commentary about a page; it was making the result **reproducible, independently measurable and inspectable**.

I also learned that a balanced result matters. A system that only reports problems isn't an audit tool. ChoiceMirror needs to say “the recorded action burden was equal” when that is what actually happened.

## What's next

I would extend the controlled benchmark library, evaluate repeated runs with more robust uncertainty estimates, and explore permissioned use on staging websites. Future work could add more cancellation and preference-management patterns, along with evidence exports for UX research.

## Responsible AI and limitations

ChoiceMirror currently works on **six controlled synthetic scenarios**: four original benchmark interfaces and two OrbitPass variations. It does not audit external websites, take actions on real accounts, or determine whether a business is breaking any law. A single action-count difference is descriptive, **not proof of dark-pattern intent**. Model explanations are labelled as unverified, and latency is not confused with human UX burden. The published demo is intentionally bounded so external visitors cannot spend unlimited Nebius credits or submit arbitrary URLs.

**Repository and verification:** [Source](https://github.com/1tsDaksh/choiceMirror) · [Real-model evaluation](LIVE_TEST_RESULTS.md) · [Security review](SECURITY_REVIEW.md) · [Screenshot provenance](assets/PROVENANCE.md).
