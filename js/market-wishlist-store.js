window.WS_APP = window.WS_APP || {};

(function initMarketWishlistStore(app) {
  "use strict";

  const STORAGE_KEY = "ws_market_wishlists_v1";
  const SCHEMA_VERSION = 1;
  const MAX_LISTS_PER_CITIZEN = 24;
  const MAX_LINES_PER_LIST = 250;
  const MAX_NAME_LENGTH = 48;

  function clone(value) {
    return value == null ? value : structuredClone(value);
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeName(value = "") {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NAME_LENGTH);
  }

  function clampQuantity(value = 1) {
    const parsed = Math.round(Number(value || 1));
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(99, Math.max(1, parsed));
  }

  function nowIso() {
    return String(app.getCampaignTimeIso?.() || app.getCampaignDateIso?.() || new Date().toISOString());
  }

  function makeRuntimeId(prefix = "wishlist") {
    const safePrefix = normalizeId(prefix).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "wishlist";
    if (globalThis.crypto?.randomUUID) return `${safePrefix}-${globalThis.crypto.randomUUID()}`;
    return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeWishlistLine(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const marketOfferId = normalizeId(source.marketOfferId || source.offerId);
    if (!marketOfferId) return null;
    return {
      wishlistLineId: normalizeId(source.wishlistLineId) || makeRuntimeId(`wishlist-line-${index + 1}`),
      marketOfferId,
      quantity: clampQuantity(source.quantity),
      addedAt: normalizeId(source.addedAt) || nowIso(),
      updatedAt: normalizeId(source.updatedAt) || normalizeId(source.addedAt) || nowIso()
    };
  }

  function normalizeWishlist(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const citizenId = normalizeId(source.citizenId);
    const name = normalizeName(source.name);
    if (!citizenId || !name) return null;
    const seenOffers = new Set();
    const lines = [];
    (Array.isArray(source.lines) ? source.lines : []).forEach((line, index) => {
      const normalized = normalizeWishlistLine(line, index);
      if (!normalized || seenOffers.has(normalized.marketOfferId)) return;
      seenOffers.add(normalized.marketOfferId);
      lines.push(normalized);
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      wishlistId: normalizeId(source.wishlistId) || makeRuntimeId("market-wishlist"),
      citizenId,
      name,
      lines: lines.slice(0, MAX_LINES_PER_LIST),
      createdAt: normalizeId(source.createdAt) || nowIso(),
      updatedAt: normalizeId(source.updatedAt) || normalizeId(source.createdAt) || nowIso(),
      revision: Math.max(1, Math.round(Number(source.revision || 1)))
    };
  }

  function readState() {
    try {
      const raw = window.localStorage?.getItem?.(STORAGE_KEY);
      if (!raw) return { schemaVersion: SCHEMA_VERSION, revision: 1, wishlists: [] };
      const parsed = JSON.parse(raw);
      const sourceLists = Array.isArray(parsed?.wishlists) ? parsed.wishlists : [];
      const seen = new Set();
      const wishlists = sourceLists.map(normalizeWishlist).filter((wishlist) => {
        if (!wishlist || seen.has(wishlist.wishlistId)) return false;
        seen.add(wishlist.wishlistId);
        return true;
      });
      return {
        schemaVersion: SCHEMA_VERSION,
        revision: Math.max(1, Math.round(Number(parsed?.revision || 1))),
        wishlists
      };
    } catch (error) {
      console.warn("Market wishlist state could not be read.", error);
      return { schemaVersion: SCHEMA_VERSION, revision: 1, wishlists: [] };
    }
  }

  let state = readState();

  function persistState(nextState = state) {
    try {
      window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(nextState));
      return true;
    } catch (error) {
      console.warn("Market wishlist state could not be persisted.", error);
      return false;
    }
  }

  function emitWishlistUpdate(wishlist = null, source = "MARKET_WISHLIST_UPDATED") {
    window.dispatchEvent?.(new CustomEvent("ws:market-wishlist-updated", {
      detail: {
        source,
        wishlistId: wishlist?.wishlistId || "",
        citizenId: wishlist?.citizenId || "",
        revision: wishlist?.revision || 0,
        storeRevision: state.revision
      }
    }));
  }

  function commitWishlists(wishlists = [], source = "MARKET_WISHLIST_UPDATED", changedWishlist = null) {
    const nextState = {
      schemaVersion: SCHEMA_VERSION,
      revision: state.revision + 1,
      wishlists: wishlists.map(normalizeWishlist).filter(Boolean)
    };
    if (!persistState(nextState)) return { ok: false, reason: "WISHLIST_PERSISTENCE_FAILED", wishlist: changedWishlist ? clone(changedWishlist) : null };
    state = nextState;
    const normalizedChanged = changedWishlist ? normalizeWishlist(changedWishlist) : null;
    emitWishlistUpdate(normalizedChanged, source);
    return { ok: true, reason: source, wishlist: normalizedChanged ? clone(normalizedChanged) : null };
  }

  function getMarketWishlist(wishlistId = "") {
    const id = normalizeId(wishlistId);
    const wishlist = state.wishlists.find((entry) => entry.wishlistId === id) || null;
    return wishlist ? clone(wishlist) : null;
  }

  function getCitizenMarketWishlists(citizenId = "") {
    const ownerId = normalizeId(citizenId);
    return state.wishlists
      .filter((wishlist) => wishlist.citizenId === ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name))
      .map(clone);
  }

  function findCitizenWishlistByName(citizenId = "", name = "", excludeWishlistId = "") {
    const ownerId = normalizeId(citizenId);
    const normalizedName = normalizeName(name).toLocaleLowerCase();
    const excludedId = normalizeId(excludeWishlistId);
    return state.wishlists.find((wishlist) => wishlist.citizenId === ownerId
      && wishlist.wishlistId !== excludedId
      && wishlist.name.toLocaleLowerCase() === normalizedName) || null;
  }

  function createMarketWishlist(citizenId = "", name = "") {
    const ownerId = normalizeId(citizenId);
    const normalizedName = normalizeName(name);
    if (!ownerId) return { ok: false, reason: "CITIZEN_ID_REQUIRED", wishlist: null };
    if (!normalizedName) return { ok: false, reason: "WISHLIST_NAME_REQUIRED", wishlist: null };
    if (getCitizenMarketWishlists(ownerId).length >= MAX_LISTS_PER_CITIZEN) return { ok: false, reason: "WISHLIST_LIMIT_REACHED", wishlist: null };
    if (findCitizenWishlistByName(ownerId, normalizedName)) return { ok: false, reason: "WISHLIST_NAME_EXISTS", wishlist: null };
    const wishlist = normalizeWishlist({
      wishlistId: makeRuntimeId("market-wishlist"),
      citizenId: ownerId,
      name: normalizedName,
      lines: [],
      revision: 1,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    return commitWishlists([...state.wishlists, wishlist], "MARKET_WISHLIST_CREATED", wishlist);
  }

  function renameMarketWishlist(wishlistId = "", name = "") {
    const current = getMarketWishlist(wishlistId);
    const normalizedName = normalizeName(name);
    if (!current) return { ok: false, reason: "WISHLIST_NOT_FOUND", wishlist: null };
    if (!normalizedName) return { ok: false, reason: "WISHLIST_NAME_REQUIRED", wishlist: current };
    if (findCitizenWishlistByName(current.citizenId, normalizedName, current.wishlistId)) return { ok: false, reason: "WISHLIST_NAME_EXISTS", wishlist: current };
    if (current.name === normalizedName) return { ok: true, reason: "NO_CHANGE", wishlist: current };
    const next = normalizeWishlist({ ...current, name: normalizedName, updatedAt: nowIso(), revision: current.revision + 1 });
    return commitWishlists(state.wishlists.map((wishlist) => wishlist.wishlistId === next.wishlistId ? next : wishlist), "MARKET_WISHLIST_RENAMED", next);
  }

  function deleteMarketWishlist(wishlistId = "") {
    const current = getMarketWishlist(wishlistId);
    if (!current) return { ok: false, reason: "WISHLIST_NOT_FOUND", wishlist: null };
    const result = commitWishlists(state.wishlists.filter((wishlist) => wishlist.wishlistId !== current.wishlistId), "MARKET_WISHLIST_DELETED", current);
    return { ...result, deletedWishlistId: current.wishlistId };
  }

  function addMarketWishlistLine(wishlistId = "", input = {}) {
    const current = getMarketWishlist(wishlistId);
    if (!current) return { ok: false, reason: "WISHLIST_NOT_FOUND", wishlist: null };
    const marketOfferId = normalizeId(input.marketOfferId || input.offerId);
    if (!marketOfferId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED", wishlist: current };
    if (typeof app.getMarketOffer === "function" && !app.getMarketOffer(marketOfferId)) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND", wishlist: current };
    const quantity = clampQuantity(input.quantity);
    const existingIndex = current.lines.findIndex((line) => line.marketOfferId === marketOfferId);
    let lines = [...current.lines];
    if (existingIndex >= 0) {
      lines[existingIndex] = {
        ...lines[existingIndex],
        quantity: clampQuantity(lines[existingIndex].quantity + quantity),
        updatedAt: nowIso()
      };
    } else {
      if (lines.length >= MAX_LINES_PER_LIST) return { ok: false, reason: "WISHLIST_LINE_LIMIT_REACHED", wishlist: current };
      lines.push(normalizeWishlistLine({ marketOfferId, quantity }, lines.length));
    }
    const next = normalizeWishlist({ ...current, lines, updatedAt: nowIso(), revision: current.revision + 1 });
    return commitWishlists(state.wishlists.map((wishlist) => wishlist.wishlistId === next.wishlistId ? next : wishlist), "MARKET_WISHLIST_LINE_ADDED", next);
  }

  function setMarketWishlistLineQuantity(wishlistId = "", wishlistLineId = "", quantity = 1) {
    const current = getMarketWishlist(wishlistId);
    if (!current) return { ok: false, reason: "WISHLIST_NOT_FOUND", wishlist: null };
    const lineId = normalizeId(wishlistLineId);
    const line = current.lines.find((entry) => entry.wishlistLineId === lineId) || null;
    if (!line) return { ok: false, reason: "WISHLIST_LINE_NOT_FOUND", wishlist: current };
    const parsed = Math.round(Number(quantity));
    const lines = parsed <= 0
      ? current.lines.filter((entry) => entry.wishlistLineId !== lineId)
      : current.lines.map((entry) => entry.wishlistLineId === lineId ? { ...entry, quantity: clampQuantity(parsed), updatedAt: nowIso() } : entry);
    const next = normalizeWishlist({ ...current, lines, updatedAt: nowIso(), revision: current.revision + 1 });
    return commitWishlists(state.wishlists.map((wishlist) => wishlist.wishlistId === next.wishlistId ? next : wishlist), parsed <= 0 ? "MARKET_WISHLIST_LINE_REMOVED" : "MARKET_WISHLIST_LINE_UPDATED", next);
  }

  function removeMarketWishlistLine(wishlistId = "", wishlistLineId = "") {
    return setMarketWishlistLineQuantity(wishlistId, wishlistLineId, 0);
  }

  function clearMarketWishlist(wishlistId = "") {
    const current = getMarketWishlist(wishlistId);
    if (!current) return { ok: false, reason: "WISHLIST_NOT_FOUND", wishlist: null };
    if (!current.lines.length) return { ok: true, reason: "WISHLIST_ALREADY_EMPTY", wishlist: current };
    const next = normalizeWishlist({ ...current, lines: [], updatedAt: nowIso(), revision: current.revision + 1 });
    return commitWishlists(state.wishlists.map((wishlist) => wishlist.wishlistId === next.wishlistId ? next : wishlist), "MARKET_WISHLIST_CLEARED", next);
  }

  function mergeWishlistLinesIntoCart(cart = {}, wishlist = {}, housingStorageId = "") {
    const destinationId = normalizeId(housingStorageId);
    const lines = Array.isArray(cart.lines) ? cart.lines.map(clone) : [];
    for (const wishlistLine of wishlist.lines) {
      const existingIndex = lines.findIndex((line) => normalizeId(line.marketOfferId) === wishlistLine.marketOfferId
        && String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() === "DELIVER_TO_HOUSING"
        && normalizeId(line.destinationRef?.housingStorageId) === destinationId);
      if (existingIndex >= 0) {
        const nextQuantity = Number(lines[existingIndex].quantity || 1) + Number(wishlistLine.quantity || 1);
        if (nextQuantity > 99) {
          return { ok: false, reason: "CART_LINE_QUANTITY_LIMIT", marketOfferId: wishlistLine.marketOfferId, lines };
        }
        lines[existingIndex] = { ...lines[existingIndex], quantity: nextQuantity };
      } else {
        lines.push({
          marketOfferId: wishlistLine.marketOfferId,
          quantity: wishlistLine.quantity,
          fulfillmentMode: "DELIVER_TO_HOUSING",
          destinationRef: { housingStorageId: destinationId }
        });
      }
    }
    return { ok: true, reason: "WISHLIST_CART_LINES_READY", lines };
  }

  function moveMarketWishlistToCart(wishlistId = "", input = {}) {
    const wishlist = getMarketWishlist(wishlistId);
    if (!wishlist) return { ok: false, reason: "WISHLIST_NOT_FOUND", wishlist: null, cart: null };
    if (!wishlist.lines.length) return { ok: false, reason: "WISHLIST_EMPTY", wishlist, cart: null };
    const housingStorageId = normalizeId(input.housingStorageId || input.destinationRef?.housingStorageId);
    if (!housingStorageId) return { ok: false, reason: "HOUSING_DESTINATION_REQUIRED", wishlist, cart: null };
    if (typeof app.getMarketOffer === "function") {
      const missingOffer = wishlist.lines.find((line) => !app.getMarketOffer(line.marketOfferId));
      if (missingOffer) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND", missingMarketOfferId: missingOffer.marketOfferId, wishlist, cart: null };
    }
    const existing = app.getActiveMarketCart?.(wishlist.citizenId, { create: false }) || null;
    if ((existing?.lines || []).some((line) => String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() !== "DELIVER_TO_HOUSING")) {
      return { ok: false, reason: "MIXED_FULFILLMENT_CART_NOT_SUPPORTED", wishlist, cart: existing };
    }
    const cart = existing || app.createMarketCart?.(wishlist.citizenId)?.cart || null;
    if (!cart) return { ok: false, reason: "MARKET_CART_CREATE_FAILED", wishlist, cart: null };
    const mergeResult = mergeWishlistLinesIntoCart(cart, wishlist, housingStorageId);
    if (!mergeResult.ok) return { ok: false, reason: mergeResult.reason, marketOfferId: mergeResult.marketOfferId || "", wishlist, cart };
    const cartResult = app.updateMarketCart?.(cart.cartId, { lines: mergeResult.lines }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE", cart };
    if (!cartResult.ok) return { ok: false, reason: cartResult.reason || "MARKET_CART_UPDATE_FAILED", wishlist, cart: cartResult.cart || cart };
    const clearResult = clearMarketWishlist(wishlist.wishlistId);
    if (!clearResult.ok) {
      return {
        ok: false,
        reason: "WISHLIST_CLEAR_FAILED_AFTER_CART_UPDATE",
        cart: cartResult.cart,
        wishlist,
        movedLineCount: wishlist.lines.length,
        movedItemCount: wishlist.lines.reduce((sum, line) => sum + line.quantity, 0)
      };
    }
    return {
      ok: true,
      reason: "WISHLIST_MOVED_TO_CART",
      cart: cartResult.cart,
      wishlist: clearResult.wishlist,
      movedLineCount: wishlist.lines.length,
      movedItemCount: wishlist.lines.reduce((sum, line) => sum + line.quantity, 0)
    };
  }

  function getMarketWishlistStoreSnapshot() {
    return clone(state);
  }

  Object.assign(app, {
    MARKET_WISHLIST_STORAGE_KEY: STORAGE_KEY,
    getMarketWishlist,
    getCitizenMarketWishlists,
    createMarketWishlist,
    renameMarketWishlist,
    deleteMarketWishlist,
    addMarketWishlistLine,
    setMarketWishlistLineQuantity,
    removeMarketWishlistLine,
    clearMarketWishlist,
    moveMarketWishlistToCart,
    getMarketWishlistStoreSnapshot
  });
})(window.WS_APP);
