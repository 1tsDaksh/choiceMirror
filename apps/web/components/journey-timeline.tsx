import type { JourneyRecord, TraceEvent } from "@choicemirror/contracts";
import type { JourneyMetrics } from "@choicemirror/metrics";

import {
  outcomeClass,
  statusBadges,
  validationBadges,
  waitingBadge,
} from "@/components/evidence-badges";
import {
  selectEvent,
  selectScreenshot,
  type EventSelection,
} from "@/lib/selection";

type JourneyTimelineProps = {
  journey: JourneyRecord | undefined;
  metrics: JourneyMetrics;
  goalIndex: 0 | 1;
  selectedStepNo: number | null;
  onSelectEvent: (selection: EventSelection) => void;
};

function metaLine(
  journey: JourneyRecord | undefined,
  metrics: JourneyMetrics,
): string {
  const parts: string[] = [];
  if (metrics.actionCount === null) {
    parts.push("Not available");
  } else {
    parts.push(
      `${metrics.actionCount} recorded action${metrics.actionCount === 1 ? "" : "s"}`,
    );
  }
  if (metrics.navigationEventCount !== null) {
    parts.push(
      `${metrics.navigationEventCount} navigation event${metrics.navigationEventCount === 1 ? "" : "s"}`,
    );
  }
  if (metrics.durationMs !== null) {
    parts.push(`${(metrics.durationMs / 1000).toFixed(1)}s`);
  }
  if (journey) {
    parts.push(`fixture expects ${journey.expectedActionCount}`);
  }
  return parts.join(" · ");
}

export function JourneyTimeline({
  journey,
  metrics,
  goalIndex,
  selectedStepNo,
  onSelectEvent,
}: JourneyTimelineProps) {
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

      <p className="mt-3 font-mono text-sm text-primary-text">
        {metaLine(journey, metrics)}
      </p>
      {journey ? null : (
        <p className="mt-2 text-sm text-secondary-text">
          Waiting for this goal to run.
        </p>
      )}

      {journey?.ai ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-elevated p-3">
          <p className="font-mono text-xs uppercase tracking-widest text-highlight">
            AI decisions (model-reported)
          </p>
          <p className="mt-2 text-xs text-secondary-text">
            Model statements are recorded as reported, not independently
            verified.
          </p>
          <p className="mt-2 text-sm">
            {`${journey.ai.provider} · ${journey.ai.model} · prompt ${journey.ai.promptVersion}`}
          </p>
          <p className="mt-1 text-sm text-secondary-text">
            {`${journey.ai.inferenceCalls} inference calls · ${journey.ai.inputTokens} input / ${journey.ai.outputTokens} output tokens · ${journey.ai.rejectedProposals} rejected proposals`}
          </p>
          {journey.ai.modelErrors.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {journey.ai.modelErrors.map((modelError, index) => (
                <li
                  key={`${modelError.kind}-${index}`}
                  className="text-xs text-error"
                >
                  {`${modelError.kind}: ${modelError.message}`}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <p className="font-mono text-xs uppercase tracking-widest text-secondary-text">
          Recorded steps
        </p>
        {events.length > 0 ? (
          <ol className="mt-2 space-y-2">
            {events.map((event: TraceEvent) => (
              <li key={event.stepNo}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(selectEvent(goalIndex, event))}
                  aria-current={
                    selectedStepNo === event.stepNo ? "true" : undefined
                  }
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedStepNo === event.stepNo
                      ? "border-highlight/60 bg-highlight/5"
                      : "border-white/10 bg-elevated hover:border-highlight/40"
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
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
                      <span className={outcomeClass(event.outcome)}>
                        {event.outcome}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block text-sm">{event.label}</span>
                  {event.ai ? (
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">
                        {`proposed: ${event.ai.proposed.action}${
                          event.ai.proposed.action === "click"
                            ? ` · ${event.ai.proposed.targetId}`
                            : ""
                        }`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${validationBadges[event.ai.validation].className}`}
                      >
                        {event.ai.validation}
                      </span>
                    </span>
                  ) : null}
                  {event.detail ? (
                    <span className="mt-1 block text-xs text-secondary-text">
                      {event.detail}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-secondary-text">
            No events recorded yet.
          </p>
        )}
      </div>

      {journey && journey.screenshots.length > 0 ? (
        <div className="mt-4">
          <p className="font-mono text-xs uppercase tracking-widest text-secondary-text">
            Screenshot checkpoints
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {journey.screenshots.map((screenshot) => (
              <button
                key={screenshot.id}
                type="button"
                onClick={() =>
                  onSelectEvent(selectScreenshot(goalIndex, screenshot.id))
                }
                className="overflow-hidden rounded-lg border border-white/10 text-left hover:border-highlight/40"
              >
                {/* Evidence PNGs come from our own artifact route; next/image
                    would need unoptimized-loader config for no gain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/comparisons/${journey.comparisonId}/artifacts/${screenshot.id}`}
                  alt={`Screenshot: ${screenshot.label}`}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
                <span className="block px-2 py-1 text-xs text-secondary-text">
                  {screenshot.label}
                </span>
              </button>
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
