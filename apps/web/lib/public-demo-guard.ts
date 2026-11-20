import { createHmac } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { ExecutionMode } from "@choicemirror/contracts";

/**
 * Public runs cost real Nebius credits. The demo deliberately fails closed
 * unless a persistent, Railway-mounted evidence directory is configured.
 *
 * Single Node process + single Railway replica only. The same synchronous
 * read/check/write path is used for every reservation (no awaits), so
 * concurrent requests within this process cannot bypass a daily quota.
 * Do not horizontally scale this service without replacing this with a
 * transactional shared store.
 */

type Usage = {
  day: string;
  total: number;
  ai: number;
  visitors: Record<string, number>;
};

export type DemoGateResult =
  | { allowed: true }
  | {
      allowed: false;
      status: 429 | 503;
      reason: string;
      retryAfterSeconds?: number;
    };

const FILENAME = "public-demo-usage-v1.json";

export function publicDemoEnabled(): boolean {
  return process.env.PUBLIC_DEMO_ENABLED === "1";
}

function quotaLimit(name: string, fallback: number, max: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  return Number.isSafeInteger(value) && value >= 1 && value <= max
    ? value
    : fallback;
}

function storageRoot(): string | null {
  const configured = process.env.CHOICEMIRROR_DATA_DIR;
  const mounted = process.env.RAILWAY_VOLUME_MOUNT_PATH;

  // Do not accept a supposedly persistent directory merely because an env
  // variable names it. Railway must confirm the mounted volume path.
  if (!configured || !mounted || !path.isAbsolute(configured)) {
    return null;
  }

  const root = path.resolve(configured);
  const mount = path.resolve(mounted);
  const relative = path.relative(mount, root);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    return null;
  }
  return root;
}

function clientFingerprint(request: Request): string {
  // Railway is the trusted public reverse proxy. The final XFF hop is used
  // as a best-effort per-visitor brake; the independent *global* cap is the
  // real budget control even if forwarded headers are spoofed.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",").at(-1)?.trim().slice(0, 128) ||
    request.headers.get("x-real-ip")?.slice(0, 128) || "unidentified";
  const secret = process.env.PUBLIC_DEMO_HASH_SECRET?.trim() ||
    process.env.NEBIUS_API_KEY?.trim() || "public-demo-visitor";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

export function isAllowedPublicDemoOrigin(request: Request): boolean {
  if (!publicDemoEnabled()) return true;
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json") return false;

  // Cross-origin requests cannot spend credits using a hidden image/form.
  // Same-origin fetch requests have a matching Origin in modern browsers.
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const sent = new URL(origin);
    // A reverse proxy/Next production server can reconstruct request.url as
    // localhost even though the user reached an external HTTPS hostname.
    // Check the actual incoming Host instead; browsers cannot forge Host.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (!host || sent.host.toLowerCase() !== host.toLowerCase()) return false;

    // Railway terminates TLS at its edge and forwards the original scheme.
    // Without a proxy protocol header, fall back to the request protocol.
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const scheme = forwardedProto?.split(",")[0]?.trim().toLowerCase() ??
      new URL(request.url).protocol.replace(":", "").toLowerCase();
    return (sent.protocol === "https:" || sent.protocol === "http:") &&
      sent.protocol === scheme + ":";
  } catch {
    return false;
  }
}

export function publicDemoReady(): boolean {
  if (!publicDemoEnabled()) return true;
  return storageRoot() !== null && !!process.env.NEBIUS_API_KEY?.trim();
}

export function reservePublicDemoRequest(
  request: Request,
  mode: ExecutionMode,
): DemoGateResult {
  if (!publicDemoEnabled()) return { allowed: true };

  const root = storageRoot();
  if (!root) {
    return {
      allowed: false, status: 503,
      reason: "Public demo storage is not configured. Retry later.",
    };
  }

  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(root, FILENAME);
  const dailyMax = quotaLimit("PUBLIC_DEMO_DAILY_TOTAL_LIMIT", 30, 200);
  const aiMax = quotaLimit("PUBLIC_DEMO_DAILY_AI_LIMIT", 12, 50);
  const visitorMax = quotaLimit("PUBLIC_DEMO_DAILY_VISITOR_LIMIT", 3, 15);
  const visitor = clientFingerprint(request);
  const midnight = Date.parse(day + "T00:00:00Z") + 86_400_000;
  const retryAfterSeconds = Math.max(1, Math.ceil((midnight - Date.now()) / 1000));

  try {
    mkdirSync(root, { recursive: true });
    let state: Usage = { day, total: 0, ai: 0, visitors: {} };
    if (existsSync(file)) {
      const loaded: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (
        typeof loaded !== "object" || loaded === null ||
        typeof (loaded as Usage).day !== "string" ||
        !Number.isSafeInteger((loaded as Usage).total) ||
        !Number.isSafeInteger((loaded as Usage).ai) ||
        (loaded as Usage).total < 0 || (loaded as Usage).ai < 0 ||
        typeof (loaded as Usage).visitors !== "object" ||
        (loaded as Usage).visitors === null ||
        Array.isArray((loaded as Usage).visitors)
      ) {
        throw new Error("Invalid stored quota");
      }
      if ((loaded as Usage).day === day) {
        state = loaded as Usage;
      }
    }

    const visitorCount = state.visitors[visitor] ?? 0;
    if (
      !Number.isSafeInteger(visitorCount) || visitorCount < 0 ||
      state.total >= dailyMax ||
      (mode === "ai" && state.ai >= aiMax) ||
      visitorCount >= visitorMax
    ) {
      return {
        allowed: false, status: 429,
        reason: "The public demo has reached its usage limit. Try again tomorrow.",
        retryAfterSeconds,
      };
    }

    const next: Usage = {
      day,
      total: state.total + 1,
      ai: state.ai + (mode === "ai" ? 1 : 0),
      visitors: { ...state.visitors, [visitor]: visitorCount + 1 },
    };
    const temporary = path.join(root, FILENAME + ".tmp");
    writeFileSync(temporary, JSON.stringify(next), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, file);
    return { allowed: true };
  } catch {
    // I/O failures and corrupt usage records MUST NOT reset the budget or
    // allow a paid run. Return a generic message, never raw filesystem paths.
    return {
      allowed: false, status: 503,
      reason: "Public demo usage protection is temporarily unavailable.",
    };
  }
}
