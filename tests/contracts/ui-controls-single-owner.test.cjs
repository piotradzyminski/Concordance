const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const ownerRel = "css/ui-controls.css";
const ownerPath = path.join(root, ownerRel);
const indexPath = path.join(root, "index.html");

function walk(dir, extension) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, extension));
    else if (!extension || full.endsWith(extension)) results.push(full);
  }
  return results;
}

function inputTags(source) {
  return source.match(/<input\b[^>]*>/gis) || [];
}

assert.ok(fs.existsSync(ownerPath), `${ownerRel} must exist`);
const owner = fs.readFileSync(ownerPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

const ownerLinks = index.match(/<link\b[^>]*href=["']css\/ui-controls\.css\?v=\d+["'][^>]*>/gi) || [];
assert.strictEqual(ownerLinks.length, 1, "css/ui-controls.css must be eager-loaded exactly once");
assert.ok(index.indexOf("css/modules.css") < index.indexOf("css/ui-controls.css"), "ui-controls must load after modules.css");
assert.ok(index.indexOf("css/ui-controls.css") < index.indexOf("css/system-tabs.css"), "ui-controls must load before system-tabs.css");

const cssFiles = walk(path.join(root, "css"), ".css");
for (const file of cssFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (rel === ownerRel) continue;
  const css = fs.readFileSync(file, "utf8");
  assert.ok(!/::-webkit-scrollbar/i.test(css), `${rel} must not own WebKit scrollbar appearance`);
  assert.ok(!/\bscrollbar-(?:width|color)\s*:/i.test(css), `${rel} must not own Firefox scrollbar appearance`);
  assert.ok(!/\baccent-color\s*:/i.test(css), `${rel} must not own checkbox accent color`);
  assert.ok(!/input\s*\[\s*type\s*=\s*["']?checkbox["']?\s*\]/i.test(css), `${rel} must not explicitly style checkbox inputs`);
}

const markupFiles = [indexPath, ...walk(path.join(root, "js"), ".js")];
let checkboxCount = 0;
for (const file of markupFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const source = fs.readFileSync(file, "utf8");
  for (const tag of inputTags(source)) {
    if (/\btype\s*=\s*["']checkbox["']/i.test(tag)) {
      checkboxCount += 1;
      const classMatch = tag.match(/\bclass\s*=\s*["']([^"']*)["']/i);
      const classes = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];
      assert.ok(classes.includes("ui-select-control"), `${rel} checkbox lacks ui-select-control: ${tag}`);
    }
    if (/\btype\s*=\s*["']radio["']/i.test(tag)) {
      const classMatch = tag.match(/\bclass\s*=\s*["']([^"']*)["']/i);
      const classes = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];
      assert.ok(!classes.includes("ui-select-control"), `${rel} radio must not use checkbox class: ${tag}`);
    }
  }
}
assert.ok(checkboxCount > 0, "repository scan must discover checkbox markup");

const requiredOwnerPatterns = [
  /--ui-scrollbar-size:\s*10px/,
  /scrollbar-width:\s*thin/,
  /scrollbar-color:\s*var\(--ui-scrollbar-thumb-firefox\)\s+var\(--ui-scrollbar-track\)/,
  /\*::-webkit-scrollbar\s*\{[^}]*width:\s*var\(--ui-scrollbar-size\)[^}]*height:\s*var\(--ui-scrollbar-size\)/s,
  /input\[type="checkbox"\]\.ui-select-control\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s,
  /input\[type="checkbox"\]\.ui-select-control::after\s*\{[^}]*width:\s*8px[^}]*height:\s*8px/s,
  /input\[type="checkbox"\]\.ui-select-control:focus-visible\s*\{[^}]*outline:\s*1px solid rgba\(143, 189, 180, 0\.75\)[^}]*outline-offset:\s*2px/s,
  /input\[type="checkbox"\]\.ui-select-control:disabled\s*\{[^}]*opacity:\s*0\.45/s,
];
for (const pattern of requiredOwnerPatterns) {
  assert.match(owner, pattern, `canonical owner is missing ${pattern}`);
}

console.log(`UI controls single-owner contract passed (${checkboxCount} checkbox tags).`);
