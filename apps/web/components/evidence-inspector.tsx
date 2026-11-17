import type { RefObject } from "react";

import type {
  ComparisonDetail as ComparisonDetailData,
  TraceEvent,
} from "@choicemirror/contracts";

import { ComparisonState } from "@/components/comparison-state";
import {
  outcomeClass,
  usageLine,
  validationBadges,
} from "@/components/evidence-badges";
import {
  resolveSelection,
  selectEvent,
  type EventSelection,
} from "@/lib/selection";

type EvidenceInspectorProps = {
  detail: ComparisonDetailData;
  selection: EventSelection | null;
  onChange: (selection: EventSelection) => void;
  /** Heading ref so "Inspect supporting evidence" can move focus here. */
  inspectorRef?: RefObject<HTMLHeadingElement | null>;
};

function sortedEvents(
  events: readonly TraceEvent[],
): TraceEvent[] {
  return [...events].sort((left, right) => left.stepNo - right.stepNo);
}

export function EvidenceInspector({
  detail,
  selection,
  onChange,
  inspectorRef,
}: EvidenceInspectorProps) {
  // Match stored journeys to goals by id, never by array position.
  const goalJourneys = detail.comparison.goalIds.map((goalId) =>
    detail.journeys.find((journey) => journey.goalId === goalId),
  );
  const resolved = selection
    ? resolveSelection(goalJourneys, selection)
    : null;

  if (!selection || !resolved) {
    return (
      <section aria-label="Evidence inspector">
        <ComparisonState
          kind="empty"
          level={2}
          title="Evidence inspector"
          description="Select a recorded step to inspect its evidence."
        />
      </section>
    );
  }

  const { journey, event, screenshotId } = resolved;
  const goalLetter = selection.journeyIndex === 0 ? "Goal A" : "Goal B";
  const events = sortedEvents(journey.events);
  const eventIndex =
    event !== null
      ? events.findIndex((candidate) => candidate.stepNo === event.stepNo)
      : -1;
  const previousEvent = eventIndex > 0 ? events[eventIndex - 1] : null;
  const nextEvent =
    eventIndex >= 0 && eventIndex < events.length - 1
      ? events[eventIndex + 1]
      : null;
  const screenshot = screenshotId
    ? journey.screenshots.find((candidate) => candidate.id === screenshotId)
    : undefined;
  const announcement = event
    ? `Step ${event.stepNo}: ${event.label}`
    : `Screenshot: ${screenshot?.label ?? screenshotId ?? "evidence"}`;

  return (
    <section
      aria-label="Evidence inspector"
      className="space-y-4 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5"
    >
      <h2
        ref={inspectorRef}
        tabIndex={-1}
        className="text-xl font-semibold text-primary-text"
      >
        Evidence inspector
      </h2>

      <div aria-live="polite" className="space-y-4">
        <p className="font-mono text-sm text-secondary-text">{announcement}</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            {screenshotId ? (
              <figure>
                {/* Evidence PNGs come from our own artifact route; next/image
                    would need unoptimized-loader config for no gain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/comparisons/${journey.comparisonId}/artifacts/${screenshotId}`}
                  alt={screenshot?.label ?? "Evidence screenshot"}
                  className="aspect-video w-full rounded-xl border border-white/10 object-cover"
                />
                <figcaption className="mt-1 text-xs text-secondary-text">
                  {screenshot?.label ?? screenshotId}
                </figcaption>
              </figure>
            ) : (
              <p className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm text-secondary-text">
                No screenshot recorded for this step.
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <p
              className={`font-mono ${
                selection.journeyIndex === 0
                  ? "text-journey-a"
                  : "text-journey-b"
              }`}
            >
              {`${goalLetter} · ${journey.goalId}`}
            </p>
            <p>{event ? `Step ${event.stepNo}` : "Screenshot only"}</p>
            {event ? (
              <>
                <p>
                  <time dateTime={event.timestamp}>{event.timestamp}</time>
                </p>
                <p>{event.label}</p>
                <p className={outcomeClass(event.outcome)}>{event.outcome}</p>
                <p>{`Counted as an action: ${event.countsAsAction ? "Yes" : "No"}`}</p>
                {event.detail ? (
                  <p className="text-secondary-text">{event.detail}</p>
                ) : null}
              </>
            ) : null}

            {event?.ai ? (
              <div className="space-y-1 rounded-xl border border-white/10 bg-elevated p-3">
                <p className="font-mono text-xs uppercase tracking-widest text-highlight">
                  Model-reported justification (not verified)
                </p>
                <p className="font-mono text-xs">
                  {`proposed: ${event.ai.proposed.action}${
                    event.ai.proposed.action === "click" &&
                    event.ai.proposed.targetId !== undefined
                      ? ` · ${event.ai.proposed.targetId}`
                      : ""
                  }`}
                </p>
                <p>
                  <span
                    className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${validationBadges[event.ai.validation].className}`}
                  >
                    {event.ai.validation}
                  </span>
                </p>
                <p className="text-secondary-text">{event.ai.proposed.reason}</p>
                <p className="text-secondary-text">
                  {`${event.ai.model} · prompt ${event.ai.promptVersion}`}
                </p>
                {usageLine(event.ai) !== null ? (
                  <p className="font-mono text-xs text-secondary-text">
                    {usageLine(event.ai)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={previousEvent === null}
            onClick={() => {
              if (previousEvent) {
                onChange(selectEvent(selection.journeyIndex, previousEvent));
              }
            }}
            className="min-h-11 rounded-xl border border-white/10 bg-elevated px-4 font-semibold text-primary-text enabled:hover:border-highlight/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous step
          </button>
          <button
            type="button"
            disabled={nextEvent === null}
            onClick={() => {
              if (nextEvent) {
                onChange(selectEvent(selection.journeyIndex, nextEvent));
              }
            }}
            className="min-h-11 rounded-xl border border-white/10 bg-elevated px-4 font-semibold text-primary-text enabled:hover:border-highlight/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next step
          </button>
        </div>
      </div>
    </section>
  );
}
