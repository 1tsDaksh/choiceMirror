import { scenarios } from "@choicemirror/contracts";

import { ScenarioLauncher } from "@/components/scenario-launcher";

// Public demo configuration is supplied at runtime by Railway, not at build time.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const publicDemo = process.env.PUBLIC_DEMO_ENABLED === "1";
  return (
    <div className="space-y-10">
      <section className="max-w-4xl space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-journey-a">
          See both sides of the click
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Does this interface make both choices equally easy?
        </h1>
        <p className="max-w-3xl text-base text-secondary-text sm:text-lg">
          ChoiceMirror runs opposing user journeys under matched conditions,
          measures actual browser actions, and links every finding to
          screenshots and inspectable evidence. Nebius AI proposes actions;
          Playwright executes only validated steps on safe synthetic benchmarks.
        </p>
      </section>

      {publicDemo ? (
        <section className="rounded-2xl border border-highlight/40 bg-highlight/10 p-4 text-sm text-secondary-text" role="note">
          <strong className="text-primary-text">Public live AI demo.</strong> Each Nebius run consumes private credits, so daily and per-visitor limits apply. Runs are performed only on controlled benchmark pages; no external website auditing is offered. Evidence and findings describe synthetic tests, not proven legal violations.
        </section>
      ) : null}

      <ScenarioLauncher initialScenarios={scenarios} publicDemo={publicDemo} />

      <section aria-labelledby="evidence-heading" className="space-y-4">
        <h2 id="evidence-heading" className="text-xl font-semibold">
          From action to evidence
        </h2>
        <p className="max-w-3xl text-sm text-secondary-text">
          Inspect the recorded action, the AI proposal, its validation outcome,
          and the real browser screenshot behind each measurable finding.
        </p>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Matched journeys",
              description:
                "Each opposing goal starts from equivalent controlled state.",
            },
            {
              number: "02",
              title: "Observed actions",
              description:
                "Ordered events and screenshots document what the browser actually did.",
            },
            {
              number: "03",
              title: "Inspectable findings",
              description:
                "Measured differences stay separate from model-reported explanations.",
            },
          ].map((item) => (
            <li
              key={item.number}
              className="rounded-2xl border border-white/10 bg-surface p-5"
            >
              <span className="font-mono text-sm text-journey-a">
                {item.number}
              </span>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-secondary-text">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
