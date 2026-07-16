"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("Market modal layers are fixed to the viewport and neutralize backdrop hover styles", () => {
  const css = readProjectFile("css/housing.css");
  assert.match(css, /html\.housing-market-modal-open\s*\{[\s\S]*scrollbar-gutter:\s*auto/);
  assert.match(css, /body\.housing-market-modal-open \.screen\.is-active\s*\{[\s\S]*filter:\s*none;[\s\S]*transform:\s*none;/);
  assert.match(css, /\.housing-market-product-inspector-backdrop:hover/);
  assert.match(css, /\.housing-market-product-inspector-backdrop[\s\S]*position:\s*fixed;[\s\S]*width:\s*100vw/);
  assert.match(css, /\.housing-market-product-inspector-drawer[\s\S]*height:\s*100dvh;[\s\S]*position:\s*fixed/);
  assert.match(css, /\.housing-market-cart-backdrop:hover/);
  assert.match(css, /\.housing-market-wishlist-backdrop:hover/);
});

test("Market workspace exposes named wishlist management and whole-list cart transfer controls", () => {
  const source = readProjectFile("js/market-workspace-runtime.js");
  const drawer = extractFunctionSource(source, "renderMarketWorkspaceWishlistDrawer");
  const handler = extractFunctionSource(source, "handleMarketWorkspaceClick");

  assert.match(drawer, /data-housing-market-wishlist-create/);
  assert.match(drawer, /data-housing-market-wishlist-rename/);
  assert.match(drawer, /data-housing-market-wishlist-delete/);
  assert.match(drawer, /data-housing-market-wishlist-move/);
  assert.match(drawer, />MOVE LIST TO CART<\/button>/);
  assert.match(handler, /createMarketWishlist/);
  assert.match(handler, /renameMarketWishlist/);
  assert.match(handler, /deleteMarketWishlist/);
  assert.match(handler, /moveMarketWishlistToCart/);
});

test("Market bundle loads wishlist persistence before the workspace runtime", () => {
  const modules = readProjectFile("js/modules.js");
  const storeIndex = modules.indexOf('js/market-wishlist-store.js?v=1');
  const runtimeIndex = modules.indexOf('js/market-workspace-runtime.js?v=6');
  assert.ok(storeIndex >= 0);
  assert.ok(runtimeIndex > storeIndex);

  const adapters = readProjectFile("js/campaign-data-io-adapters.js");
  const identity = readProjectFile("js/citizen-identity.js");
  assert.match(adapters, /ws_market_wishlists_v1/);
  assert.match(identity, /ws_market_wishlists_v1/);
});
