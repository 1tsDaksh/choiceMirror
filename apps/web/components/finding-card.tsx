import type { Finding } from "@choicemirror/metrics";

type FindingCardProps = {
  finding: Finding;
  onInspectEvidence?: () => void;
};

const categoryAppearance: Record<
  Finding["category"],
  { label: string; chipClass: string }
> = {
  "action-asymmetry": {
    label: "Observed asymmetry",
    chipClass: "border-highlight/40 bg-highlight/10 text-highlight",
  },
  "balanced-actions": {
    label: "Balanced",
    chipClass: "border-success/40 bg-success/10 text-success",
  },
  inconclusive: {
    label: "Inconclusive",
    chipClass: "border-warning/40 bg-warning/10 text-warning",
  },
};

const qualityLabels: Record<Finding["quality"], string> = {
  "evidence-complete": "Evidence complete",
  "evidence-partial": "Evidence partial",
  "insufficient-evidence": "Insufficient evidence",
};

function evidenceChipLabel(entry: Finding["evidence"][number], index: number): string {
  const goalLetter = index === 0 ? "Goal A" : "Goal B";
  return `${goalLetter} · steps ${entry.stepNos.join(",")}`;
}

function MicroSection({
  label,
  items,
  single = false,
}: {
  label: string;
  items: string[];
  single?: boolean;
}) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-widest text-secondary-text">
        {label}
      </h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-secondary-text">Not available</p>
      ) : single ? (
        <p className="mt-1 text-sm text-primary-text">{items[0]}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-primary-text">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FindingCard({
  finding,
  onInspectEvidence,
}: FindingCardProps) {
  const category = categoryAppearance[finding.category];

  return (
    <section
      aria-label="Main finding"
      className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${category.chipClass}`}
        >
          {category.label}
        </span>
        <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-secondary-text">
          {qualityLabels[finding.quality]}
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-bold text-primary-text">
        {finding.title}
      </h2>
      <p className="mt-2 text-sm text-secondary-text">{finding.explanation}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MicroSection label="Observed" items={finding.observed} />
        <MicroSection label="Calculated" items={finding.calculated} />
        <div className="sm:col-span-2">
          <MicroSection
            label="Interpreted"
            items={[finding.interpreted]}
            single
          />
        </div>
      </div>

      {finding.evidence.length > 0 ? (
        <div className="mt-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-secondary-text">
            Supporting evidence
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {finding.evidence.map((entry, index) => (
              <span
                key={entry.journeyId}
                className={`inline-block rounded-full border px-2.5 py-1 font-mono text-xs ${
                  index === 0
                    ? "border-journey-a/40 text-journey-a"
                    : "border-journey-b/40 text-journey-b"
                }`}
              >
                {evidenceChipLabel(entry, index)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <details className="mt-4 rounded-xl border border-white/10 bg-elevated p-3">
        <summary className="cursor-pointer text-sm font-semibold text-secondary-text">
          Limitations
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-secondary-text">
          {finding.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>

      {onInspectEvidence ? (
        <button
          type="button"
          onClick={onInspectEvidence}
          className="mt-4 min-h-11 rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
        >
          Inspect supporting evidence
        </button>
      ) : null}
    </section>
  );
}
