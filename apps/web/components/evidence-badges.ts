import type { AiEvent, JourneyRecord } from "@choicemirror/contracts";

export const statusBadges: Record<
  JourneyRecord["status"],
  { label: string; className: string }
> = {
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  failed: { label: "Failed", className: "bg-error/15 text-error" },
  timeout: { label: "Timed out", className: "bg-warning/15 text-warning" },
  blocked: { label: "Blocked", className: "bg-warning/15 text-warning" },
};

export const validationBadges: Record<
  AiEvent["validation"],
  { className: string }
> = {
  executed: { className: "bg-success/15 text-success" },
  rejected: { className: "bg-warning/15 text-warning" },
  "model-error": { className: "bg-error/15 text-error" },
};

export const waitingBadge = {
  label: "Waiting",
  className: "bg-white/10 text-secondary-text",
};

export function outcomeClass(outcome: "success" | "failure"): string {
  return outcome === "success" ? "text-success" : "text-error";
}
