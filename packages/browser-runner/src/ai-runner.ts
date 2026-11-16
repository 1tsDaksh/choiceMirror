import {
  actionProposalSchema,
  newArtifactId,
  newJourneyId,
  validateProposal,
  type ActionProposal,
  type AgentDecision,
  type AgentDecider,
  type AiEvent,
  type AiJourneySummary,
  type Goal,
  type TokenUsage,
  type TraceEvent,
} from "@choicemirror/contracts";

import { isAllowlistedUrl } from "./allowlist";
import { createPlaywrightOpenJourney } from "./driver";
import { BlockedError } from "./errors";
import { limits } from "./limits";
import { buildObservation } from "./observation";
import {
  ExecutionTimeoutError,
  classifyError,
  errorMessage,
  withTimeout,
  type AiJourneyDriver,
  type JourneyExecutionResult,
  type OpenAiJourney,
} from "./runner";

export type RunAiJourneyOptions = {
  comparisonId: string;
  goalId: Goal["id"];
  goalDescription: string;
  path: string;
  origin: string;
  seed: string;
  /** Record/display only — never sent to the model. */
  expectedActionCount: number;
  decider: AgentDecider;
  aiMeta: { provider: string; model: string; promptVersion: string };
  openJourney?: OpenAiJourney;
  maxActions?: number;
  maxDecisions?: number;
  maxRejected?: number;
  stepTimeoutMs?: number;
  journeyTimeoutMs?: number;
};

export type AiJourneyExecutionResult = JourneyExecutionResult & {
  ai: AiJourneySummary;
};

const STOP_MESSAGE = "Model stopped before the goal was completed.";
const REJECTION_MESSAGE = "Model kept proposing invalid actions.";
const SCHEMA_REJECTION_REASON = "Proposal failed schema validation.";

export async function runAiJourney(
  options: RunAiJourneyOptions,
): Promise<AiJourneyExecutionResult> {
  const {
    comparisonId,
    goalId,
    goalDescription,
    path,
    origin,
    seed,
    decider,
    aiMeta,
  } = options;
  const maxActions = options.maxActions ?? limits.MAX_ACTIONS;
  const maxDecisions = options.maxDecisions ?? limits.MAX_AI_DECISIONS;
  const maxRejected = options.maxRejected ?? limits.AI_MAX_REJECTED;
  const stepTimeoutMs = options.stepTimeoutMs ?? limits.STEP_TIMEOUT_MS;
  const journeyTimeoutMs =
    options.journeyTimeoutMs ?? limits.JOURNEY_TIMEOUT_MS;
  const open =
    options.openJourney ?? (() => createPlaywrightOpenJourney({ origin })());

  const journeyId = newJourneyId(comparisonId, goalId);
  const startedAt = new Date().toISOString();
  const events: TraceEvent[] = [];
  const screenshots: { id: string; label: string; bytes: Buffer }[] = [];
  let actionCount = 0;
  let status: JourneyExecutionResult["status"] = "failed";
  let error: string | undefined;
  let aborted = false;

  // AI loop state.
  let phase: "goal" | "steps" = "goal";
  let decisions = 0;
  let rejected = 0;
  let feedback: string | undefined;
  let inferenceCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const modelErrors: AiJourneySummary["modelErrors"] = [];

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
    driver: AiJourneyDriver,
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

  const accumulate = (decision: AgentDecision): void => {
    inferenceCalls += decision.apiCalls;
    if (decision.usage) {
      inputTokens += decision.usage.inputTokens;
      outputTokens += decision.usage.outputTokens;
    }
    if (decision.kind === "error" && modelErrors.length < 10) {
      modelErrors.push({
        kind: decision.errorKind,
        message: decision.message.slice(0, 500),
      });
    }
  };

  const body = (async (): Promise<void> => {
    try {
      const opened = await open();
      closeJourney = opened.close;
      const driver = opened.driver;

      if (aborted) {
        return;
      }

      await withTimeout(
        driver.navigate(`${origin}${path}?seed=${seed}`),
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

      const buildAiEvent = (args: {
        observationRef: string;
        proposed: ActionProposal;
        validation: "executed" | "rejected";
        executedLabel?: string | undefined;
        detail?: string | undefined;
        usage?: TokenUsage | undefined;
        latencyMs?: number | undefined;
      }): AiEvent => ({
        observationRef: args.observationRef,
        proposed: args.proposed,
        validation: args.validation,
        ...(args.executedLabel !== undefined
          ? { executedLabel: args.executedLabel }
          : {}),
        ...(args.detail !== undefined ? { detail: args.detail } : {}),
        model: aiMeta.model,
        promptVersion: aiMeta.promptVersion,
        ...(args.usage !== undefined ? { usage: args.usage } : {}),
        ...(args.latencyMs !== undefined ? { latencyMs: args.latencyMs } : {}),
      });

      while (true) {
        if (decisions >= maxDecisions) {
          throw new BlockedError("Decision limit exceeded.");
        }
        const observationRef = `obs-${decisions}`;
        const observation = buildObservation(
          await withTimeout(driver.observe(), stepTimeoutMs, "Observe"),
          origin,
          observationRef,
        );

        // Inner retry: rejections re-decide against the SAME observation
        // (no re-observe); every decide still counts toward maxDecisions.
        while (true) {
          if (decisions >= maxDecisions) {
            throw new BlockedError("Decision limit exceeded.");
          }
          const decision = await decider.decide({
            goalDescription,
            observation,
            ...(feedback !== undefined ? { feedback } : {}),
          });
          decisions += 1;
          accumulate(decision);

          if (decision.kind === "error") {
            pushEvent({
              type: "error",
              label: "Model inference failed",
              outcome: "failure",
              countsAsAction: false,
              detail: decision.message,
            });
            throw new Error(decision.message);
          }

          const usage = decision.usage;
          const latencyMs = decision.latencyMs;
          const parsed = actionProposalSchema.safeParse(decision.proposal);

          const reject = (reason: string, proposed: ActionProposal | null): void => {
            rejected += 1;
            pushEvent({
              type: "error",
              label: "Model proposal rejected",
              outcome: "failure",
              countsAsAction: false,
              detail: reason,
              // A schema-invalid proposal has no valid form to record;
              // fabricating one would be false evidence. Policy rejections
              // carry the real proposal.
              ...(proposed !== null
                ? {
                    ai: buildAiEvent({
                      observationRef,
                      proposed,
                      validation: "rejected",
                      detail: reason,
                      usage,
                      latencyMs,
                    }),
                  }
                : {}),
            });
            if (rejected > maxRejected) {
              throw new Error(REJECTION_MESSAGE);
            }
            feedback = `Rejected: ${reason}. Propose again from the same observation.`;
          };

          if (!parsed.success) {
            reject(SCHEMA_REJECTION_REASON, null);
            continue;
          }
          const proposal = parsed.data;
          const validation = validateProposal(proposal, observation, {
            phase,
            goalDescription,
          });
          if (!validation.ok) {
            reject(validation.reason, proposal);
            continue;
          }
          if (validation.decision === "stop") {
            pushEvent({
              type: "error",
              label: "Model stopped",
              outcome: "failure",
              countsAsAction: false,
              detail: STOP_MESSAGE,
              ai: buildAiEvent({
                observationRef,
                proposed: proposal,
                validation: "executed",
                detail: STOP_MESSAGE,
                usage,
                latencyMs,
              }),
            });
            throw new Error(STOP_MESSAGE);
          }

          const element = validation.element;
          if (phase === "steps" && actionCount + 1 > maxActions) {
            throw new BlockedError("Action limit exceeded.");
          }
          await withTimeout(
            driver.clickElement(element.id),
            stepTimeoutMs,
            "Action",
          );

          if (phase === "goal") {
            phase = "steps";
            pushEvent({
              type: "goal-selected",
              label: goalId,
              outcome: "success",
              countsAsAction: false,
              ai: buildAiEvent({
                observationRef,
                proposed: proposal,
                validation: "executed",
                executedLabel: element.name,
                usage,
                latencyMs,
              }),
            });
            await takeCheckpoint(driver, "goal", "After goal selection");
          } else {
            actionCount += 1;
            pushEvent({
              type: "click",
              label: element.name,
              outcome: "success",
              countsAsAction: true,
              ai: buildAiEvent({
                observationRef,
                proposed: proposal,
                validation: "executed",
                executedLabel: element.name,
                usage,
                latencyMs,
              }),
            });
            await takeCheckpoint(
              driver,
              `step-${actionCount}`,
              `After action ${actionCount}`,
            );
            const completion = await withTimeout(
              driver.completionState(),
              stepTimeoutMs,
              "Completion check",
            );
            if (completion.complete) {
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
              return;
            }
          }

          // Feedback only applies to the immediately-next decide.
          feedback = undefined;
          break;
        }
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

  const ai: AiJourneySummary = {
    provider: aiMeta.provider,
    model: aiMeta.model,
    promptVersion: aiMeta.promptVersion,
    inferenceCalls,
    inputTokens,
    outputTokens,
    rejectedProposals: rejected,
    modelErrors: [...modelErrors],
  };

  return {
    status,
    events,
    actionCount,
    startedAt,
    completedAt: new Date().toISOString(),
    screenshots,
    ...(error !== undefined ? { error } : {}),
    ai,
  };
}
