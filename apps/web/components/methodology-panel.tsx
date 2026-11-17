import type { ReactNode } from "react";

type MethodologySectionProps = {
  heading: string;
  children: ReactNode;
};

function MethodologySection({ heading, children }: MethodologySectionProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-primary-text">{heading}</h3>
      <div className="mt-1 space-y-1 text-sm text-secondary-text">
        {children}
      </div>
    </section>
  );
}

/**
 * Static explanation of how the dashboard measures things (spec §5F).
 * Deliberately data-free: the copy never depends on a specific run.
 */
export function MethodologyPanel() {
  return (
    <details className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-semibold text-secondary-text">
        How these measurements work
      </summary>

      <div className="mt-4 space-y-4">
        <MethodologySection heading="Controlled benchmark scope">
          <p>
            Every comparison runs against the local ChoiceMirror benchmark
            pages inside a controlled browser: fixed viewport, fixed seeds,
            matched starting state, and no external sites. Results describe
            this fixture under these conditions only.
          </p>
        </MethodologySection>

        <MethodologySection heading="How actions are counted">
          <p>
            An action is a recorded click event whose countsAsAction flag is
            true and whose outcome is success. The runner never counts goal
            selection as an action — it is kept as evidence, not as work the
            user did. Fixture expectations such as &quot;3 actions&quot;
            validate that the runner executed the plan; they are validation,
            not measurement.
          </p>
        </MethodologySection>

        <MethodologySection heading="Observed, calculated, interpreted">
          <p>
            Observed values come directly from stored evidence: event counts,
            outcomes, timestamps, and screenshots. Calculated values are
            derived from those observations with the documented formulas —
            the action difference and the action ratio — and appear only when
            both journeys completed under matching conditions; otherwise the
            comparison is inconclusive. Interpreted statements explain what
            the numbers suggest; they are a reading of the evidence, never
            new measurements.
          </p>
        </MethodologySection>

        <MethodologySection heading="The action ratio">
          <p>
            The action ratio smooths small counts with a pseudocount:
            (max+1)/(min+1), where max and min are the two completed
            journeys&apos; action counts. Worked example: a journey with 3
            actions against one with 1 action gives (3+1)/(1+1) = 2.
          </p>
        </MethodologySection>

        <MethodologySection heading="What these numbers do not show">
          <p>
            Each comparison is a single run: it captures no backtracking,
            hesitation, or interrupted attempts, and it does not measure
            intent. Action differences are descriptive measurements, not proof
            of unlawful or intentional manipulation.
          </p>
        </MethodologySection>

        <MethodologySection heading="AI navigation vs interface friction">
          <p>
            AI mode records execution metadata — model latency, token usage,
            and inference calls — which describes model activity, not a measure
            of interface friction. Friction statements in this dashboard come
            only from recorded actions and outcomes in the mirrored journeys.
          </p>
        </MethodologySection>
      </div>
    </details>
  );
}
