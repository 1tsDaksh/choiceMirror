import {
  comparisonRequestSchema,
  getScenario,
} from "@choicemirror/contracts";

function invalidRequest(): Response {
  return Response.json(
    { error: "Invalid comparison request." },
    { status: 400 },
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

  return Response.json(
    { error: "Browser runner is not available in Phase 1." },
    { status: 503 },
  );
}
