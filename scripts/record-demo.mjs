import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";

// Genuine headed-browser desktop capture through X11/FFmpeg, not a slideshow.
// "ai" mode requires a protected GitHub Actions secret and actual inference.
// "deterministic" mode is explicitly labelled and never passed off as AI.
const mode = process.env.DEMO_MODE === "ai" ? "ai" : "deterministic";
const origin = "http://localhost:3000";
const dir = resolve("demo");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
if (mode === "ai" && !process.env.NEBIUS_API_KEY?.trim()) {
  throw new Error("Live AI video requires a NEW NEBIUS_API_KEY configured as a GitHub Actions repository secret. Never paste the key into code, chat, issues or logs.");
}
if (!process.env.DISPLAY) throw new Error("X11 display is not configured.");
await mkdir(dir, { recursive: true });
let browser;
let recorder;
const records = [];

async function finishRecording() {
  if (!recorder || recorder.exitCode !== null) return;
  recorder.kill("SIGINT");
  const timeout = setTimeout(() => recorder?.kill("SIGKILL"), 15000);
  try { await once(recorder, "exit"); } finally { clearTimeout(timeout); }
}

async function playComparison(page, label) {
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Does this interface make both choices equally easy?" }).waitFor({ timeout: 45000 });
  await sleep(2500);
  const scenario = page.getByRole("radio", { name: new RegExp(label, "i") });
  await scenario.scrollIntoViewIfNeeded();
  await scenario.check({ force: true });
  await sleep(2500);
  const selection = page.getByRole("radio", { name: mode === "ai" ? /AI \(Nebius\)/ : /Deterministic/ });
  await selection.scrollIntoViewIfNeeded();
  await selection.check({ force: true });
  await sleep(2600);
  const start = page.getByRole("button", { name: "Run comparison" });
  await start.scrollIntoViewIfNeeded();
  await sleep(1500);
  await start.click();
  await page.waitForURL(/\/comparisons\/cmp_[a-f0-9]{16}/, { timeout: 35000 });
  await sleep(3000);
  await page.getByRole("status").filter({ hasText: "Completed" }).first().waitFor({
    timeout: mode === "ai" ? 180000 : 90000,
  });

  const id = page.url().split("/").at(-1);
  const response = await page.request.get(origin + "/api/comparisons/" + id);
  if (response.status() !== 200) throw new Error("Cannot fetch comparison evidence.");
  const detail = await response.json();
  if (detail.comparison?.status !== "completed" || detail.comparison?.mode !== mode ||
      detail.journeys?.length !== 2 || detail.journeys.some((j) => j.status !== "completed")) {
    throw new Error("The recorded comparison did not finish in the requested mode.");
  }
  if (mode === "ai" && detail.journeys.some((j) => !j.ai || j.ai.inferenceCalls < 1)) {
    throw new Error("The comparison does not contain genuine AI inference.");
  }
  records.push({
    id, scenario: detail.comparison.scenarioId, mode,
    journeys: detail.journeys.map((j) => ({
      goal: j.goalId, actions: j.actionCount, status: j.status,
      inferenceCalls: j.ai?.inferenceCalls ?? 0,
    })),
  });
  await sleep(9500);
  const inspect = page.getByRole("button", { name: "Inspect supporting evidence" });
  await inspect.scrollIntoViewIfNeeded();
  await sleep(10500);
  await inspect.click();
  await sleep(8000);
  const screenshot = page.getByRole("region", { name: "Evidence inspector" }).locator("img").first();
  await screenshot.waitFor({ state: "visible", timeout: 12000 });
  const loaded = await screenshot.evaluate((img) => img.naturalWidth > 0);
  if (!loaded) throw new Error("Actual evidence screenshot did not load.");
  const next = page.getByRole("button", { name: "Next step" });
  if (await next.isEnabled()) {
    await next.click();
    await sleep(4200);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(7500);
}

try {
  browser = await chromium.launch({
    headless: false,
    args: ["--window-position=0,0", "--window-size=1440,900", "--disable-dev-shm-usage", "--no-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1390, height: 795 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Does this interface make both choices equally easy?" }).waitFor({ timeout: 45000 });
  const video = resolve(dir, "choicemirror-" + mode + "-screen.mp4");
  recorder = spawn("ffmpeg", [
    "-y", "-f", "x11grab", "-draw_mouse", "1", "-framerate", "24",
    "-video_size", "1440x900", "-i", process.env.DISPLAY + ".0+0,0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", video,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  recorder.stderr.resume();
  await sleep(1800);
  if (recorder.exitCode !== null) throw new Error("FFmpeg failed to start.");
  await sleep(5600);
  await playComparison(page, "Join vs leave — asymmetric");
  await playComparison(page, "Join vs leave — balanced");
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await sleep(7500);
  await page.screenshot({ path: resolve(dir, "choicemirror-" + mode + "-verification.png") });
  await writeFile(resolve(dir, "choicemirror-" + mode + "-runs.json"),
    JSON.stringify({ capture: "actual headed Chromium desktop recording", mode, records }, null, 2));
  console.log("Recording completed:", JSON.stringify({ video, mode, records }));
} catch (err) {
  console.error("Recording failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  await finishRecording();
  await browser?.close().catch(() => {});
}