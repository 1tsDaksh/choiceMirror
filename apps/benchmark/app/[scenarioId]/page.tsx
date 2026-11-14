import { notFound } from "next/navigation";

import { getScenario } from "@choicemirror/contracts";

import { ChoiceFlow } from "@/components/choice-flow";

type ScenarioPageProps = {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSeed(value: string | string[] | undefined): string {
  if (
    typeof value === "string" &&
    /^[a-zA-Z0-9_-]{1,32}$/.test(value)
  ) {
    return value;
  }

  return "phase-1";
}

export default async function ScenarioPage({
  params,
  searchParams,
}: ScenarioPageProps) {
  const { scenarioId } = await params;
  const query = await searchParams;
  const scenario = getScenario(scenarioId);

  if (!scenario) {
    notFound();
  }

  return (
    <ChoiceFlow scenario={scenario} seed={readSeed(query.seed)} />
  );
}
