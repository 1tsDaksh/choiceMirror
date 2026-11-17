import type { ComparisonDetail as ComparisonDetailData } from "@choicemirror/contracts";
import type { ComparisonReport } from "@choicemirror/metrics";

import { JourneyTimeline } from "@/components/journey-timeline";
import type { EventSelection } from "@/lib/selection";

type MirroredJourneysProps = {
  detail: ComparisonDetailData;
  report: ComparisonReport;
  selection: EventSelection | null;
  onSelect: (selection: EventSelection) => void;
};

export function MirroredJourneys({
  detail,
  report,
  selection,
  onSelect,
}: MirroredJourneysProps) {
  // Match stored journeys to goals by id, never by array position: storage
  // ordering is an implementation detail of the file-backed store.
  const goalJourneys = detail.comparison.goalIds.map((goalId) =>
    detail.journeys.find((journey) => journey.goalId === goalId),
  );
  const [slotA, slotB] = report.metrics.journeys;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <JourneyTimeline
        journey={goalJourneys[0]}
        metrics={slotA}
        goalIndex={0}
        selectedStepNo={
          selection && selection.journeyIndex === 0 ? selection.stepNo : null
        }
        onSelectEvent={onSelect}
      />
      <JourneyTimeline
        journey={goalJourneys[1]}
        metrics={slotB}
        goalIndex={1}
        selectedStepNo={
          selection && selection.journeyIndex === 1 ? selection.stepNo : null
        }
        onSelectEvent={onSelect}
      />
    </div>
  );
}
