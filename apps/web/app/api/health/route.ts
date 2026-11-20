import { publicDemoEnabled, publicDemoReady } from "../../../lib/public-demo-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  // The local benchmark is an essential part of the AI runner. Do not
  // advertise an instance as ready if its internal Next.js app is down.
  const origin = process.env.BENCHMARK_ORIGIN ?? "http://127.0.0.1:3001";
  let benchmarkReady = false;
  try {
    const response = await fetch(origin, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    benchmarkReady = response.ok;
  } catch {
    benchmarkReady = false;
  }
  const ready = benchmarkReady && publicDemoReady();
  return Response.json(
    {
      status: ready ? "ready" : "unavailable",
      benchmark: benchmarkReady ? "ready" : "unavailable",
      demo: publicDemoEnabled() ? "public" : "local",
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
