# ChoiceMirror — Living Project Memory

**Last updated:** 2026-11-13 · **Version:** 0.1
**Instruction for contributors/AI assistants:** Read this file at the start of each work session. Update it after each completed phase, design/architecture decision, blocker resolution, or notable change. Keep facts, assumptions and planned work clearly distinct; never rewrite history silently.

## 1. Canonical identity
- **Name:** ChoiceMirror
- **Tagline:** See both sides of the click.
- **Repository:** https://github.com/1tsDaksh/choiceMirror
- **Event:** SLAY HACKS 2026
- **Deadline (Devpost displayed):** 2026-12-07 17:00 EST / 22:00 GMT
- **Current status:** GitHub project initialized; documentation in preparation; application functionality not yet built.
- **Tracking:** https://github.com/1tsDaksh/choiceMirror/issues/1

## 2. Core proposition
AI-assisted paired user journeys reveal **observed friction asymmetry** by running opposing tasks from equivalent controlled starting states. Differentiate from screenshot-only scanners through browser actions, auditable evidence, deterministic metrics and careful explanations.

## 3. Confirmed decisions
- Use the user-provided `1tsDaksh/choiceMirror` repository.
- Prepare six root planning files: `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `Memory.md`.
- Focus on a realistic Dec 7 hackathon prototype, not a production-scale service.
- Do not overwrite unrelated repository content.
- Build on original controlled benchmark pages before considering third-party sites.
- Never present synthetic/illustrative results as observed production evidence.

## 4. Proposed technical decisions (not final)
- Strict TypeScript; Next.js/React/Tailwind UI; Playwright; Zod; Vitest; SQLite/local artifact storage.
- Model-provider-neutral structured action planner; single real model adapter selected during implementation.
- Explicit separation of AI actions, browser execution, event logging, deterministic evaluation, and UI.
- Local reliable demo first; browser-capable deployment only when verified.

## 5. In scope
- Controlled benchmark with balanced/asymmetric designs.
- Join vs leave and accept vs reject comparison.
- Clean-context paired browser runs.
- AI-assisted navigation with safe action policy.
- Event trace, screenshot capture, measured metrics and evidence-linked comparison screen.

## 6. Excluded for MVP
Real third-party account actions; purchases; payments; arbitrary public-site crawling; legally definitive dark-pattern labels; complex multi-agent architecture; production-scale authentication and data collection.

## 7. Work completed
| Date | Item | Evidence |
|---|---|---|
| 2026-11-13 | Verified accessible repository and write permissions; repo initially empty | GitHub repository |
| 2026-11-13 | Created original README and project outline on `main` | Initial commit `c18a11249b98873cd2e2c0d5b9840458deda853f` |
| 2026-11-13 | Opened project kickoff checklist | GitHub issue #1 |
| 2026-11-13 | Drafted initial specifications and phase plan | Six root Markdown files, subject to successful commit |

## 8. Known unknowns / verification
1. **Eligibility:** public event listing specifies students only and age of majority. Check actual participant status.
2. **Rubric conflict:** event rules give Innovation 25, Technical 25, Impact 20, AI & Responsible Use 15, UX & Presentation 15; public event judging area may show different categories/weights. Confirm governing rubric with organisers. Build to satisfy both.
3. Confirm maximum team size, whether original work during event window is required and any AI/disclosure rules.
4. Model provider, usage caps, hosting and team ownership still undecided.
5. Current repo contains no working application; mark features complete only after tested implementation.

## 9. Immediate next actions
- Review and finalize the six docs.
- Resolve event eligibility and rubric.
- Start Phase 1 scaffold and benchmark fixture.
- Record each PR and tested milestone here.

## 10. Decision log
| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-001 | 2026-11-13 | Use ChoiceMirror repo as canonical workspace | Explicitly supplied by project owner | Confirmed |
| D-002 | 2026-11-13 | Prioritize paired browser evidence over generic chat | Innovation and demonstrated technical substance | Proposed |
| D-003 | 2026-11-13 | Controlled fixture first | Reliability, safety, realistic delivery | Proposed |
| D-004 | 2026-11-13 | Preserve unknown/failed states visibly | Responsible AI and scientific honesty | Proposed |

## 11. Change log
- **2026-11-13 v0.1:** Initialized repository; established working product hypothesis and six-document planning framework.

## 12. Update template
After a meaningful work session, update:
```md
### YYYY-MM-DD — [Change summary]
- Completed (with commit/PR or test evidence):
- Changed decisions:
- Tests run and outcomes:
- Current blockers:
- Next concrete task:
```
Never claim a change was committed without verifying its successful GitHub response.
