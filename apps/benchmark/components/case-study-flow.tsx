"use client";

import Link from "next/link";
import { useState } from "react";
import { getFlow, type Scenario } from "@choicemirror/contracts";

type Props = { scenario: Scenario; seed: string };
type GoalId = "join" | "leave";
type Step = { goalId: GoalId; index: number; complete: boolean };

const panels = [
  { heading: "Account settings", body: "The member has to open account options before being offered cancellation.", note: "OrbitPass Standard · £8.99 / month (fictional)" },
  { heading: "Cancellation review", body: "The membership details are repeated. A second confirmation moves towards cancellation.", note: "Your subscription renews automatically in this simulation." },
  { heading: "Retention offer", body: "A discounted extension is presented. To continue leaving, the member must decline this offer.", note: "Save 30% on the next fictional renewal. No payment is possible." },
  { heading: "Feedback prompt", body: "A survey asks for a reason to leave. Feedback is optional, but the member must continue.", note: "Displayed reasons: price, limited usage, other." },
  { heading: "Final confirmation", body: "The member must explicitly confirm that the simulated subscription should end.", note: "This action changes only local UI state." },
] as const;

export function CaseStudyFlow({ scenario, seed }: Props) {
  const flow = getFlow(scenario.id);
  const [step, setStep] = useState<Step | null>(null);
  if (!flow) return null;
  const goal = step ? scenario.goals.find((g) => g.id === step.goalId) : undefined;
  const actions = step ? flow.goals[step.goalId] ?? [] : [];
  const currentAction = actions[step?.index ?? 0];
  const panel = panels[step?.index ?? 0];
  const progress = step ? step.complete ? 100 : Math.round(step.index / actions.length * 100) : 0;
  const variant = scenario.id === "membership-copy-variant";

  function advance() {
    if (!step || !currentAction) return;
    const last = step.index + 1 >= actions.length;
    setStep({ ...step, index: last ? step.index : step.index + 1, complete: last });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3 text-sm text-secondary-text">
        <Link href="/" className="hover:text-highlight">← All fixtures</Link>
        <span className="font-mono text-xs">seed: <span className="text-primary-text">{seed}</span></span>
      </div>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-elevated p-5">
          <div>
            <p className="text-2xl font-bold text-primary-text">OrbitPass</p>
            <p className="text-sm text-secondary-text">Fictional streaming subscription · sample account</p>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-secondary-text">
            {variant ? "Reworded controls" : "Reference controls"}
          </span>
        </header>
        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-widest text-journey-a">Synthetic case study · documented historical pattern</p>
              <h1 className="text-2xl font-bold">Membership dashboard</h1>
              <p className="text-sm text-secondary-text">Illustrates extra review, retention and feedback stages described in historical regulatory material. This is not a screenshot or reconstruction of a real company.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-canvas/50 p-4">
              <p className="text-xs uppercase tracking-wide text-secondary-text">Current sample plan</p>
              <p className="mt-1 text-lg font-semibold">OrbitPass Standard</p>
              <p className="text-sm text-secondary-text">£8.99 / month · illustrative price · no real account or payments</p>
            </div>
            <section aria-live="polite" aria-labelledby="flow-heading" className="space-y-4">
              {!step ? (
                <>
                  <h2 id="flow-heading" className="text-xl font-semibold">{flow.startTitle}</h2>
                  <p className="text-sm text-secondary-text">{flow.startDescription}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scenario.goals.map((g) => (
                      <button key={g.id} type="button"
                        onClick={() => setStep({ goalId: g.id as GoalId, index: 0, complete: false })}
                        className="min-h-28 rounded-xl border border-highlight/40 bg-elevated p-4 text-left hover:border-highlight">
                        <span className="block text-lg font-semibold">{g.label}</span>
                        <span className="mt-2 block text-sm text-secondary-text">{g.description}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-journey-b">Goal: {goal?.label}</span>
                    <span className="rounded-full bg-highlight/15 px-3 py-1 text-xs text-highlight">
                      {step.complete ? "Completed" : "Step " + (step.index + 1) + " of " + actions.length}
                    </span>
                  </div>
                  <h2 id="flow-heading" className="text-xl font-semibold">
                    {step.complete ? "Goal completed" : step.goalId === "join" ? "Start a membership" : panel.heading}
                  </h2>
                  {step.complete ? (
                    <p className="text-sm text-secondary-text">
                      {"Completed in " + actions.length + " action" + (actions.length === 1 ? "" : "s") + ". No data was submitted."}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-secondary-text">
                        {step.goalId === "join" ? "Activate this fictional membership. No payment is taken." : panel.body}
                      </p>
                      <button type="button" onClick={advance}
                        className="min-h-12 w-full rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90">
                        {currentAction}
                      </button>
                      {step.goalId === "leave" && step.index === 2 ? (
                        <button type="button" onClick={() => setStep(null)}
                          className="min-h-11 w-full rounded-xl border border-white/20 px-4 text-sm text-secondary-text">
                          Keep the membership instead
                        </button>
                      ) : null}
                    </>
                  )}
                  <div role="progressbar" aria-label={goal?.label + " progress"}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
                    className="h-2 overflow-hidden rounded-full bg-elevated">
                    <div className="h-full bg-journey-a" style={{ width: progress + "%" }} />
                  </div>
                </>
              )}
              <button type="button" onClick={() => setStep(null)}
                className="min-h-11 rounded-lg border border-white/15 px-4 text-sm text-secondary-text">
                Reset to starting state
              </button>
            </section>
          </div>
          <aside className="space-y-4 rounded-xl border border-white/10 bg-canvas/40 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-journey-a">Your subscription</p>
            <h3 className="text-lg font-semibold">{step?.goalId === "leave" && !step.complete ? panel.heading : "Member benefits"}</h3>
            <p className="text-sm text-secondary-text">
              {step?.goalId === "leave" && !step.complete ? panel.note : "An entirely fictitious streaming catalog with flexible plan settings."}
            </p>
            <div className="border-t border-white/10 pt-4 text-sm text-secondary-text">
              <p className="font-semibold text-primary-text">About this test</p>
              <p className="mt-2">OrbitPass is an original synthetic exercise. Its measured steps are not evidence about a current third-party website, intentional manipulation or legal compliance.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
