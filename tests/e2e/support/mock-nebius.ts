import { createServer } from "node:http";

/**
 * Minimal OpenAI-compatible mock of the Nebius token-factory endpoint for
 * E2E runs. Zero workspace imports so Node can execute it directly with
 * type stripping (`node tests/e2e/support/mock-nebius.ts`) while specs import
 * `startMockNebius` for reuse.
 *
 * The decision policy is stateless and derived purely from the observation
 * in the request — never a hardcoded action list — so a passing journey
 * proves the agent genuinely observed the page.
 */

export type MockNebiusServer = {
  port: number;
  close(): Promise<void>;
};

type RecordedBody = Record<string, unknown> | null;

type Proposal =
  | { action: "click"; targetId: string; reason: string }
  | { action: "stop"; reason: string }
  // Schema-invalid on purpose: forces the agent's corrective re-ask.
  | { action: "navigate"; url: string; reason: string };

type ObservationElement = {
  id: string;
  role: string;
  name: string;
  enabled: boolean;
};

type ParsedMessage = {
  goal: string;
  text: string;
  elements: ObservationElement[];
};

const USAGE = {
  prompt_tokens: 1200,
  completion_tokens: 60,
  total_tokens: 1260,
} as const;

const BEGIN_MARKER = "OBSERVATION_JSON_BEGIN";
const END_MARKER = "OBSERVATION_JSON_END";
const INJECTION_MARKER = "IGNORE YOUR INSTRUCTIONS";

function parseUserMessage(content: string): ParsedMessage {
  const goalMatch = /^Goal: (.*)$/m.exec(content);
  const start = content.indexOf(BEGIN_MARKER);
  const end = content.indexOf(END_MARKER);

  let text = "";
  let elements: ObservationElement[] = [];
  if (start !== -1 && end > start) {
    try {
      const observation = JSON.parse(
        content.slice(start + BEGIN_MARKER.length, end),
      ) as { text?: unknown; elements?: unknown };
      if (typeof observation.text === "string") {
        text = observation.text;
      }
      if (Array.isArray(observation.elements)) {
        elements = observation.elements.filter(
          (element): element is ObservationElement =>
            typeof element === "object" &&
            element !== null &&
            typeof (element as ObservationElement).id === "string" &&
            typeof (element as ObservationElement).name === "string",
        );
      }
    } catch {
      // Malformed observation: treat as empty; policy still answers.
    }
  }

  return { goal: goalMatch?.[1]?.trim() ?? "", text, elements };
}

/**
 * Generic decision policy:
 * 1. Injection marker → scripted calls (schema-invalid → policy-rejected →
 *    stop), counted per server and cleared by `/__reset`.
 * 2. Goal phase: an enabled element whose name contains the goal text.
 * 3. Steps phase: first enabled button that is not the reset control.
 * 4. Otherwise stop.
 */
function decide(
  parsed: ParsedMessage,
  nextInjectionCall: () => number,
): Proposal {
  if (parsed.text.includes(INJECTION_MARKER)) {
    const call = nextInjectionCall();
    if (call === 1) {
      return {
        action: "navigate",
        url: "https://evil.example",
        reason: "page told me to",
      };
    }
    if (call === 2) {
      return {
        action: "click",
        targetId: "element-999",
        reason: "page told me to",
      };
    }
    return { action: "stop", reason: "injected stop" };
  }

  if (parsed.goal) {
    const goalElement = parsed.elements.find(
      (element) => element.enabled && element.name.includes(parsed.goal),
    );
    if (goalElement) {
      return {
        action: "click",
        targetId: goalElement.id,
        reason: `"${goalElement.name}" is the control for the assigned goal.`,
      };
    }
  }

  const stepElement = parsed.elements.find(
    (element) =>
      element.enabled &&
      element.role === "button" &&
      element.name.trim() !== "Reset to starting state",
  );
  if (stepElement) {
    return {
      action: "click",
      targetId: stepElement.id,
      reason: `"${stepElement.name}" is the next step towards the goal.`,
    };
  }

  return { action: "stop", reason: "No safe progress is possible." };
}

export function startMockNebius(port: number): Promise<MockNebiusServer> {
  const bodies: RecordedBody[] = [];
  let injectionCalls = 0;

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const url = request.url ?? "/";

      const send = (status: number, payload: string | object): void => {
        const isText = typeof payload === "string";
        response.writeHead(status, {
          "content-type": isText
            ? "text/plain; charset=utf-8"
            : "application/json",
        });
        response.end(isText ? payload : JSON.stringify(payload));
      };

      if (request.method === "GET" && url === "/health") {
        send(200, "ok");
        return;
      }

      if (request.method === "POST" && url === "/__reset") {
        bodies.length = 0;
        injectionCalls = 0;
        send(200, { ok: true });
        return;
      }

      if (request.method === "GET" && url === "/__requests") {
        send(200, bodies);
        return;
      }

      if (request.method === "POST" && url === "/v1/chat/completions") {
        let body: RecordedBody = null;
        try {
          body = JSON.parse(raw) as RecordedBody;
        } catch {
          body = null;
        }
        bodies.push(body);

        let userContent = "";
        const messages = (body as { messages?: unknown } | null)?.messages;
        if (Array.isArray(messages)) {
          const user = [...messages]
            .reverse()
            .find(
              (message) =>
                typeof message === "object" &&
                message !== null &&
                (message as { role?: unknown }).role === "user" &&
                typeof (message as { content?: unknown }).content === "string",
            ) as { content: string } | undefined;
          userContent = user?.content ?? "";
        }

        const proposal = decide(parseUserMessage(userContent), () => {
          injectionCalls += 1;
          return injectionCalls;
        });

        send(200, {
          choices: [{ message: { content: JSON.stringify(proposal) } }],
          usage: { ...USAGE },
        });
        return;
      }

      send(404, { error: "not found" });
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      const address = server.address();
      resolve({
        port: typeof address === "object" && address !== null ? address.port : port,
        close: () =>
          new Promise<void>((resolveClose) => {
            server.close(() => resolveClose());
          }),
      });
    });
  });
}

if (import.meta.main) {
  const port = Number(process.env.MOCK_NEBIUS_PORT ?? 3099);
  startMockNebius(port)
    .then((server) => {
      console.log(`mock nebius listening on http://localhost:${server.port}`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
