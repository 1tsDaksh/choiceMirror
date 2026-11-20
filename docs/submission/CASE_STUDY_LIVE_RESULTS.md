# Verified genuine Nebius AI — OrbitPass case-study results

**Execution:** 20 November 2026, 23:29:13–23:30:18 UTC  
**Model:** Nebius Token Factory `zai-org/GLM-5.3-Flash`  
**Mode:** Real Nebius inference (not the E2E mock), server-side protected GitHub Actions secret  
**Code/run:** [GitHub Actions #44837025110](https://github.com/1tsDaksh/choiceMirror/actions/runs/44837025110), commit `d66e83b2759a7a5c7a7b035ad9411b6d2432b382`  
**Evidence ZIP:** [Artifact #14678592656](https://github.com/1tsDaksh/choiceMirror/actions/runs/44837025110/artifacts/14678592656), **30-day retention through 20 December 2026**  
**ZIP SHA-256:** `07fdcb7867af29b5e0b89a128ce506bc60faaa5549795d620d552296ee3a2485`

The report is transcribed from the **actual uploaded results.json** and independently checked against the 24 PNG files in the Actions artifact. All 24 PNG files matched their individual stored SHA-256 digests. The secret was neither accessed nor stored in the evidence.

## Per-journey results

| Fictional interface | Goal | Status | Recorded actions | Genuine API calls | Input tokens | Output tokens | PNG screenshots | Rejected proposals | Model errors |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OrbitPass reference | Join | Completed | 1 | 2 | 1,385 | 209 | 4 | 0 | 0 |
| OrbitPass reference | Cancel | Completed | 5 | 7 | 4,078 | 772 | 8 | 0 | 0 |
| OrbitPass copy/layout variant | Join | Completed | 1 | 2 | 1,394 | 168 | 4 | 0 | 0 |
| OrbitPass copy/layout variant | Cancel | Completed | 5 | 6 | 4,101 | 731 | 8 | 0 | 0 |
| **Total** | **4 journeys** | **4 completed** | **12 clicks across the 4 paths** | **17** | **10,958** | **1,880** | **24** | **0** | **0** |

Each result contains real browser events whose successful-click count matched the recorded action count. The stored original and reworded screenshots are available in the artifact. The sample uses **one** genuine run per goal and interface. It is not an error rate, confidence interval or repeated-trials study.

### What these results support

- A model making **genuine Nebius calls** selected the correct actions from browser observations on both original and reworded fictional OrbitPass pages.
- In both original and variation, Join took **1** actual click after goal selection; Cancel required **5** actual clicks, a deliberately designed friction difference of **4**.
- The unchanged exact-label reference Playwright script fails on the reworded interface, but an **updated deterministic script succeeds**. Therefore the result demonstrates navigation despite copy/layout variation, **not** that all scripted automation fails or that AI is universally better.

### What these results do not support

- No external third-party website was visited or audited.
- The cancellation friction was **designed into the synthetic test** based on a historical issue category, not discovered on a current commercial site.
- One successful run per path does not establish statistical generalisability or reliability across unknown website layouts.
- No human usability study is claimed; see [the unrun volunteer study protocol](USER_STUDY_PROTOCOL.md).
- Real AI execution was protected by the repository Actions secret and exercised only the allowed local benchmark origin.

**Reproducibility:** `tests/live/case-study.spec.ts` + the manual-only [protected workflow](../../.github/workflows/case-study-live.yml). No scheduled or push-based credit-consuming workflow remains.
