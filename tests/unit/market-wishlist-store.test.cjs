"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createWishlistHarness(storage) {
  let cart = null;
  const offers = new Map([
    ["offer-a", { marketOfferId: "offer-a" }],
    ["offer-b", { marketOfferId: "offer-b" }]
  ]);
  const wsApp = {
    getCampaignTimeIso: () => "2109-02-13T12:00:00.000Z",
    getMarketOffer: (id) => offers.get(id) || null,
    getActiveMarketCart: () => cart ? structuredClone(cart) : null,
    createMarketCart(citizenId) {
      cart = { cartId: "cart-a", citizenId, status: "DRAFT", revision: 1, lines: [] };
      return { ok: true, cart: structuredClone(cart) };
    },
    updateMarketCart(cartId, changes) {
      assert.equal(cartId, "cart-a");
      cart = { ...cart, lines: structuredClone(changes.lines || []), revision: cart.revision + 1 };
      return { ok: true, reason: "UPDATED", cart: structuredClone(cart) };
    }
  };
  const runtime = createBrowserRuntime({ wsApp, storage });
  runtime.load("js/market-wishlist-store.js");
  return { runtime, getCart: () => structuredClone(cart), offers };
}

test("named Market wishlists persist, enforce unique names and merge repeated offers", () => {
  const first = createWishlistHarness();
  const api = first.runtime.window.WS_APP;

  const created = api.createMarketWishlist("citizen-a", "Neural Upgrades");
  assert.equal(created.ok, true);
  assert.equal(created.wishlist.name, "Neural Upgrades");
  assert.equal(api.createMarketWishlist("citizen-a", " neural   upgrades ").reason, "WISHLIST_NAME_EXISTS");

  const addOne = api.addMarketWishlistLine(created.wishlist.wishlistId, { marketOfferId: "offer-a", quantity: 2 });
  assert.equal(addOne.ok, true);
  const addAgain = api.addMarketWishlistLine(created.wishlist.wishlistId, { marketOfferId: "offer-a", quantity: 3 });
  assert.equal(addAgain.ok, true);
  assert.equal(addAgain.wishlist.lines.length, 1);
  assert.equal(addAgain.wishlist.lines[0].quantity, 5);

  const renamed = api.renameMarketWishlist(created.wishlist.wishlistId, "Priority Hardware");
  assert.equal(renamed.ok, true);
  assert.equal(renamed.wishlist.name, "Priority Hardware");

  const reloaded = createWishlistHarness(first.runtime.storage);
  const persisted = reloaded.runtime.window.WS_APP.getCitizenMarketWishlists("citizen-a");
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].name, "Priority Hardware");
  assert.equal(persisted[0].lines[0].quantity, 5);
});

test("moving a whole wishlist updates the delivery cart once and clears the named list", () => {
  const { runtime, getCart } = createWishlistHarness();
  const api = runtime.window.WS_APP;
  const wishlist = api.createMarketWishlist("citizen-a", "Clinic Run").wishlist;
  api.addMarketWishlistLine(wishlist.wishlistId, { marketOfferId: "offer-a", quantity: 2 });
  api.addMarketWishlistLine(wishlist.wishlistId, { marketOfferId: "offer-b", quantity: 1 });

  const result = api.moveMarketWishlistToCart(wishlist.wishlistId, { housingStorageId: "storage-a" });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.movedLineCount, 2);
  assert.equal(result.movedItemCount, 3);

  const cart = getCart();
  assert.equal(cart.lines.length, 2);
  assert.deepEqual(cart.lines.map((line) => [line.marketOfferId, line.quantity, line.fulfillmentMode, line.destinationRef.housingStorageId]), [
    ["offer-a", 2, "DELIVER_TO_HOUSING", "storage-a"],
    ["offer-b", 1, "DELIVER_TO_HOUSING", "storage-a"]
  ]);
  assert.equal(api.getMarketWishlist(wishlist.wishlistId).lines.length, 0);
});

test("wishlist move refuses to mix delivery lines with an active pickup cart", () => {
  const harness = createWishlistHarness();
  const api = harness.runtime.window.WS_APP;
  const originalCreate = api.createMarketCart;
  originalCreate("citizen-a");
  api.updateMarketCart("cart-a", { lines: [{ marketOfferId: "offer-a", quantity: 1, fulfillmentMode: "PICKUP", destinationRef: null }] });

  const wishlist = api.createMarketWishlist("citizen-a", "Later").wishlist;
  api.addMarketWishlistLine(wishlist.wishlistId, { marketOfferId: "offer-b", quantity: 1 });
  const result = api.moveMarketWishlistToCart(wishlist.wishlistId, { housingStorageId: "storage-a" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "MIXED_FULFILLMENT_CART_NOT_SUPPORTED");
  assert.equal(api.getMarketWishlist(wishlist.wishlistId).lines.length, 1);
});

test("wishlist move rejects a merged cart line above the canonical quantity limit", () => {
  const harness = createWishlistHarness();
  const api = harness.runtime.window.WS_APP;
  const created = api.createMarketWishlist("citizen-a", "Bulk");
  api.addMarketWishlistLine(created.wishlist.wishlistId, { marketOfferId: "offer-a", quantity: 20 });
  const cart = api.createMarketCart("citizen-a").cart;
  api.updateMarketCart(cart.cartId, {
    lines: [{ marketOfferId: "offer-a", quantity: 90, fulfillmentMode: "DELIVER_TO_HOUSING", destinationRef: { housingStorageId: "storage-a" } }]
  });

  const result = api.moveMarketWishlistToCart(created.wishlist.wishlistId, { housingStorageId: "storage-a" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "CART_LINE_QUANTITY_LIMIT");
  assert.equal(api.getActiveMarketCart("citizen-a", { create: false }).lines[0].quantity, 90);
  assert.equal(api.getMarketWishlist(created.wishlist.wishlistId).lines[0].quantity, 20);
});
