import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "playwright-report", "test-results", "blob-report"]);
const EXTENSIONS = new Set([".js", ".cjs", ".mjs"]);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(absolute));
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

const files = (await collect(ROOT)).sort();
const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failures.push({
      file: path.relative(ROOT, file),
      output: `${result.stdout || ""}${result.stderr || ""}`.trim()
    });
  }
}

console.log(`JS_FILES_CHECKED=${files.length}`);
console.log(`JS_CHECK_FAILURES=${failures.length}`);
for (const failure of failures) {
  console.error(`\n[${failure.file}]\n${failure.output}`);
}
process.exitCode = failures.length ? 1 : 0;
