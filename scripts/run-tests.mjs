import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const roots = process.argv.slice(2);
if (!roots.length) roots.push("tests/unit", "tests/contracts", "tests/data-io");

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(absolute));
    else if (/\.test\.(?:cjs|mjs|js)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

const files = [];
for (const root of roots) files.push(...await collect(root));
files.sort();
if (!files.length) {
  console.error(`No test files found in: ${roots.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
