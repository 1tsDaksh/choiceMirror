import { describe, expect, test } from "vitest";

import { evidenceChipLabel, goalLetterByJourneyId } from "./evidence-chips";

describe("goalLetterByJourneyId", () => {
  test("resolves journeys to goal slots by goalIds, not by stored array order", () => {
    const letters = goalLetterByJourneyId(
      ["join", "leave"],
      // Storage order is an implementation detail: B is written first.
      [
        { id: "cmp_ab12cd34ef567890-leave", goalId: "leave" },
        { id: "cmp_ab12cd34ef567890-join", goalId: "join" },
      ],
    );

    expect(letters.get("cmp_ab12cd34ef567890-join")).toBe("Goal A");
    expect(letters.get("cmp_ab12cd34ef567890-leave")).toBe("Goal B");
  });

  test("omits journeys that are not part of the comparison", () => {
    const letters = goalLetterByJourneyId(
      ["join", "leave"],
      [{ id: "cmp_ab12cd34ef567890-join", goalId: "join" }],
    );

    expect(letters.has("cmp_ab12cd34ef567890-leave")).toBe(false);
  });
});

describe("evidenceChipLabel", () => {
  test("labels the chip by the cited journey when only goal B has counted actions", () => {
    const letters = goalLetterByJourneyId(
      ["join", "leave"],
      [
        { id: "cmp_ab12cd34ef567890-join", goalId: "join" },
        { id: "cmp_ab12cd34ef567890-leave", goalId: "leave" },
      ],
    );

    // Goal A recorded no counted actions, so the only evidence entry is
    // goal B's — the chip must say Goal B, never "Goal A" by position.
    const label = evidenceChipLabel(
      {
        journeyId: "cmp_ab12cd34ef567890-leave",
        stepNos: [2],
        screenshotIds: ["cmp_ab12cd34ef567890-leave-step-1.png"],
      },
      letters,
    );

    expect(label).toBe("Goal B · steps 2");
  });

  test("keeps every step number of a multi-step citation", () => {
    const letters = goalLetterByJourneyId(
      ["join", "leave"],
      [{ id: "cmp_ab12cd34ef567890-join", goalId: "join" }],
    );

    const label = evidenceChipLabel(
      {
        journeyId: "cmp_ab12cd34ef567890-join",
        stepNos: [3, 4, 5],
        screenshotIds: [],
      },
      letters,
    );

    expect(label).toBe("Goal A · steps 3,4,5");
  });

  test("falls back honestly when the cited journey is not in the comparison", () => {
    const label = evidenceChipLabel(
      {
        journeyId: "cmp_0000000000000000-join",
        stepNos: [1],
        screenshotIds: [],
      },
      goalLetterByJourneyId(["join", "leave"], []),
    );

    expect(label).toBe("Unknown goal · steps 1");
  });
});
