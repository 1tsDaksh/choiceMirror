"use client";

import { useEffect, useRef, useState } from "react";

import type {
  ComparisonDetail as ComparisonDetailData,
  Scenario,
} from "@choicemirror/contracts";
import { buildComparisonReport } from "@choicemirror/metrics";
import type { JourneyMetrics } from "@choicemirror/metrics";

import { ComparisonState } from "@/components/comparison-state";
import { ComparisonSummary } from "@/components/comparison-summary";
import { EvidenceInspector } from "@/components/evidence-inspector";
import { FindingCard } from "@/components/finding-card";
import { MethodologyPanel } from "@/components/methodology-panel";
import { MetricCard } from "@/components/metric-card";
import { MirroredJourneys } from "@/components/mirrored-journeys";
import { selectEvent, type EventSelection } from "@/lib/selection";

type ComparisonDetailProps = {
  initial: ComparisonDetailData;
  scenario: Scenario;
};

type ComparisonStatus = ComparisonDetailData["comparison"]["status"];

const statusAppearance: Record<
  ComparisonStatus,
  { label: string; className: string; message: string }
> = {
  running: {
    label: "Running",
    className: "border-highlight/40 bg-highlight/5 text-highlight",
    message:
      "Both goals are being executed. This page updates as evidence is captured.",
  },
  completed: {
    label: "Completed",
    className: "border-success/40 bg-success/10 text-success",
    message: "Both goals finished; the stored evidence below is complete.",
  },
  failed: {
    label: "Failed",
    className: "border-error/40 bg-error/5 text-error",
    message:
      "This run stopped before both goals finished. The error is shown below.",
  },
};

const outcomeLabels: Record<JourneyMetrics["outcome"], string> = {
  completed: "Completed",
  failed: "Failed",
  blocked: "Blocked",
  "timed-out": "Timed out",
  pending: "Pending",
};

const POLL_INTERVAL_MS = 750;

export function ComparisonDetail({ initial, scenario }: ComparisonDetailProps) {
  const [detail, setDetail] = useState<ComparisonDetailData>(initial);
  const [statusFailed, setStatusFailed] = useState(false);
  const [selection, setSelection] = useState<EventSelection | null>(null);
  const inspectorRef = useRef<HTMLHeadingElement>(null);
  const requestSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);

  const { id, status, error, completedAt } = detail.comparison;

  // Evidence selections are only meaningful within one comparison: a new run
  // (new id) must never keep a stale step highlighted. Adjusted during render
  // (React's derived-state pattern) rather than in an effect to avoid a
  // cascading render.
  const [selectionForId, setSelectionForId] = useState(id);
  if (selectionForId !== id) {
    setSelectionForId(id);
    setSelection(null);
  }

  useEffect(() => {
    if (statusFailed || status !== "running") {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const seq = ++requestSeqRef.current;
      try {
        const response = await fetch(`/api/comparisons/${id}`);
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        // The API route validates payloads against comparisonDetailSchema
        // before serving them, so the client only needs the typed shape.
        const payload = (await response.json()) as ComparisonDetailData;
        // Drop out-of-order responses: a stale "running" snapshot must never
        // overwrite a newer terminal one.
        if (cancelled || seq <= appliedSeqRef.current) {
          return;
        }
        appliedSeqRef.current = seq;
        setDetail(payload);
      } catch {
        if (!cancelled) {
          setStatusFailed(true);
        }
      }
    };

    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, status, statusFailed]);

  if (statusFailed && status === "running") {
    return (
      <ComparisonState
        kind="error"
        title="Comparison status unavailable"
        description="The latest run status could not be loaded."
        action={
          <button
            type="button"
            onClick={() => setStatusFailed(false)}
            className="min-h-11 rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
          >
            Try again
          </button>
        }
      />
    );
  }

  const appearance = statusAppearance[status];
  // Absent mode = legacy Phase 2 record: displayed as deterministic.
  const mode = detail.comparison.mode ?? "deterministic";
  const aiModel = detail.journeys.find((journey) => journey.ai !== undefined)
    ?.ai?.model;
  const modeLabel =
    mode === "ai"
      ? aiModel !== undefined
        ? `Mode: AI · ${aiModel}`
        : "Mode: AI"
      : "Mode: Deterministic";
  const report = buildComparisonReport(detail);
  const finding = report.findings[0];
  const metrics = report.metrics;
  const [slotA, slotB] = metrics.journeys;
  const hasAi = slotA.ai !== null || slotB.ai !== null;
  const inferenceCalls =
    (slotA.ai?.inferenceCalls ?? 0) + (slotB.ai?.inferenceCalls ?? 0);
  const inputTokens =
    (slotA.ai?.inputTokens ?? 0) + (slotB.ai?.inputTokens ?? 0);
  const outputTokens =
    (slotA.ai?.outputTokens ?? 0) + (slotB.ai?.outputTokens ?? 0);
  const rejectedProposals =
    (slotA.ai?.rejectedProposals ?? 0) + (slotB.ai?.rejectedProposals ?? 0);

  // "Inspect supporting evidence" jumps to the first counted action of the
  // heavier side (fallback: first counted action in goal order), then moves
  // focus to the inspector heading.
  const handleInspectEvidence = () => {
    const goalJourneys = detail.comparison.goalIds.map((goalId) =>
      detail.journeys.find((journey) => journey.goalId === goalId),
    );
    const order: readonly (0 | 1)[] =
      metrics.heavierJourney === "b" ? ([1, 0] as const) : ([0, 1] as const);
    let picked: EventSelection | null = null;
    for (const index of order) {
      const journey = goalJourneys[index];
      if (!journey) {
        continue;
      }
      const action = [...journey.events]
        .sort((left, right) => left.stepNo - right.stepNo)
        .find((event) => event.countsAsAction);
      if (action) {
        picked = selectEvent(index, action);
        break;
      }
    }
    setSelection(picked);
    requestAnimationFrame(() => inspectorRef.current?.focus());
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <ComparisonSummary
          scenario={scenario}
          comparison={detail.comparison}
          report={report}
          modeLabel={modeLabel}
          modeIsAi={mode === "ai"}
        />
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 ${appearance.className}`}
        >
          <p className="font-semibold">{appearance.label}</p>
          <p className="mt-1 text-sm">{appearance.message}</p>
          {error ? <p className="mt-1 text-sm">{error}</p> : null}
          {completedAt ? (
            <p className="mt-1 text-xs text-secondary-text">
              Finished <time dateTime={completedAt}>{completedAt}</time>
            </p>
          ) : null}
        </div>
      </header>

      {report.validation.valid ? null : (
        <p className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm font-medium text-warning">
          Stored evidence failed validation — findings are withheld.
        </p>
      )}

      {finding ? (
        <FindingCard
          finding={finding}
          onInspectEvidence={handleInspectEvidence}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Journey A actions"
          value={slotA.actionCount?.toString() ?? "—"}
          unit="recorded actions"
          definition="Counted successful click events in the trace; goal selection is excluded."
          unavailable={slotA.actionCount === null}
        />
        <MetricCard
          label="Journey B actions"
          value={slotB.actionCount?.toString() ?? "—"}
          unit="recorded actions"
          definition="Counted successful click events in the trace; goal selection is excluded."
          unavailable={slotB.actionCount === null}
        />
        <MetricCard
          label="Action difference"
          value={metrics.actionDifference?.toString() ?? "—"}
          unit="actions"
          definition="Absolute difference between the two completed journeys; unavailable until both complete."
          unavailable={metrics.actionDifference === null}
        />
        <MetricCard
          label="Completion outcomes"
          value={`${outcomeLabels[slotA.outcome]} / ${outcomeLabels[slotB.outcome]}`}
          definition="Actual stored journey outcomes; a completed comparison can still contain a failed journey."
        />
        {hasAi ? (
          <MetricCard
            label="Execution metadata"
            value={`${inferenceCalls} inference calls`}
            unit={`${inputTokens} input / ${outputTokens} output tokens · ${rejectedProposals} rejected${aiModel !== undefined ? ` · ${aiModel}` : ""}`}
            definition="Model activity recorded for this run — execution cost, not a measure of interface friction."
          />
        ) : null}
      </div>

      <MirroredJourneys
        detail={detail}
        report={report}
        selection={selection}
        onSelect={setSelection}
      />

      <EvidenceInspector
        detail={detail}
        selection={selection}
        onChange={setSelection}
        inspectorRef={inspectorRef}
      />

      <MethodologyPanel />
    </div>
  );
}
