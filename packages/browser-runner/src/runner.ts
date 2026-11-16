import {
  newArtifactId,
  newJourneyId,
  type JourneyPlan,
  type TraceEvent,
} from "@choicemirror/contracts";

import { isAllowlistedUrl } from "./allowlist";
import { createPlaywrightOpenJourney } from "./driver";
import { BlockedError } from "./errors";
import { limits } from "./limits";
import type { RawPageState } from "./observation";

export type JourneyExecutionResult = {
  status: "completed" | "failed" | "timeout" | "blocked";
  events: TraceEvent[];
  actionCount: number;
  startedAt: string;
  completedAt: string;
  screenshots: { id: string; label: string; bytes: Buffer }[];
  error?: string;
};

export type JourneyDriver = {
  navigate(url: string): Promise<void>;
  selectGoal(goalButtonName: string): Promise<void>;
  clickAction(actionName: string): Promise<void>;
  assertCompleted(expectedCount: number): Promise<void>;
  screenshot(): Promise<Buffer>;
  currentUrl(): Promise<string>;
};

export type OpenJourney = () => Promise<{
  driver: JourneyDriver;
  close(): Promise<void>;
}>;

/**
 * Phase 3: the deterministic journey driver plus observation primitives the
 * AI loop needs. Assignable to JourneyDriver everywhere deterministic code
 * runs, so createPlaywrightOpenJourney can serve both modes.
 */
export type AiJourneyDriver = JourneyDriver & {
  observe(): Promise<RawPageState>;
  clickElement(targetId: string): Promise<void>;
  completionState(): Promise<{ complete: boolean; detail?: string }>;
};

export type OpenAiJourney = () => Promise<{
  driver: AiJourneyDriver;
  close(): Promise<void>;
}>;

export type RunJourneyOptions = {
  comparisonId: string;
  plan: JourneyPlan;
  origin: string;
  seed: string;
  openJourney?: OpenJourney;
  maxActions?: number;
  stepTimeoutMs?: number;
  journeyTimeoutMs?: number;
};

export class ExecutionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ExecutionTimeoutError(`${label} exceeded ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export function classifyError(
  error: unknown,
): "failed" | "timeout" | "blocked" {
  if (error instanceof BlockedError) {
    return "blocked";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "timeout";
  }
  return "failed";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runJourney(
  options: RunJourneyOptions,
): Promise<JourneyExecutionResult> {
  const { comparisonId, plan, origin, seed } = options;
  const maxActions = options.maxActions ?? limits.MAX_ACTIONS;
  const stepTimeoutMs = options.stepTimeoutMs ?? limits.STEP_TIMEOUT_MS;
  const journeyTimeoutMs =
    options.journeyTimeoutMs ?? limits.JOURNEY_TIMEOUT_MS;
  const open = options.openJourney ?? (() => createPlaywrightOpenJourney({ origin })());

  const journeyId = newJourneyId(comparisonId, plan.goalId);
  const startedAt = new Date().toISOString();
  const events: TraceEvent[] = [];
  const screenshots: { id: string; label: string; bytes: Buffer }[] = [];
  let actionCount = 0;
  let status: JourneyExecutionResult["status"] = "failed";
  let error: string | undefined;
  let aborted = false;

  let closeJourney: (() => Promise<void>) | null = null;
  let closed = false;
  const closeOnce = async (): Promise<void> => {
    if (closed || !closeJourney) {
      return;
    }
    closed = true;
    try {
      await closeJourney();
    } catch {
      // Cleanup must never mask the execution result.
    }
  };

  const pushEvent = (event: Omit<TraceEvent, "stepNo" | "timestamp">): void => {
    events.push({
      stepNo: events.length,
      timestamp: new Date().toISOString(),
      ...event,
    });
  };

  const takeCheckpoint = async (
    driver: JourneyDriver,
    checkpoint: string,
    label: string,
  ): Promise<void> => {
    try {
      const bytes = await withTimeout(
        driver.screenshot(),
        stepTimeoutMs,
        "Screenshot",
      );
      const id = newArtifactId(journeyId, checkpoint);
      screenshots.push({ id, label, bytes });
      const last = events.at(-1);
      if (last) {
        last.screenshotId = id;
      }
    } catch {
      // Screenshots are best-effort evidence; never fail a journey over one.
    }
  };

  const body = (async (): Promise<void> => {
    try {
      if (plan.actions.length > maxActions) {
        throw new BlockedError("Action limit exceeded.");
      }

      const opened = await open();
      closeJourney = opened.close;
      const driver = opened.driver;

      if (aborted) {
        return;
      }

      await withTimeout(
        driver.navigate(`${origin}${plan.path}?seed=${seed}`),
        stepTimeoutMs,
        "Navigate",
      );
      if (!isAllowlistedUrl(await driver.currentUrl(), [origin])) {
        throw new BlockedError("Navigation left the allowed origin.");
      }
      pushEvent({
        type: "navigate",
        label: "Open fixture",
        outcome: "success",
        countsAsAction: false,
      });
      await takeCheckpoint(driver, "start", "Starting state");

      await withTimeout(
        driver.selectGoal(plan.goalButtonName),
        stepTimeoutMs,
        "Select goal",
      );
      pushEvent({
        type: "goal-selected",
        label: plan.goalId,
        outcome: "success",
        countsAsAction: false,
      });
      await takeCheckpoint(driver, "goal", "After goal selection");

      for (const label of plan.actions) {
        if (actionCount + 1 > maxActions) {
          throw new BlockedError("Action limit exceeded.");
        }
        await withTimeout(
          driver.clickAction(label),
          stepTimeoutMs,
          "Action",
        );
        actionCount += 1;
        pushEvent({
          type: "click",
          label,
          outcome: "success",
          countsAsAction: true,
        });
        await takeCheckpoint(
          driver,
          `step-${actionCount}`,
          `After action ${actionCount}`,
        );
      }

      await withTimeout(
        driver.assertCompleted(plan.actions.length),
        stepTimeoutMs,
        "Assert completion",
      );
      pushEvent({
        type: "complete",
        label: "Goal completed",
        outcome: "success",
        countsAsAction: false,
      });
      await takeCheckpoint(driver, "complete", "Completed state");

      if (!aborted) {
        status = "completed";
      }
    } catch (caught) {
      if (aborted) {
        return;
      }
      status = classifyError(caught);
      error = errorMessage(caught);
      pushEvent({
        type: "error",
        label: "Execution stopped",
        outcome: "failure",
        countsAsAction: false,
        detail: error,
      });
    } finally {
      await closeOnce();
    }
  })();

  let journeyTimer: ReturnType<typeof setTimeout> | undefined;
  const journeyTimeout = new Promise<never>((_resolve, reject) => {
    journeyTimer = setTimeout(() => {
      aborted = true;
      reject(
        new ExecutionTimeoutError(`Journey exceeded ${journeyTimeoutMs}ms`),
      );
    }, journeyTimeoutMs);
  });

  try {
    await Promise.race([body, journeyTimeout]);
  } catch (caught) {
    status = classifyError(caught);
    error = errorMessage(caught);
    pushEvent({
      type: "error",
      label: "Execution stopped",
      outcome: "failure",
      countsAsAction: false,
      detail: error,
    });
  } finally {
    if (journeyTimer) {
      clearTimeout(journeyTimer);
    }
    await closeOnce();
  }

  return {
    status,
    events,
    actionCount,
    startedAt,
    completedAt: new Date().toISOString(),
    screenshots,
    ...(error !== undefined ? { error } : {}),
  };
}
