"use client";

import { useState } from "react";

import {
  scenarioListSchema,
  type Scenario,
} from "@choicemirror/contracts";

import { ComparisonState } from "@/components/comparison-state";
import { RunStatus } from "@/components/run-status";

type LauncherState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; scenarios: Scenario[] };

type ScenarioLauncherProps = {
  initialScenarios: Scenario[];
};

function benchmarkUrl(path: string): string {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_BENCHMARK_ORIGIN ?? "http://localhost:3001";

  try {
    const url = new URL(path, configuredOrigin);
    return `${url.origin}${url.pathname}?seed=phase-1`;
  } catch {
    return `http://localhost:3001${path}?seed=phase-1`;
  }
}

export function ScenarioLauncher({
  initialScenarios,
}: ScenarioLauncherProps) {
  const [state, setState] = useState<LauncherState>(() =>
    initialScenarios.length > 0
      ? { status: "ready", scenarios: initialScenarios }
      : { status: "empty" },
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  const loadScenarios = async () => {
    try {
      const response = await fetch("/api/scenarios");
      if (!response.ok) {
        throw new Error(`Scenario request failed: ${response.status}`);
      }

      const payload = scenarioListSchema.safeParse(await response.json());
      if (!payload.success || payload.data.length === 0) {
        setState({ status: "empty" });
        return;
      }

      setState({ status: "ready", scenarios: payload.data });
    } catch {
      setState({ status: "error" });
    }
  };

  const retryScenarios = () => {
    setState({ status: "loading" });
    void loadScenarios();
  };

  if (state.status === "loading") {
    return (
      <ComparisonState
        kind="loading"
        title="Loading controlled scenarios"
        description="Retrieving the benchmark catalog."
      />
    );
  }

  if (state.status === "error") {
    return (
      <ComparisonState
        kind="error"
        title="Scenarios are unavailable"
        description="The local scenario catalog could not be loaded."
        action={
          <button
            type="button"
            onClick={retryScenarios}
            className="min-h-11 rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (state.status === "empty") {
    return (
      <ComparisonState
        kind="empty"
        title="No controlled scenarios"
        description="The local benchmark catalog is empty."
      />
    );
  }

  const selectedScenario = state.scenarios.find(
    (scenario) => scenario.id === selectedScenarioId,
  );

  return (
    <div className="space-y-6">
      <fieldset className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
        <legend className="px-2 font-mono text-xs uppercase tracking-widest text-journey-a">
          Select controlled scenario
        </legend>
        <div className="grid gap-3 md:grid-cols-2">
          {state.scenarios.map((scenario) => (
            <label
              key={scenario.id}
              className={`has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-highlight flex min-h-36 cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors ${
                selectedScenarioId === scenario.id
                  ? "border-highlight bg-highlight/10"
                  : "border-white/10 bg-elevated hover:border-highlight/50"
              }`}
            >
              <input
                type="radio"
                name="scenario"
                value={scenario.id}
                checked={selectedScenarioId === scenario.id}
                onChange={() => setSelectedScenarioId(scenario.id)}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-secondary-text">
                  {scenario.id}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    scenario.variant === "balanced"
                      ? "bg-journey-a/15 text-journey-a"
                      : "bg-journey-b/15 text-journey-b"
                  }`}
                >
                  {scenario.variant}
                </span>
              </span>
              <span className="font-semibold">{scenario.title}</span>
              <span className="text-sm text-secondary-text">
                {scenario.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {selectedScenario ? (
        <section
          className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5"
          aria-labelledby="selected-scenario-title"
        >
          <p className="font-mono text-xs text-secondary-text">
            Paired goals
          </p>
          <h2
            id="selected-scenario-title"
            className="mt-1 text-xl font-semibold"
          >
            {selectedScenario.title}
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {selectedScenario.goals.map((goal, index) => (
              <div
                key={goal.id}
                className={`rounded-xl border p-4 ${
                  index === 0
                    ? "border-journey-a/50 bg-journey-a/10"
                    : "border-journey-b/50 bg-journey-b/10"
                }`}
              >
                <p
                  className={`font-mono text-xs ${
                    index === 0 ? "text-journey-a" : "text-journey-b"
                  }`}
                >
                  Goal {index === 0 ? "A" : "B"}
                </p>
                <p className="mt-1 font-semibold">{goal.label}</p>
                <p className="mt-1 text-sm text-secondary-text">
                  {goal.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <RunStatus />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled
                className="min-h-12 cursor-not-allowed rounded-xl bg-elevated px-5 font-semibold text-secondary-text"
              >
                Run comparison
              </button>
              <a
                href={benchmarkUrl(selectedScenario.benchmarkPath)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-highlight px-5 font-semibold text-highlight hover:bg-highlight/10"
              >
                Explore manually in benchmark →
              </a>
            </div>
          </div>
        </section>
      ) : (
        <p
          className="rounded-2xl border border-white/10 bg-surface p-4 text-secondary-text"
          role="status"
        >
          Select a scenario to inspect its opposing goals.
        </p>
      )}
    </div>
  );
}
