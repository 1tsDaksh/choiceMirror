import { getScenario, parseComparisonId } from "@choicemirror/contracts";
import { notFound } from "next/navigation";

import { ComparisonDetail } from "@/components/comparison-detail";
import { getStore } from "@/lib/comparison-store";

type ComparisonPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComparisonPage({
  params,
}: ComparisonPageProps) {
  const { id } = await params;
  const comparisonId = parseComparisonId(id);
  if (!comparisonId) {
    notFound();
  }

  const store = getStore();
  const comparison = await store.getComparison(comparisonId);
  if (!comparison) {
    notFound();
  }

  const scenario = getScenario(comparison.scenarioId);
  if (!scenario) {
    notFound();
  }

  const journeys = await store.getJourneys(comparisonId);
  return (
    <ComparisonDetail initial={{ comparison, journeys }} scenario={scenario} />
  );
}
