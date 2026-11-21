import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";

// Genuine headed-browser desktop capture through X11/FFmpeg, not a slideshow.
// "ai" mode requires a protected GitHub Actions secret and actual inference.
// "deterministic" mode is explicitly labelled and never passed off as AI.
const mode = "ai";
if (process.env.DEMO_MODE && process.env.DEMO_MODE !== "ai") throw new Error("OrbitPass final footage must be genuine Nebius AI, not a deterministic preview.");
const origin = "http://localhost:3000";
const dir = resolve("demo-orbitpass");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
if (mode === "ai" && !process.env.NEBIUS_API_KEY?.trim()) {
  throw new Error("Live AI video requires a NEW NEBIUS_API_KEY configured as a GitHub Actions repository secret. Never paste the key into code, chat, issues or logs.");
}
if (!process.env.DISPLAY) throw new Error("X11 display is not configured.");
await mkdir(dir, { recursive: true });
let browser;
let recorder;
const records = [];

const cues = [];
let recordingStartedAt = 0;
function mark(title, caption, narration) {
  if (!recordingStartedAt) throw new Error("Desktop recorder has not started.");
  cues.push({
    seconds: Math.max(0, (Date.now() - recordingStartedAt) / 1000),
    title, caption, narration,
  });
}
function clock(seconds) {
  const n = Math.max(0, Math.floor(seconds));
  return String(Math.floor(n / 3600)).padStart(2, "0") + ":" +
    String(Math.floor((n % 3600) / 60)).padStart(2, "0") + ":" +
    String(n % 60).padStart(2, "0");
}
function srtClock(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return String(Math.floor(ms / 3600000)).padStart(2, "0") + ":" +
    String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0") + ":" +
    String(Math.floor((ms % 60000) / 1000)).padStart(2, "0") + "," +
    String(ms % 1000).padStart(3, "0");
}
async function writeTranscript(videoPath) {
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "json", videoPath,
  ], { encoding: "utf8" }));
  const duration = Number(probe.format?.duration);
  if (!Number.isFinite(duration) || duration < 75 || cues.length < 12) {
    throw new Error("Video or timestamped transcript is incomplete.");
  }
  const moments = [{
    seconds: 0, title: "INTRODUCTION",
    caption: "ChoiceMirror — See both sides of the click",
  }, ...cues];
  const md = [
    "# ChoiceMirror OrbitPass — actual silent footage cue sheet",
    "",
    "**Video:** " + videoPath.split("/").at(-1),
    "**Recording mode:** " + (mode === "ai" ? "Genuine Nebius AI" : "Deterministic browser preview"),
    "**Duration:** " + clock(duration) + " (" + duration.toFixed(1) + " seconds)",
    "**Audio:** None. Video has no narration, music or other audio. A separate voiceover script can be written later against these actual timestamps.",
    "",
    "Times below were recorded while the actual UI was captured, not estimated from a slide sequence.",
    "",
  ];
  const srt = [];
  let cueIndex = 1;
  for (let i = 0; i < moments.length; i += 1) {
    const current = moments[i];
    const start = Math.min(duration, current.seconds);
    const end = Math.min(duration, Math.max(start + 0.2, moments[i + 1]?.seconds ?? duration));
    if (end - start < 0.25) continue;
    md.push("## " + clock(start) + "–" + clock(end) + " · " + current.title, "",
      "**On screen:** " + current.caption, "");
    srt.push(String(cueIndex), srtClock(start) + " --> " + srtClock(end),
      current.caption, "");
    cueIndex += 1;
  }
  if (cueIndex < 8) throw new Error("Too few distinct timestamped video sections.");
  md.push("## Actual stored run evidence", "",
    "The figures below were read from completed application API records. They are not predicted fixture values.", "",
    ...JSON.stringify(records, null, 2).split("\n").map((line) => "    " + line),
    "", "This controlled synthetic benchmark does not establish intent or unlawful manipulation.", "");
  await writeFile(resolve(dir, "choicemirror-orbitpass-" + mode + "-timestamped-transcript.md"),
    md.join("\n"), "utf8");
  await writeFile(resolve(dir, "choicemirror-orbitpass-" + mode + "-optional-subtitles.srt"),
    srt.join("\n"), "utf8");
  console.log("Timestamped guide created:", cueIndex - 1, "segments.");
}


async function finishRecording() {
  if (!recorder || recorder.exitCode !== null) return;
  recorder.kill("SIGINT");
  const timeout = setTimeout(() => recorder?.kill("SIGKILL"), 15000);
  try { await once(recorder, "exit"); } finally { clearTimeout(timeout); }
}

async function playComparison(page, label) {
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Does this interface make both choices equally easy?" }).waitFor({ timeout: 45000 });
  mark("SCENARIO", "Select " + label,
    "We compare two choices on the controlled " + label + " benchmark under matched conditions.");
  await sleep(2500);
  const scenario = page.getByRole("radio", { name: new RegExp(label, "i") });
  await scenario.scrollIntoViewIfNeeded();
  await scenario.check({ force: true });
  mark("EXECUTION MODE", mode === "ai" ? "AI (Nebius) selected" : "Deterministic selected",
    mode === "ai" ? "The genuine Nebius model will observe the page and propose validated browser actions." :
      "The deterministic browser runner uses a validated action plan and does not invoke Nebius.");
  await sleep(2500);
  const selection = page.getByRole("radio", { name: mode === "ai" ? /AI \(Nebius\)/ : /Deterministic/ });
  await selection.scrollIntoViewIfNeeded();
  await selection.check({ force: true });
  await sleep(2600);
  const start = page.getByRole("button", { name: "Run comparison" });
  await start.scrollIntoViewIfNeeded();
  mark("START", "Run comparison",
    "The system starts both opposing browser journeys and stores action evidence and screenshots.");
  await sleep(1500);
  await start.click();
  await page.waitForURL(/\/comparisons\/cmp_[a-f0-9]{16}/, { timeout: 35000 });
  mark("EXECUTION", mode === "ai" ? "Real Nebius AI navigation in progress" : "Actual Playwright browser execution in progress",
    mode === "ai" ? "The real Nebius model selects actions on the synthetic website. Zod and the policy gate validate proposals before execution." :
      "Playwright executes the synthetic benchmark steps and records browser events without an AI model.");
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
  mark("RESULTS", "Goal A: " + detail.journeys[0].actionCount + " · Goal B: " + detail.journeys[1].actionCount + " actions",
    "Both journeys actually completed. Goal A required " + detail.journeys[0].actionCount +
      " recorded " + (detail.journeys[0].actionCount === 1 ? "action" : "actions") +
      " and Goal B required " + detail.journeys[1].actionCount +
      " " + (detail.journeys[1].actionCount === 1 ? "action" : "actions") +
      ". The measured difference is " + Math.abs(detail.journeys[0].actionCount - detail.journeys[1].actionCount) +
      " actions on this controlled benchmark.");
  records.push({
    id, scenario: detail.comparison.scenarioId, mode,
    journeys: detail.journeys.map((j) => ({
      goal: j.goalId, actions: j.actionCount, status: j.status,
      inferenceCalls: j.ai?.inferenceCalls ?? 0,
    })),
  });
  await sleep(4600);
  const inspect = page.getByRole("button", { name: "Inspect supporting evidence" });
  await inspect.scrollIntoViewIfNeeded();
  mark("EVIDENCE", "Inspect supporting evidence",
    "The comparison finding links to genuine stored events and browser screenshots. We inspect a recorded step.");
  await sleep(2400);
  await inspect.click();
  mark("INSPECTOR", "Real browser screenshot and evidence",
    "The inspector shows the actual screenshot, event outcome and action count. Model justifications, where present, are labelled model-reported.");
  await sleep(3500);
  const screenshot = page.getByRole("region", { name: "Evidence inspector" }).locator("img").first();
  await screenshot.waitFor({ state: "visible", timeout: 12000 });
  const loaded = await screenshot.evaluate((img) => img.naturalWidth > 0);
  if (!loaded) throw new Error("Actual evidence screenshot did not load.");
  const next = page.getByRole("button", { name: "Next step" });
  if (await next.isEnabled()) {
    mark("NEXT STEP", "Navigate to next evidence checkpoint",
      "We can inspect the recorded journey step by step to see where each action occurred.");
    await next.click();
    await sleep(2900);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(2400);
}


// Introduce the concrete problem on the actual fictional OrbitPass benchmark.
// Selecting a goal is not counted as an action: only subsequent CTA clicks count.
async function previewReference(page) {
  await page.goto("http://localhost:3001/membership-case-study?seed=video", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Choose your OrbitPass membership action" }).waitFor();
  mark("ORBITPASS", "Fictional OrbitPass · identical starting conditions",
    "The controlled fictional membership illustrates unequal join/cancel flows.");
  await sleep(2500);
  await page.getByRole("button", { name: /Start a fictional OrbitPass membership/ }).click();
  mark("JOIN", "Start membership · one action", "");
  await sleep(1000);
  await page.getByRole("button", { name: "Activate OrbitPass membership" }).click();
  await page.getByText("Completed in 1 action.").waitFor();
  await sleep(2200);
  await page.getByRole("button", { name: "Reset to starting state" }).click();
  await page.getByRole("button", { name: /Cancel a fictional OrbitPass membership/ }).click();
  mark("CANCEL", "Cancellation · five separate actions", "");
  for (const [index, label] of [
    "Review membership details",
    "Continue towards cancellation",
    "Decline discounted extension",
    "Skip feedback and continue",
    "Confirm subscription cancellation",
  ].entries()) {
    await page.getByRole("button", { name: label, exact: true }).click();
    if (index === 2) mark("RETENTION", "Decline the retention offer to continue cancelling", "");
    await sleep(1000);
  }
  await page.getByText("Completed in 5 actions.").waitFor();
  mark("ASYMMETRY", "Original fictional page · join 1, cancel 5", "");
  await sleep(2600);
}
// Show the true changed copy and layout; verify a hardcoded original CTA does not exist.
// This is a selector-existence check, not a claim that all deterministic automation fails.
async function previewVariation(page) {
  await page.goto("http://localhost:3001/membership-copy-variant?seed=video", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Choose your OrbitPass membership action" }).waitFor();
  mark("REWORDED", "Same fictional task · rearranged layout and rewritten buttons", "");
  await sleep(2000);
  await page.getByRole("button", { name: /Cancel a fictional OrbitPass membership/ }).click();
  const oldLabelMatches = await page.getByRole("button", { name: "Review membership details", exact: true }).count();
  if (oldLabelMatches !== 0) throw new Error("Expected original fixed CTA to be absent from the variant.");
  await page.getByRole("button", { name: "View account options" }).waitFor();
  mark("SELECTOR CHECK", "Original exact-label CTA is absent; reworded CTA is visible", "");
  await sleep(3000);
  return { checkedLabel: "Review membership details", oldLabelMatches, replacementLabel: "View account options" };
}

// Check the actual X11 desktop before recording. Chromium can become visibly
// mapped several seconds after its DevTools page reports ready; without this
// check the first segment may contain only the blank virtual desktop.
async function waitForVisibleDesktop(page) {
  for (let attempt = 0; attempt < 35; attempt += 1) {
    await page.bringToFront();
    try {
      const ids = execFileSync("xdotool", [
        "search", "--onlyvisible", "--class", "chromium|chrome",
      ], { encoding: "utf8", timeout: 3000 }).trim().split(/\\s+/).filter(Boolean);
      if (ids.length) {
        execFileSync("xdotool", ["windowactivate", "--sync", ids.at(-1)], { timeout: 3000 });
      }
    } catch { /* Chromium may not be mapped yet. */ }
    try {
      const frame = execFileSync("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-f", "x11grab",
        "-video_size", "1440x900", "-i", process.env.DISPLAY + ".0+0,0",
        "-frames:v", "1", "-vf", "scale=32:32,format=gray",
        "-f", "rawvideo", "-",
      ], { timeout: 8000, maxBuffer: 256 * 1024 });
      const brightness = [...frame].reduce((sum, value) => sum + value, 0) / frame.length;
      const whiteShare = [...frame].filter(value => value > 240).length / frame.length;
      if (frame.length === 1024 && brightness < 175 && whiteShare < 0.6) {
        console.log("Visible desktop preflight passed; brightness=" + brightness.toFixed(1));
        await sleep(700);
        return;
      }
    } catch { /* X11 framebuffer is not ready. */ }
    await sleep(1000);
  }
  throw new Error("Desktop stayed white/blank; refusing to record unusable intro.");
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
  await waitForVisibleDesktop(page);
  const video = resolve(dir, "choicemirror-orbitpass-" + mode + "-screen.mp4");
  recorder = spawn("ffmpeg", [
    "-y", "-f", "x11grab", "-draw_mouse", "1", "-framerate", "24",
    "-video_size", "1440x900", "-i", process.env.DISPLAY + ".0+0,0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", video,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  recorder.stderr.resume();
  recordingStartedAt = Date.now();
  await sleep(1800);
  if (recorder.exitCode !== null) throw new Error("FFmpeg failed to start.");
  mark("WELCOME", "ChoiceMirror — See both sides of the click",
    "ChoiceMirror measures the effort required by opposing choices using actual browser evidence.");
  await sleep(3100);
  await previewReference(page);
  await playComparison(page, "Join vs cancel — documented-pattern case study");
  const selectorCheck = await previewVariation(page);
  await playComparison(page, "Join vs cancel — reworded interface");
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  mark("CLOSING", "ChoiceMirror — Evidence-based comparisons",
    "These measurements concern only local synthetic benchmarks, not real websites or legal findings.");
  await sleep(4900);
  await page.screenshot({ path: resolve(dir, "choicemirror-orbitpass-" + mode + "-verification.png") });
  await writeFile(resolve(dir, "choicemirror-orbitpass-" + mode + "-runs.json"),
    JSON.stringify({ capture: "actual headed Chromium desktop recording", mode, project: "OrbitPass synthetic reference and copy-variation", selectorCheck, records }, null, 2));
  await finishRecording();
  if (records.length !== 2 || records.some(r => r.mode !== "ai" || r.journeys.length !== 2 || r.journeys[0].actions !== 1 || r.journeys[1].actions !== 5 || r.journeys.some(j => j.inferenceCalls < 1))) throw new Error("Footage contains unexpected or non-AI benchmark results.");
  await writeTranscript(video);
  console.log("SILENT video and timestamped transcript completed:", JSON.stringify({ video, mode, records }));
} catch (err) {
  console.error("Recording failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  await finishRecording();
  await browser?.close().catch(() => {});
}