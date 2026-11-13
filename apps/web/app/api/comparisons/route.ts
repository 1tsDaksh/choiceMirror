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
