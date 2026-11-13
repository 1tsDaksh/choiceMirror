"use client";

import Link from "next/link";
import { useState } from "react";

import type { Goal, Scenario } from "@choicemirror/contracts";

import { getFlow, initialFlowState } from "@/lib/flows";

type ChoiceFlowProps = {
  scenario: Scenario;
  seed: string;
};

type Selection = {
  goalId: Goal["id"];
  stepIndex: number;
  complete: boolean;
};

export function ChoiceFlow({ scenario, seed }: ChoiceFlowProps) {
  const flow = getFlow(scenario.id);
  const [selection, setSelection] = useState<Selection | null>(null);

  if (!flow) {
    return null;
  }

  const startGoal = (goalId: Goal["id"]) => {
    const initialState = initialFlowState(flow, goalId);
    if (initialState) {
      setSelection(initialState);
    }
  };

  const advance = () => {
    if (!selection) {
      return;
    }

    const actions = flow.goals[selection.goalId] ?? [];
    const isLastStep = selection.stepIndex === actions.length - 1;

    setSelection({
      ...selection,
      stepIndex: isLastStep ? selection.stepIndex : selection.stepIndex + 1,
      complete: isLastStep,
    });
  };

  const reset = () => {
    setSelection(null);
  };

  const selectedGoal = selection
    ? scenario.goals.find((goal) => goal.id === selection.goalId)
    : undefined;
  const actions = selection ? flow.goals[selection.goalId] ?? [] : [];
  const currentAction = actions[selection?.stepIndex ?? 0];
  const progress = selection
    ? Math.round(((selection.stepIndex + 1) / actions.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-lg text-sm text-secondary-text hover:text-highlight"
        >
          ← All fixtures
        </Link>
        <span className="font-mono text-xs text-secondary-text">
          seed: <span className="text-primary-text">{seed}</span>
        </span>
      </div>

      <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-journey-a">
              {scenario.kind} · {scenario.variant}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {scenario.title}
            </h1>
          </div>
          <span className="rounded-full border border-white/10 bg-elevated px-3 py-1 text-xs font-medium text-secondary-text">
            Synthetic local state
          </span>
        </div>
        <p className="mt-3 text-secondary-text">{scenario.description}</p>
      </section>

      <section
        aria-labelledby="flow-heading"
        aria-live="polite"
        className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"
      >
        {!selection ? (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-xs text-secondary-text">Starting state</p>
              <h2 id="flow-heading" className="mt-1 text-xl font-semibold">
                {flow.startTitle}
              </h2>
              <p className="mt-2 text-secondary-text">{flow.startDescription}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {scenario.goals.map((goal, index) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => startGoal(goal.id)}
                  className={`min-h-24 rounded-xl border p-4 text-left transition-colors ${
                    index === 0
                      ? "border-journey-a/50 bg-journey-a/10 hover:bg-journey-a/20"
                      : "border-journey-b/50 bg-journey-b/10 hover:bg-journey-b/20"
                  }`}
                >
                  <span
                    className={`font-mono text-xs ${
                      index === 0 ? "text-journey-a" : "text-journey-b"
                    }`}
                  >
                    Goal {index === 0 ? "A" : "B"}
                  </span>
                  <span className="mt-1 block text-lg font-semibold">
                    {goal.label}
                  </span>
                  <span className="mt-1 block text-sm text-secondary-text">
                    {goal.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-secondary-text">
                  Goal {selection.goalId === scenario.goals[0]?.id ? "A" : "B"} ·{" "}
                  {selectedGoal?.label}
                </p>
                <h2 id="flow-heading" className="mt-1 text-xl font-semibold">
                  {selection.complete ? "Goal completed" : currentAction}
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  selection.complete
                    ? "bg-success/15 text-success"
                    : "bg-highlight/15 text-highlight"
                }`}
              >
                {selection.complete ? "Completed" : `Step ${selection.stepIndex + 1} of ${actions.length}`}
              </span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-elevated"
              role="progressbar"
              aria-label={`${selectedGoal?.label} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className={`h-full rounded-full ${
                  selection.goalId === scenario.goals[0]?.id
                    ? "bg-journey-a"
                    : "bg-journey-b"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {selection.complete ? (
              <p className="text-secondary-text">
                Completed in {actions.length} action
                {actions.length === 1 ? "" : "s"}. No data was submitted.
              </p>
            ) : (
              <button
                type="button"
                onClick={advance}
                className="min-h-12 w-full rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90 sm:w-auto"
              >
                {currentAction}
              </button>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-medium text-secondary-text hover:border-highlight hover:text-highlight"
          >
            Reset to starting state
          </button>
        </div>
      </section>
    </div>
  );
}
