"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function getFunctionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : source.length;
  assert.notEqual(start, -1, `${name} must exist.`);
  assert.notEqual(end, -1, `${nextName} must exist after ${name}.`);
  return source.slice(start, end);
}

test("Market cart summary is grouped in one sticky footer below the independently scrolling lines", () => {
  const source = read("js/housing-market-runtime.js");
  const css = read("css/housing.css");
  const drawer = getFunctionBlock(source, "renderHousingMarketCartDrawer", "getHousingShipmentRows");

  assert.match(drawer, /<footer class="housing-market-cart-summary">/);
  assert.match(drawer, /housing-market-cart-quote/);
  assert.match(drawer, /housing-market-cart-actions/);
  assert.match(drawer, /AUTHORIZE CHECKOUT/);
  assert.match(css, /\.housing-market-cart-drawer\s*\{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(css, /\.housing-market-cart-drawer\s*\{[\s\S]*?height:\s*100dvh/);
  assert.match(css, /\.housing-market-cart-lines\s*\{[\s\S]*?min-height:\s*0[\s\S]*?overflow:\s*auto/);
  assert.match(css, /\.housing-market-cart-summary\s*\{[\s\S]*?bottom:\s*0[\s\S]*?position:\s*sticky/);
});

test("Market cart backdrop keeps a constant dim layer on hover and keyboard focus", () => {
  const css = read("css/housing.css");

  assert.match(css, /\.housing-market-cart-backdrop:hover/);
  assert.match(css, /\.housing-market-cart-backdrop:focus-visible/);
  assert.match(css, /\.housing-market-cart-backdrop,[\s\S]*?background:\s*rgba\(0, 0, 0, 0\.62\)/);
  assert.match(css, /\.housing-market-cart-backdrop,[\s\S]*?box-shadow:\s*none/);
  assert.match(css, /\.housing-market-cart-backdrop,[\s\S]*?outline:\s*none/);
});
