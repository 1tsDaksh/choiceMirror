import { scenarios } from "@choicemirror/contracts";

import { ScenarioLauncher } from "@/components/scenario-launcher";

export default function HomePage() {
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
          ChoiceMirror is designed to run opposing user journeys under matched
          conditions and link every reported difference to inspectable
          evidence. Phase 1 shipped the foundation; Phase 2 runs both sides of
          each choice and records the evidence.
        </p>
      </section>

      <ScenarioLauncher initialScenarios={scenarios} />

      <section aria-labelledby="evidence-heading" className="space-y-4">
        <h2 id="evidence-heading" className="text-xl font-semibold">
          From action to evidence
        </h2>
        <p className="max-w-3xl text-sm text-secondary-text">
          Comparisons now execute locally with the deterministic browser
          runner; metrics and explanations arrive in later phases.
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
                "Ordered events and screenshots will replace unsupported verdicts.",
            },
            {
              number: "03",
              title: "Inspectable findings",
              description:
                "Metrics will stay separate from cautious, source-linked claims.",
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
