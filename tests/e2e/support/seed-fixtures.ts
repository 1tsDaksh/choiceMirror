import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  comparisonRecordSchema,
  journeyRecordSchema,
  type ComparisonRecord,
  type JourneyRecord,
  type TraceEvent,
} from "@choicemirror/contracts";

/**
 * Minimal valid 1x1 PNG (transparent pixel), base64-decoded when written so
 * seeded screenshot artifacts decode in a real browser.
 */
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const ORIGIN = "http://localhost:3001";
const VIEWPORT = { width: 1280, height: 720 };

type EventSeed = {
  stepNo: number;
  timestamp: string;
  type: TraceEvent["type"];
  label: string;
  countsAsAction?: boolean;
  outcome?: TraceEvent["outcome"];
  screenshotId?: string;
  detail?: string;
};

function traceEvent(seed: EventSeed): TraceEvent {
  return {
    stepNo: seed.stepNo,
    timestamp: seed.timestamp,
    type: seed.type,
    label: seed.label,
    outcome: seed.outcome ?? "success",
    countsAsAction: seed.countsAsAction ?? false,
    ...(seed.screenshotId !== undefined
      ? { screenshotId: seed.screenshotId }
      : {}),
    ...(seed.detail !== undefined ? { detail: seed.detail } : {}),
  };
}

type CompletedJourneySeed = {
  comparisonId: string;
  goalId: JourneyRecord["goalId"];
  seed: string;
  actionLabels: readonly string[];
  startedAt: string;
  completedAt: string;
  /** Phase 2 records predate execution modes; pass false to omit `mode`. */
  includeMode?: boolean;
};

/**
 * A completed journey shaped like real runner output: navigate →
 * goal-selected → one event per counted action → complete, each success
 * event checkpointed with a screenshot the way `runner.ts` does.
 */
function completedJourney(seed: CompletedJourneySeed): JourneyRecord {
  const id = `${seed.comparisonId}-${seed.goalId}`;
  const time = (offsetSeconds: number): string =>
    new Date(Date.parse(seed.startedAt) + offsetSeconds * 1000).toISOString();

  const screenshots: Array<{ id: string; label: string }> = [];
  const attach = (checkpoint: string, label: string): string => {
    const screenshotId = `${id}-${checkpoint}.png`;
    screenshots.push({ id: screenshotId, label });
    return screenshotId;
  };

  const events: TraceEvent[] = [
    traceEvent({
      stepNo: 0,
      timestamp: time(0),
      type: "navigate",
      label: "Open fixture",
      screenshotId: attach("start", "Starting state"),
    }),
    traceEvent({
      stepNo: 1,
      timestamp: time(1),
      type: "goal-selected",
      label: seed.goalId,
      screenshotId: attach("goal", "After goal selection"),
    }),
  ];

  seed.actionLabels.forEach((label, index) => {
    events.push(
      traceEvent({
        stepNo: 2 + index,
        timestamp: time(2 + index),
        type: "click",
        label,
        countsAsAction: true,
        screenshotId: attach(`step-${index + 1}`, `After action ${index + 1}`),
      }),
    );
  });

  events.push(
    traceEvent({
      stepNo: 2 + seed.actionLabels.length,
      timestamp: time(3 + seed.actionLabels.length),
      type: "complete",
      label: "Goal completed",
      screenshotId: attach("complete", "Completed state"),
    }),
  );

  return {
    id,
    comparisonId: seed.comparisonId,
    goalId: seed.goalId,
    status: "completed",
    seed: seed.seed,
    origin: ORIGIN,
    viewport: VIEWPORT,
    expectedActionCount: seed.actionLabels.length,
    actionCount: seed.actionLabels.length,
    startedAt: seed.startedAt,
    completedAt: seed.completedAt,
    events,
    screenshots,
    ...(seed.includeMode === false ? {} : { mode: "deterministic" as const }),
  };
}

/** Goal B of the failed fixture: one counted action, then an error event. */
function failedRejectJourney(): JourneyRecord {
  const comparisonId = "cmp_5eed000000000002";
  const id = `${comparisonId}-reject`;
  const time = (offsetSeconds: number): string =>
    new Date(Date.parse("2026-11-16T10:10:00.000Z") + offsetSeconds * 1000)
      .toISOString();
  const error =
    "The review step stopped responding before the confirmations could finish.";

  return {
    id,
    comparisonId,
    goalId: "reject",
    status: "failed",
    seed: "5eed-fail",
    origin: ORIGIN,
    viewport: VIEWPORT,
    expectedActionCount: 3,
    actionCount: 1,
    startedAt: "2026-11-16T10:10:00.000Z",
    completedAt: "2026-11-16T10:10:04.000Z",
    events: [
      traceEvent({
        stepNo: 0,
        timestamp: time(0),
        type: "navigate",
        label: "Open fixture",
        screenshotId: `${id}-start.png`,
      }),
      traceEvent({
        stepNo: 1,
        timestamp: time(1),
        type: "goal-selected",
        label: "reject",
        screenshotId: `${id}-goal.png`,
      }),
      traceEvent({
        stepNo: 2,
        timestamp: time(2),
        type: "click",
        label: "Review the rejection notice",
        countsAsAction: true,
        screenshotId: `${id}-step-1.png`,
      }),
      traceEvent({
        stepNo: 3,
        timestamp: time(3),
        type: "error",
        label: "Execution stopped",
        outcome: "failure",
        detail: error,
      }),
    ],
    screenshots: [
      { id: `${id}-start.png`, label: "Starting state" },
      { id: `${id}-goal.png`, label: "After goal selection" },
      { id: `${id}-step-1.png`, label: "After action 1" },
    ],
    error,
    mode: "deterministic",
  };
}

type SeedFixture = {
  comparison: ComparisonRecord;
  journeys: JourneyRecord[];
  /** Files written verbatim (unparseable) so the store reads them as missing. */
  corruptJourneyFiles?: Array<{ fileName: string; contents: string }>;
};

const SEED_FIXTURES: SeedFixture[] = [
  {
    // Running: both goals still pending, no journeys recorded yet.
    comparison: {
      id: "cmp_5eed000000000001",
      scenarioId: "consent-asymmetric",
      goalIds: ["accept", "reject"],
      seed: "5eed-run",
      status: "running",
      createdAt: "2026-11-16T10:20:00.000Z",
      mode: "deterministic",
    },
    journeys: [],
  },
  {
    // Partial: goal A completed, goal B failed — never comparable.
    comparison: {
      id: "cmp_5eed000000000002",
      scenarioId: "consent-asymmetric",
      goalIds: ["accept", "reject"],
      seed: "5eed-fail",
      status: "failed",
      createdAt: "2026-11-16T10:10:00.000Z",
      completedAt: "2026-11-16T10:10:05.000Z",
      error: "Journey B (reject) failed before both goals finished.",
      mode: "deterministic",
    },
    journeys: [
      completedJourney({
        comparisonId: "cmp_5eed000000000002",
        goalId: "accept",
        seed: "5eed-fail",
        actionLabels: ["Accept preference"],
        startedAt: "2026-11-16T10:10:00.000Z",
        completedAt: "2026-11-16T10:10:05.000Z",
      }),
      failedRejectJourney(),
    ],
  },
  {
    // Legacy Phase 2 record: no `mode` anywhere, rendered as deterministic.
    comparison: {
      id: "cmp_5eed000000000003",
      scenarioId: "membership-asymmetric",
      goalIds: ["join", "leave"],
      seed: "5eed-legacy",
      status: "completed",
      createdAt: "2026-11-16T09:00:00.000Z",
      completedAt: "2026-11-16T09:00:20.000Z",
    },
    journeys: [
      completedJourney({
        comparisonId: "cmp_5eed000000000003",
        goalId: "join",
        seed: "5eed-legacy",
        actionLabels: ["Join workspace"],
        startedAt: "2026-11-16T09:00:00.000Z",
        completedAt: "2026-11-16T09:00:08.000Z",
        includeMode: false,
      }),
      completedJourney({
        comparisonId: "cmp_5eed000000000003",
        goalId: "leave",
        seed: "5eed-legacy",
        actionLabels: [
          "Review the leaving notice",
          "Confirm the membership choice",
          "Leave workspace",
        ],
        startedAt: "2026-11-16T09:00:00.000Z",
        completedAt: "2026-11-16T09:00:20.000Z",
        includeMode: false,
      }),
    ],
  },
  {
    // Corrupt: the reject journey file is unreadable → treated as missing.
    comparison: {
      id: "cmp_5eed000000000004",
      scenarioId: "consent-asymmetric",
      goalIds: ["accept", "reject"],
      seed: "5eed-corrupt",
      status: "completed",
      createdAt: "2026-11-16T10:30:00.000Z",
      completedAt: "2026-11-16T10:30:05.000Z",
      mode: "deterministic",
    },
    journeys: [
      completedJourney({
        comparisonId: "cmp_5eed000000000004",
        goalId: "accept",
        seed: "5eed-corrupt",
        actionLabels: ["Accept preference"],
        startedAt: "2026-11-16T10:30:00.000Z",
        completedAt: "2026-11-16T10:30:05.000Z",
      }),
    ],
    corruptJourneyFiles: [
      {
        fileName: "cmp_5eed000000000004-reject.json",
        contents: "{not json",
      },
    ],
  },
];

/**
 * Writes the deterministic state fixtures under `rootDir`, validating every
 * record against the contracts schemas before it reaches disk.
 */
export function writeSeedData(rootDir: string): void {
  for (const fixture of SEED_FIXTURES) {
    const comparison = comparisonRecordSchema.parse(fixture.comparison);
    const comparisonDir = path.join(rootDir, "comparisons", comparison.id);
    const journeysDir = path.join(comparisonDir, "journeys");
    const artifactsDir = path.join(comparisonDir, "artifacts");
    mkdirSync(journeysDir, { recursive: true });
    mkdirSync(artifactsDir, { recursive: true });

    writeFileSync(
      path.join(comparisonDir, "record.json"),
      JSON.stringify(comparison, null, 2),
      "utf8",
    );

    for (const journey of fixture.journeys) {
      const parsed = journeyRecordSchema.parse(journey);
      writeFileSync(
        path.join(journeysDir, `${parsed.id}.json`),
        JSON.stringify(parsed, null, 2),
        "utf8",
      );
      for (const screenshot of parsed.screenshots) {
        writeFileSync(path.join(artifactsDir, screenshot.id), MINIMAL_PNG);
      }
    }

    for (const corrupt of fixture.corruptJourneyFiles ?? []) {
      writeFileSync(path.join(journeysDir, corrupt.fileName), corrupt.contents, "utf8");
    }
  }
}
