"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Scenario } from "@choicemirror/contracts";

import { ComparisonState } from "@/components/comparison-state";
import { loadScenarios } from "@/lib/load-scenarios";

type LauncherState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; scenarios: Scenario[] };

type RunState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "error"; message: string };

type ScenarioLauncherProps = {
  initialScenarios: Scenario[];
};

function benchmarkUrl(path: string): string {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_BENCHMARK_ORIGIN ?? "http://localhost:3001";

  try {
    const base = new URL(configuredOrigin);
    const url = new URL(path, base);
    // A protocol-relative path would resolve to a foreign origin; pin to the
    // configured benchmark origin so the launcher can never link off-origin.
    const origin = url.origin === base.origin ? base.origin : "http://localhost:3001";
    return `${origin}${url.pathname}?seed=phase-1`;
  } catch {
    return `http://localhost:3001${path}?seed=phase-1`;
  }
}

export function ScenarioLauncher({
  initialScenarios,
}: ScenarioLauncherProps) {
  const router = useRouter();
  const [state, setState] = useState<LauncherState>(() =>
    initialScenarios.length > 0
      ? { status: "ready", scenarios: initialScenarios }
      : { status: "empty" },
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [runState, setRunState] = useState<RunState>({ status: "idle" });

  const retryScenarios = () => {
    setState({ status: "loading" });
    void loadScenarios().then((result) => setState(result));
  };

  if (state.status === "loading") {
    return (
      <ComparisonState
        kind="loading"
        level={2}
        title="Loading controlled scenarios"
        description="Retrieving the benchmark catalog."
      />
    );
  }

  if (state.status === "error") {
    return (
      <ComparisonState
        kind="error"
        level={2}
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
        level={2}
        title="No controlled scenarios"
        description="The local benchmark catalog is empty."
      />
    );
  }

  const selectedScenario = state.scenarios.find(
    (scenario) => scenario.id === selectedScenarioId,
  );

  const startRun = async () => {
    if (selectedScenario === undefined || runState.status === "starting") {
      return;
    }

    setRunState({ status: "starting" });

    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          // Catalog order is the contract: Goal A first, Goal B second.
          goalIds: selectedScenario.goals.map((goal) => goal.id),
        }),
      });

      if (response.status === 202) {
        const body = (await response.json()) as { comparisonId?: unknown };
        if (
          typeof body.comparisonId === "string" &&
          /^cmp_[a-f0-9]{16}$/.test(body.comparisonId)
        ) {
          router.push(`/comparisons/${body.comparisonId}`);
          return;
        }
        setRunState({
          status: "error",
          message: "The comparison could not be started.",
        });
        return;
      }

      if (response.status === 400) {
        setRunState({
          status: "error",
          message: "That request was not valid.",
        });
        return;
      }

      if (response.status === 429) {
        setRunState({
          status: "error",
          message: "Another comparison is still running. Wait for it to finish.",
        });
        return;
      }

      setRunState({
        status: "error",
        message: "The comparison could not be started.",
      });
    } catch {
      setRunState({
        status: "error",
        message: "The comparison could not be started.",
      });
    }
  };

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
                onChange={() => {
                  setSelectedScenarioId(scenario.id);
                  // A stale error from another scenario must not follow the
                  // selection.
                  setRunState({ status: "idle" });
                }}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-secondary-text">
                  {scenario.id}
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-elevated px-2.5 py-1 text-xs font-semibold text-secondary-text">
                    Controlled benchmark
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void startRun()}
                disabled={runState.status === "starting"}
                className="min-h-12 rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {runState.status === "starting"
                  ? "Starting run…"
                  : "Run comparison"}
              </button>
              <a
                href={benchmarkUrl(selectedScenario.benchmarkPath)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-highlight px-5 font-semibold text-highlight hover:bg-highlight/10"
              >
                Explore manually in benchmark →
              </a>
            </div>
            {runState.status === "error" ? (
              <p
                role="status"
                className="rounded-xl border border-error/40 bg-error/5 p-3 text-sm text-error"
              >
                {runState.message}
              </p>
            ) : null}
            <p className="text-sm text-secondary-text">
              Runs execute locally against the benchmark app with fixed limits.
            </p>
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
