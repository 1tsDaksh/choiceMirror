# SUBMISSION_CHECKLIST — SLAY HACKS 2026 (Devpost)

> **Status: DRAFT — nothing has been submitted or published.** This checklist records the
> competition facts verified against the official Devpost pages on **2026-11-18**
> (`https://slayy-hacks.devpost.com/` and `https://slayy-hacks.devpost.com/rules`), maps
> them to the prepared materials, and lists the owner actions that remain. Transferring the
> draft into Devpost and pressing submit requires explicit owner sign-off (see
> *Owner actions*).
>
> Verification was performed by the plan's Task 8 against the live official pages; the
> facts below are transcribed from that verification. Where the two official pages
> disagree, **both** figures are recorded — do not silently pick one.

---

## 1. Verified competition facts

| # | Fact | Verified value | Source (fetched 2026-11-18) |
|---|---|---|---|
| F1 | Submission deadline | **2026-12-07 17:00 EST / 22:00 GMT** (JSON-LD `endDate: 2026-12-07T17:00:00-05:00`) | Event page + `/rules` |
| F2 | Eligibility | Students only; above the local age of majority; companies excluded; all countries with standard exceptions | `/rules` |
| F3 | Team size | Individual or team; **no numeric team cap published** — Devpost registration governs | Event page + `/rules` |
| F4 | Development window | **Nov 7 – Dec 7, 2026**; original work created during the window | `/rules` |
| F5 | Submission fields | Project name + overview; problem + solution; AI implementation description; working demo link + access instructions; screenshots; source repository + setup docs; recommended 2–4 min video | Event page + `/rules` |
| F6 | Judging criteria — **rules §9 + event page "How Projects Will Be Evaluated"** | Innovation **25** / Technical **25** / Impact **20** / AI + Responsible **15** / UX + Presentation **15** | `/rules` §9, event page |
| F7 | Judging criteria — **event page "Judging Criteria" block** (discrepancy) | Innovation **30** / Technical **30** / Design + UX **20** / Presentation + Impact **20** | Event page |
| F8 | Prize pool — discrepancy noted | **$5 000** (rules) vs **$4 500** (event page / JSON-LD) | `/rules` vs event page |
| F9 | Judging period | **Dec 8–14, 2026** | Event page + `/rules` |
| F10 | Winners announced | **Dec 16, 2026** | Event page + `/rules` |
| F11 | Third-party libraries / AI disclosure | External libraries and models must be identified clearly — covered by `README.md` (External dependencies section) + the draft's Technology field | `/rules`; `README.md` |

**Rubric discrepancy (F6 vs F7):** the two official sources publish different weightings and
even different category names. The draft (`DEVPOST_DRAFT.md`) is written to score under
**both** (strong innovation/technical story; explicit responsible-AI section; UX/presentation
evidence; impact framing). **Verify the governing criteria with the organizers before
submitting** (owner action O2 below). Do not assume either page is authoritative.

**Prize discrepancy (F8):** noted for awareness only; does not affect the submission content.

---

## 2. Material readiness (prepared in this repository)

| Submission field (F5) | Prepared material | Status |
|---|---|---|
| Project name + overview | `DEVPOST_DRAFT.md` — Project name, Tagline | ✅ ready to transfer |
| Problem + solution | `DEVPOST_DRAFT.md` — Problem, Solution | ✅ ready to transfer |
| AI implementation | `DEVPOST_DRAFT.md` — How it works, Technology, Responsible AI | ✅ ready to transfer |
| Working demo link + access instructions | `README.md` (Local setup) + `DEMO_SCRIPT.md`; draft's "How it works" carries run instructions | ⚠️ NOT yet satisfied — a working demo link or video is required (repo + instructions alone is not an established compliant path); see O3 |
| Screenshots | `docs/submission/assets/` — 7 genuine screenshots + `PROVENANCE.md` | ✅ ready (7/7 sweep-clean) |
| Source repository + setup docs | Repository + `README.md` setup (fresh-clone commands for Windows, macOS, and Linux) | ✅ ready |
| Video (recommended 2–4 min) | `DEMO_SCRIPT.md` — full 4:00 script; **recording honestly unavailable** (two genuine capture attempts failed at the headless-screencast layer; no video is claimed or substituted) | ⚠️ owner decision required (O4) |

---

## 3. Owner actions — unchecked until the owner signs off

- [ ] **O1 — Register / confirm eligibility & team.** Confirm every participant is a
      student above their local age of majority, register the project on Devpost
      (individual or team per F3), and confirm no company affiliation (F2).
- [ ] **O2 — Verify the rubric with the organizers.** Ask which weighting governs
      (F6 25/25/20/15/15 vs F7 30/30/20/20) and confirm the prize pool (F8). The draft
      already scores under both; adjust emphasis only if organizers clarify.
- [ ] **O3 — Provide a working demo link + access instructions.** The Devpost field
      requires a working demo with access instructions; the official rules accept a
      video when a live demo is unavailable. The product runs locally (two dev servers +
      optional `NEBIUS_API_KEY`), no hosted demo exists, and no recording could be
      produced here (see O4) — so "repo + instructions only" is **not** an established
      compliant alternative. Owner must stand up an accessible demo (hosted instance or
      guided live demo) or obtain a video (O4), or get explicit organizer confirmation
      that setup instructions alone are acceptable — then test the submitted link from a
      clean session before entering it in the Devpost field.
- [ ] **O4 — Decide on the video.** A complete 4:00 script exists (`DEMO_SCRIPT.md`), but
      no recording could be produced in this environment (two failed capture attempts,
      frame-verified). Either record externally or submit without the recommended video.
- [ ] **O5 — Final submit approval.** Review `DEVPOST_DRAFT.md` against this checklist,
      then explicitly approve. **No external submission without owner sign-off** — do not
      press submit on Devpost until O5 is checked by the owner.

---

## 4. Credential sweep (Review Focus 1) — evidence

Command (run 2026-11-18, branch `feat/phase-5-final-validation` @ `aeed4d6`):

```
git grep -I -E "v1\.[A-Za-z0-9_-]{20,}|Bearer " -- docs/submission README.md
```

Verbatim output (exit code 0 — matches found, both non-secret):

```
docs/submission/DEMO_SCRIPT.md:| Credential sweep | page-text scan: 0 hits for key/Bearer patterns | page-text scan: 0 hits; 0 console errors; no dev overlay |
docs/submission/assets/PROVENANCE.md:| `01-homepage-launcher.png` | **Clean.** Public marketing copy, scenario catalog, scenario ids only. No keys, tokens, Bearer strings, or personal data. |
```

**Outcome: clean.** Both hits are documentation *referring to* the sweep patterns
(the literal word "Bearer" inside sweep-result descriptions); zero hits for the
`v1\.[A-Za-z0-9_-]{20,}` key shape; no key material anywhere in the submission docs or
README. Consistent with the asset-level sweep in `assets/PROVENANCE.md` (7/7 screenshots
clean) and the run-level sweeps in `LIVE_TEST_RESULTS.md` / `SECURITY_REVIEW.md` (the key
lives only in the gitignored `apps/web/.env.local`, never printed or committed).

---

## 5. Honest-status notes

- The draft says "ready to transfer into Devpost" — **it is not a submission**, and no
  platform has confirmed acceptance (spec §11: do not claim completion until the platform
  confirms).
- All numbers cited in the draft trace to `LIVE_TEST_RESULTS.md`,
  `VALIDATION_REPORT.md`, `SECURITY_REVIEW.md`, `assets/PROVENANCE.md`, or
  `docs/Memory.md` / `docs/Phases.md`; none are anticipated.
- Live inference results describe the controlled local benchmark only — see the draft's
  Limitations.
