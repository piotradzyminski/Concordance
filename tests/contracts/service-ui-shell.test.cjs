"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Service UI keeps one shell and replaces only the section body", () => {
  const source = read("js/service.js");
  const shellWrites = source.match(/container\.innerHTML\s*=/g) || [];

  assert.equal(shellWrites.length, 1, "Service shell should be created only by the initial/full render path.");
  assert.match(source, /body\.innerHTML\s*=\s*renderServiceSectionContent/);
  assert.match(source, /root\.addEventListener\("click"/);
  assert.match(source, /root\.addEventListener\("change"/);
  assert.match(source, /root\.addEventListener\("input"/);
  assert.match(source, /root\.addEventListener\("submit"/);
});

test("Service contexts are split per panel and light panels do not resolve Contracts", () => {
  const source = read("js/service.js");

  assert.match(source, /function getServiceBaseContext/);
  assert.match(source, /function getServiceContractsContext/);
  assert.match(source, /function getServiceIncomeContext/);
  assert.match(source, /function getServiceLogContext/);
  assert.match(source, /function getServiceExperienceContext/);
  assert.match(source, /if \(activePanel === "contracts" \|\| activePanel === "offer"\)[\s\S]*?getServiceContractsContext/);
  const incomeBlock = source.slice(source.indexOf("function getServiceIncomeContext"), source.indexOf("function getServiceLogContext"));
  const logBlock = source.slice(source.indexOf("function getServiceLogContext"), source.indexOf("function getServiceExperienceContext"));
  const experienceBlock = source.slice(source.indexOf("function getServiceExperienceContext"), source.indexOf("function getServicePanelContext"));
  assert.doesNotMatch(incomeBlock, /getCitizenServiceContracts/);
  assert.doesNotMatch(logBlock, /getCitizenServiceContracts/);
  assert.doesNotMatch(experienceBlock, /getCitizenServiceContracts/);
});

test("Service offer generation is cached and store synchronization is outside render", () => {
  const source = read("js/service.js");

  assert.match(source, /const serviceOfferCache = new Map\(\)/);
  assert.match(source, /function buildServiceOfferCacheKey/);
  assert.match(source, /serviceOfferStatesRevision/);
  assert.match(source, /serviceLogRevision/);
  assert.match(source, /eligibilityRevision/);
  assert.match(source, /serviceDatabaseRevision/);
  assert.match(source, /function scheduleServiceMarketOfferSync/);
  assert.match(source, /requestIdleCallback/);

  const marketGetterStart = source.indexOf("function getServiceMarketOffers");
  const marketGetterEnd = source.indexOf("function getServiceOfferSummary", marketGetterStart);
  const marketGetter = source.slice(marketGetterStart, marketGetterEnd);
  assert.doesNotMatch(marketGetter, /syncCitizenServiceMarketOffers/);

  const renderStart = source.indexOf("function renderServiceSectionContent");
  const renderEnd = source.indexOf("function syncServiceTabState", renderStart);
  const renderBlock = source.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderBlock, /syncCitizenServiceMarketOffers/);
});

test("Service section replacement locks height and restores scroll before RAF1 paint", () => {
  const source = read("js/service.js");

  assert.match(source, /body\.style\.height\s*=\s*`\$\{lockedHeight\}px`/);
  assert.match(source, /body\.dataset\.serviceHeightLocked\s*=\s*"true"/);
  assert.match(source, /scheduleServiceViewportRestore\(root,\s*body,\s*viewportBefore\)/);
  assert.match(source, /const revision\s*=\s*\+\+serviceViewportRestoreRevision;[\s\S]*?restoreServiceViewportNow\(root,\s*viewport,\s*revision\);[\s\S]*?requestAnimationFrame/);
  assert.match(source, /body\.style\.removeProperty\("height"\)/);
  assert.match(source, /revision\s*!==\s*serviceViewportRestoreRevision/);
  assert.match(source, /tabsDocumentTop/);
  assert.doesNotMatch(source, /tabTopBefore/);
  assert.doesNotMatch(source, /window\.scrollBy\(0,\s*delta\)/);
});

test("Contracts use bounded pagination without intrinsic-size placeholders", () => {
  const source = read("js/service.js");
  const css = read("css/service.css");

  assert.match(source, /const SERVICE_CONTRACT_PAGE_SIZE = 20/);
  assert.match(source, /contracts\.slice\(start,\s*end\)/);
  assert.match(source, /data-service-contract-page=/);
  assert.match(css, /\.service-contract-pager/);
  assert.doesNotMatch(css, /content-visibility\s*:/);
  assert.doesNotMatch(css, /contain-intrinsic-size\s*:/);
  assert.match(css, /\.module-grid:has\(> \[data-service-root\]\),[\s\S]*?\.service-section-body\s*\{[\s\S]*?overflow-anchor:\s*none/);
  assert.doesNotMatch(css, /overflow-anchor:\s*auto/);
});

test("Active Service tab click is a no-op and Income is preloaded on idle", () => {
  const source = read("js/service.js");

  assert.match(source, /getServiceActivePanel\(\)\s*===\s*nextPanel[\s\S]*?activeTabNoopCount/);
  assert.match(source, /function scheduleServiceIncomePreload/);
  assert.match(source, /loadModuleBundle\?\.\("service-income"/);
  assert.match(source, /scheduleServiceIncomePreload\(user\)/);
});

test("Service browser regression covers frame-by-frame drift and responsive projects", () => {
  const source = read("tests/e2e/service-tab-stability.spec.cjs");
  const config = read("playwright.config.cjs");

  assert.match(source, /requestAnimationFrame\(\(\)\s*=>/);
  assert.match(source, /setTimeout\(\(\)\s*=>/);
  assert.match(source, /Math\.abs\(sample\.tabsTop - baseline\.tabsTop\)/);
  assert.match(source, /toBeLessThanOrEqual\(1\)/);
  assert.match(source, /lastRenderDurationMs/);
  assert.match(source, /generateWeeklyOffersCalls/);
  assert.match(source, /sectionRenderCount/);
  assert.match(config, /service-1320x720/);
  assert.match(config, /service-1265x720/);
  assert.match(config, /service-1180x720/);
});
