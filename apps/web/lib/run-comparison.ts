import {
  buildJourneyPlan,
  getScenario,
  newJourneyId,
  type JourneyRecord,
} from "@choicemirror/contracts";
import {
  createPlaywrightOpenJourney,
  limits,
  runJourney,
} from "@choicemirror/browser-runner";

import { getStore } from "./comparison-store";

let activeRunId: string | null = null;

export function benchmarkOrigin(): string {
  const configured = process.env.BENCHMARK_ORIGIN;
  const raw =
    configured !== undefined && configured.trim().length > 0
      ? configured
      : "http://localhost:3001";
  // Normalize to a bare origin: a trailing slash or path in the env value
  // would otherwise never match `url.origin` in the allowlist check and
  // would produce a double slash in the navigate URL.
  return new URL(raw).origin;
}

export function hasActiveRun(): boolean {
  return activeRunId !== null;
}

export function activeComparisonId(): string | null {
  return activeRunId;
}

/**
 * Atomically claims the single-flight slot for `comparisonId`. The
 * check-and-set is synchronous, so callers must invoke it directly (with no
 * intervening `await`) — that is what makes two interleaved start requests
 * unable to both succeed.
 */
export function tryReserveRun(comparisonId: string): boolean {
  if (activeRunId !== null) {
    return false;
  }
  activeRunId = comparisonId;
  return true;
}

/** Releases the slot only if it is still held by `comparisonId`. */
export function releaseRun(comparisonId: string): void {
  if (activeRunId === comparisonId) {
    activeRunId = null;
  }
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Runs both opposing goals of a comparison sequentially and persists each
 * journey as soon as it finishes, so a mid-run failure still leaves honest,
 * partial evidence. Fire-and-forget from the API route: never rejects.
 */
export async function startComparisonRun(comparisonId: string): Promise<void> {
  if (activeRunId !== null && activeRunId !== comparisonId) {
    // Another comparison owns the runner; leave an honest failed record.
    const store = getStore();
    const existing = await store.getComparison(comparisonId);
    if (existing) {
      await store.saveComparison({
        ...existing,
        status: "failed",
        completedAt: now(),
        error: "A comparison is already running.",
      });
    }
    return;
  }

  // The API route reserves the slot synchronously before its first await;
  // acquiring here too keeps direct callers (tests, future entry points)
  // correct. Re-assigning the already-reserved id is a no-op.
  activeRunId = comparisonId;

  try {
    const store = getStore();
    const record = await store.getComparison(comparisonId);
    if (!record) {
      return;
    }

    const scenario = getScenario(record.scenarioId);
    if (!scenario) {
      await store.saveComparison({
        ...record,
        status: "failed",
        completedAt: now(),
        error: `Unknown scenario "${record.scenarioId}".`,
      });
      return;
    }

    const origin = benchmarkOrigin();
    for (const goalId of record.goalIds) {
      const plan = buildJourneyPlan(scenario, goalId);
      if (!plan) {
        throw new Error(`No journey plan for goal "${goalId}".`);
      }

      const result = await runJourney({
        comparisonId,
        plan,
        origin,
        seed: record.seed,
        openJourney: createPlaywrightOpenJourney({ origin }),
      });

      for (const screenshot of result.screenshots) {
        await store.saveScreenshot(
          comparisonId,
          screenshot.id,
          screenshot.bytes,
        );
      }

      const journey: JourneyRecord = {
        id: newJourneyId(comparisonId, goalId),
        comparisonId,
        goalId,
        status: result.status,
        seed: record.seed,
        origin,
        viewport: limits.VIEWPORT,
        expectedActionCount: plan.expectedActionCount,
        actionCount: result.actionCount,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        events: result.events,
        screenshots: result.screenshots.map((shot) => ({
          id: shot.id,
          label: shot.label,
        })),
        ...(result.error !== undefined ? { error: result.error } : {}),
      };
      await store.saveJourney(journey);
    }

    await store.saveComparison({
      ...record,
      status: "completed",
      completedAt: now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const store = getStore();
      const current = await store.getComparison(comparisonId);
      if (current) {
        await store.saveComparison({
          ...current,
          status: "failed",
          completedAt: now(),
          error: message,
        });
      }
    } catch {
      // Best effort: the runner must never throw at its caller.
    }
  } finally {
    releaseRun(comparisonId);
  }
}
