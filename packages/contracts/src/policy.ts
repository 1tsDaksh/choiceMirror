import type {
  ActionProposal,
  PageObservation,
  ProposalValidation,
} from "./agent";

export type ProposalContext = {
  phase: "goal" | "steps";
  goalDescription: string;
};

/**
 * Pure policy gate between a model proposal and the browser. The model may
 * only click elements that exist in the observation it was given and that
 * are enabled; during goal selection the target must additionally be the
 * button for the journey's assigned goal, so a model can never start the
 * opposing flow. `stop` is always permitted — it ends the journey without
 * touching the page. Execution happens only after this returns `ok`.
 */
export function validateProposal(
  proposal: ActionProposal,
  observation: PageObservation,
  context: ProposalContext,
): ProposalValidation {
  if (proposal.action === "stop") {
    return { ok: true, decision: "stop" };
  }

  const element = observation.elements.find(
    (candidate) => candidate.id === proposal.targetId,
  );
  if (!element) {
    return { ok: false, reason: "Target is not present in the observation." };
  }
  if (!element.enabled) {
    return { ok: false, reason: "Target is not enabled." };
  }
  if (
    context.phase === "goal" &&
    !element.name.includes(context.goalDescription)
  ) {
    return { ok: false, reason: "Target does not match the assigned goal." };
  }

  return { ok: true, decision: "click", element };
}
