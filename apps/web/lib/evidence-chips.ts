import type { ComparisonRecord, JourneyRecord } from "@choicemirror/contracts";
import type { Finding } from "@choicemirror/metrics";

export type GoalLetter = "Goal A" | "Goal B";

/**
 * Maps stored journey ids to their goal slot via `comparison.goalIds`.
 * Evidence chips must never infer the goal from array position — storage
 * ordering is an implementation detail of the file-backed store.
 */
export function goalLetterByJourneyId(
  goalIds: ComparisonRecord["goalIds"],
  journeys: ReadonlyArray<Pick<JourneyRecord, "id" | "goalId">>,
): ReadonlyMap<string, GoalLetter> {
  const letters = new Map<string, GoalLetter>();
  goalIds.forEach((goalId, index) => {
    const journey = journeys.find(
      (candidate) => candidate.goalId === goalId,
    );
    if (journey) {
      letters.set(journey.id, index === 0 ? "Goal A" : "Goal B");
    }
  });
  return letters;
}

/** Chip text for one evidence citation, resolved by journey id. */
export function evidenceChipLabel(
  entry: Finding["evidence"][number],
  letters: ReadonlyMap<string, GoalLetter>,
): string {
  const letter = letters.get(entry.journeyId) ?? "Unknown goal";
  return `${letter} · steps ${entry.stepNos.join(",")}`;
}
