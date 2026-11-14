import Link from "next/link";

import { scenarios } from "@choicemirror/contracts";

export default function BenchmarkIndexPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-journey-a">
          Phase 1 manual fixtures
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Explore both sides of a controlled choice
        </h1>
        <p className="text-base text-secondary-text sm:text-lg">
          Open a fixture, choose either opposing goal, and complete or reset
          it. Every flow uses only synthetic local state.
        </p>
      </section>

      <ul className="grid gap-4 md:grid-cols-2">
        {scenarios.map((scenario) => (
          <li key={scenario.id}>
            <Link
              href={`${scenario.benchmarkPath}?seed=phase-1`}
              className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-surface p-5 transition-colors hover:border-highlight/60 hover:bg-elevated"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-secondary-text">
                  {scenario.id}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    scenario.variant === "balanced"
                      ? "bg-journey-a/15 text-journey-a"
                      : "bg-journey-b/15 text-journey-b"
                  }`}
                >
                  {scenario.variant}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{scenario.title}</h2>
              <p className="flex-1 text-sm text-secondary-text">
                {scenario.description}
              </p>
              <p className="font-mono text-xs text-secondary-text">
                {scenario.goals
                  .map((goal) => {
                    const count = scenario.expectedActions.find(
                      (action) => action.goalId === goal.id,
                    )?.count;
                    return `${goal.label}: ${count} action${count === 1 ? "" : "s"}`;
                  })
                  .join(" · ")}
              </p>
              <span className="text-sm font-semibold text-highlight">
                Open fixture →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
