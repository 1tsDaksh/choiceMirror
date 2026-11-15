import type { JourneyRecord } from "@choicemirror/contracts";

type JourneyPanelProps = {
  journey: JourneyRecord | undefined;
  goalIndex: 0 | 1;
};

const statusBadges: Record<
  JourneyRecord["status"],
  { label: string; className: string }
> = {
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  failed: { label: "Failed", className: "bg-error/15 text-error" },
  timeout: { label: "Timed out", className: "bg-warning/15 text-warning" },
  blocked: { label: "Blocked", className: "bg-warning/15 text-warning" },
};

const waitingBadge = {
  label: "Waiting",
  className: "bg-white/10 text-secondary-text",
};

export function JourneyPanel({ journey, goalIndex }: JourneyPanelProps) {
  const goalLetter = goalIndex === 0 ? "A" : "B";
  const accentClass = goalIndex === 0 ? "text-journey-a" : "text-journey-b";
  const borderClass =
    goalIndex === 0 ? "border-journey-a/50" : "border-journey-b/50";
  const badge = journey ? statusBadges[journey.status] : waitingBadge;
  const events = journey
    ? [...journey.events].sort((left, right) => left.stepNo - right.stepNo)
    : [];

  return (
    <section
      aria-label={`Goal ${goalLetter} journey`}
      className={`rounded-2xl border bg-surface p-4 sm:p-5 ${borderClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`font-mono text-xs ${accentClass}`}>
            Goal {goalLetter}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {journey?.goalId ?? "Not run yet"}
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {journey ? (
        <p className="mt-3 font-mono text-sm text-primary-text">
          {journey.actionCount} / {journey.expectedActionCount} actions
        </p>
      ) : (
        <p className="mt-3 text-sm text-secondary-text">
          Waiting for this goal to run.
        </p>
      )}

      {events.length > 0 ? (
        <div className="mt-4">
          <p className="font-mono text-xs uppercase tracking-widest text-secondary-text">
            Ordered events
          </p>
          <ol className="mt-2 space-y-2">
            {events.map((event) => (
              <li
                key={event.stepNo}
                className="rounded-lg border border-white/10 bg-elevated p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-secondary-text">
                    step {event.stepNo}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        event.countsAsAction
                          ? "bg-highlight/15 text-highlight"
                          : "bg-white/10 text-secondary-text"
                      }`}
                    >
                      {event.countsAsAction ? "action" : "step"}
                    </span>
                    <span
                      className={
                        event.outcome === "success"
                          ? "text-success"
                          : "text-error"
                      }
                    >
                      {event.outcome}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-sm">{event.label}</p>
                {event.detail ? (
                  <p className="mt-1 text-xs text-secondary-text">
                    {event.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {journey && journey.screenshots.length > 0 ? (
        <div className="mt-4">
          <p className="font-mono text-xs uppercase tracking-widest text-secondary-text">
            Screenshots
          </p>
          <div className="mt-2 space-y-3">
            {journey.screenshots.map((screenshot) => (
              <figure key={screenshot.id} className="space-y-1">
                {/* Evidence PNGs come from our own artifact route; next/image
                    would need unoptimized-loader config for no gain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/comparisons/${journey.comparisonId}/artifacts/${screenshot.id}`}
                  alt={`Screenshot: ${screenshot.label}`}
                  loading="lazy"
                  className="w-full rounded-lg border border-white/10"
                />
                <figcaption className="text-xs text-secondary-text">
                  {screenshot.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {journey?.error ? (
        <div className="mt-4 rounded-xl border border-error/40 bg-error/5 p-3">
          <p className="text-sm font-semibold text-error">Journey error</p>
          <p className="mt-1 text-sm text-secondary-text">{journey.error}</p>
        </div>
      ) : null}
    </section>
  );
}
