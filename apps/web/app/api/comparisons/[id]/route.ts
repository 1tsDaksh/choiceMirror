import {
  comparisonDetailSchema,
  parseComparisonId,
} from "@choicemirror/contracts";

import { getStore } from "../../../../lib/comparison-store";

type RouteContext = { params: Promise<{ id: string }> };

function notFound(): Response {
  return Response.json({ error: "Comparison not found." }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { id } = await params;
  const comparisonId = parseComparisonId(id);
  if (!comparisonId) {
    return notFound();
  }

  const store = getStore();
  const comparison = await store.getComparison(comparisonId);
  if (!comparison) {
    return notFound();
  }

  const journeys = await store.getJourneys(comparisonId);
  const detail = comparisonDetailSchema.safeParse({ comparison, journeys });
  if (!detail.success) {
    // Never serve a record that fails the evidence contract.
    return notFound();
  }

  return Response.json(detail.data);
}
