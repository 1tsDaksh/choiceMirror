import {
  scenarioListSchema,
  type Scenario,
} from "@choicemirror/contracts";

export type ScenariosLoadResult =
  | { status: "ready"; scenarios: Scenario[] }
  | { status: "empty" }
  | { status: "error" };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function loadScenarios(
  fetchImpl: FetchLike = fetch,
): Promise<ScenariosLoadResult> {
  try {
    const response = await fetchImpl("/api/scenarios");
    if (!response.ok) {
      return { status: "error" };
    }

    const payload = scenarioListSchema.safeParse(await response.json());
    if (!payload.success) {
      return { status: "error" };
    }

    if (payload.data.length === 0) {
      return { status: "empty" };
    }

    return { status: "ready", scenarios: payload.data };
  } catch {
    return { status: "error" };
  }
}
