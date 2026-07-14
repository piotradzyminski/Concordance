import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const spec = "citizen-creator-editor.spec.cjs";
const project = "desktop-1440x960";
const timeoutMs = 90_000;
const scenarios = [
  "Admin creates and activates a templated Citizen through Character Creator",
  "Admin creates an active NPC with Quick NPC Creator",
  "Citizen Profile Editor saves with Ctrl+S",
  "Admin Citizen Editor navigates sections and saves the active section by keyboard",
  "Admin Citizen Editor restores mechanics cards, persistent actions and Short ID preview"
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function runScenario(scenario) {
  return new Promise((resolve) => {
    const detached = process.platform !== "win32";
    const child = spawn(process.execPath, [
      playwrightCli,
      "test",
      spec,
      `--project=${project}`,
      "--grep",
      escapeRegex(scenario),
      "--reporter=list"
    ], {
      stdio: "inherit",
      env: process.env,
      detached
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (detached) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        // The process may have exited between the timeout and the kill.
      }
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, timedOut, error });
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ ok: !timedOut && code === 0, timedOut, code, signal });
    });
  });
}

for (const scenario of scenarios) {
  let result = await runScenario(scenario);
  if (!result.ok && result.timedOut) {
    console.warn(`Citizen E2E timed out; retrying once: ${scenario}`);
    await delay(2_000);
    result = await runScenario(scenario);
  }
  if (!result.ok) {
    if (result.error) console.error(result.error);
    process.exit(result.code || 1);
  }
  await delay(1_000);
}
