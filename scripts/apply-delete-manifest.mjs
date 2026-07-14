import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "DELETE_FILES.txt");
const apply = process.argv.includes("--apply");

function fail(message) {
  console.error(`[cleanup] ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(manifestPath)) {
  fail("DELETE_FILES.txt is missing.");
} else {
  const entries = fs
    .readFileSync(manifestPath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const uniqueEntries = [...new Set(entries)];
  if (uniqueEntries.length !== entries.length) {
    fail("DELETE_FILES.txt contains duplicate paths.");
  }

  let existing = 0;
  let removed = 0;
  let missing = 0;

  for (const relativePath of uniqueEntries) {
    if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes("..")) {
      fail(`Unsafe manifest path: ${relativePath}`);
      continue;
    }

    const target = path.resolve(root, relativePath);
    const relativeToRoot = path.relative(root, target);
    if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      fail(`Path escapes project root: ${relativePath}`);
      continue;
    }

    if (!fs.existsSync(target)) {
      missing += 1;
      console.log(`[cleanup] already absent: ${relativePath}`);
      continue;
    }

    existing += 1;
    if (!apply) {
      console.log(`[cleanup] would remove: ${relativePath}`);
      continue;
    }

    const stat = fs.lstatSync(target);
    if (!stat.isFile() && !stat.isSymbolicLink()) {
      fail(`Manifest entry is not a file: ${relativePath}`);
      continue;
    }

    fs.rmSync(target, { force: true });
    removed += 1;
    console.log(`[cleanup] removed: ${relativePath}`);
  }

  if (apply) {
    for (const relativeDir of ["docs/patchnotes", "docs/audits", "docs/plans"]) {
      const dir = path.join(root, relativeDir);
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        console.log(`[cleanup] removed empty directory: ${relativeDir}`);
      }
    }
  }

  console.log(
    `[cleanup] mode=${apply ? "apply" : "check"} entries=${uniqueEntries.length} existing=${existing} removed=${removed} alreadyAbsent=${missing}`,
  );
}
