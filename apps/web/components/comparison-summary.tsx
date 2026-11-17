import type { ComparisonRecord, Scenario } from "@choicemirror/contracts";
import type { ComparisonReport } from "@choicemirror/metrics";

type ComparisonSummaryProps = {
  scenario: Scenario;
  comparison: ComparisonRecord;
  report: ComparisonReport;
  /** Pre-computed mode label; the model name lives in raw journey evidence. */
  modeLabel: string;
  modeIsAi: boolean;
};

export function ComparisonSummary({
  scenario,
  comparison,
  report,
  modeLabel,
  modeIsAi,
}: ComparisonSummaryProps) {
  const [goalA, goalB] = scenario.goals;
  const goalsLine =
    goalA && goalB
      ? `${goalA.description} vs ${goalB.description}`
      : scenario.description;

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-widest text-journey-a">
        Comparison evidence
      </p>
      <h1 className="text-3xl font-bold text-primary-text">{scenario.title}</h1>
      <p className="text-sm text-secondary-text">{goalsLine}</p>
      <p>
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
            modeIsAi ? "bg-highlight/15 text-highlight" : "bg-white/10 text-secondary-text"
          }`}
        >
          {modeLabel}
        </span>
      </p>
      <p className="font-mono text-xs text-secondary-text">
        Run {comparison.id} · seed {comparison.seed} · created{" "}
        {comparison.createdAt}
        {report.validation.valid ? null : " · evidence degraded"}
      </p>
    </div>
  );
}
