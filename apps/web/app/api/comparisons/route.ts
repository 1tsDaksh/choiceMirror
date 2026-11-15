import {
  comparisonRequestSchema,
  getScenario,
  newComparisonId,
  type ComparisonRecord,
} from "@choicemirror/contracts";

import { getStore } from "../../../lib/comparison-store";
import {
  releaseRun,
  startComparisonRun,
  tryReserveRun,
} from "../../../lib/run-comparison";

function invalidRequest(): Response {
  return Response.json(
    { error: "Invalid comparison request." },
    { status: 400 },
  );
}

function alreadyRunning(): Response {
  return Response.json(
    { error: "A comparison is already running." },
    { status: 429 },
  );
}

function notStarted(): Response {
  return Response.json(
    { error: "Comparison could not be started." },
    { status: 500 },
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidRequest();
  }

  const parsed = comparisonRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequest();
  }

  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) {
    return invalidRequest();
  }

  // The pair must match the catalog order exactly: Goal A/Goal B mapping is
  // fixed per scenario, so a reversed but valid pair is rejected as invalid.
  const expectedGoalIds = scenario.goals.map((goal) => goal.id);
  const submittedGoalIds = [...parsed.data.goalIds];
  if (
    expectedGoalIds.length !== submittedGoalIds.length ||
    expectedGoalIds.some((goalId, index) => goalId !== submittedGoalIds[index])
  ) {
    return invalidRequest();
  }

  const record: ComparisonRecord = {
    id: newComparisonId(),
    scenarioId: parsed.data.scenarioId,
    goalIds: parsed.data.goalIds,
    seed: "phase-2",
    status: "running",
    createdAt: new Date().toISOString(),
  };

  // Atomic single-flight reservation: a synchronous check-and-set before the
  // first await after validation. Two interleaved POSTs cannot both pass —
  // the losing request answers 429 without touching the store.
  if (!tryReserveRun(record.id)) {
    return alreadyRunning();
  }

  try {
    await getStore().saveComparison(record);
  } catch {
    releaseRun(record.id);
    return notStarted();
  }

  void startComparisonRun(record.id).catch(async (error: unknown) => {
    // The run releases its own reservation in its finally; releasing here
    // too is harmless (it only clears a matching id) and guarantees the slot
    // can never leak if the run throws before acquiring it.
    releaseRun(record.id);
    // The controller records its own failures; this guards unexpected throws
    // so a 202 never leaves a comparison stuck in "running".
    try {
      const store = getStore();
      const current = await store.getComparison(record.id);
      if (current && current.status === "running") {
        await store.saveComparison({
          ...current,
          status: "failed",
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch {
      // Best effort: the runner must never throw at the caller.
    }
  });

  return Response.json(
    { comparisonId: record.id, status: "running" },
    { status: 202 },
  );
}
