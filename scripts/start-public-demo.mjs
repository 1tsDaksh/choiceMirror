import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 3001) {
  throw new Error("PORT must be an available TCP port other than 3001.");
}

// Railway exposes only the web server. The synthetic benchmark is strictly
// loopback-only: public visitors cannot submit custom URLs or arbitrary DOM.
const baseEnv = {
  ...process.env,
  NODE_ENV: "production",
  BENCHMARK_ORIGIN: "http://127.0.0.1:3001",
};
const children = [];
let shuttingDown = false;

function start(name, app, args, env) {
  const child = spawn(process.execPath, [
    resolve("apps", app, "node_modules", "next", "dist", "bin", "next"),
    "start", ...args,
  ], {
    cwd: resolve("apps", app),
    env: { ...baseEnv, ...env },
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error("App child failed to start:", name, error.message);
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error("Required app child stopped:", name, code, signal);
      stopAll(1);
    }
  });
  children.push(child);
  return child;
}

function stopAll(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  // Exit after signaling children; Railway restarts on a failed subprocess.
  process.exitCode = code;
  setTimeout(() => process.exit(code), 1500).unref();
}

process.on("SIGTERM", () => stopAll(0));
process.on("SIGINT", () => stopAll(0));
process.on("uncaughtException", (error) => {
  console.error("Fatal server error:", error.message);
  stopAll(1);
});

start("benchmark", "benchmark", ["-p", "3001", "-H", "127.0.0.1"], {
  PORT: "3001",
});
start("web", "web", ["-p", String(port), "-H", "0.0.0.0"], {
  PORT: String(port),
});
console.log("ChoiceMirror public demo started; internal benchmark bound to 127.0.0.1:3001.");
