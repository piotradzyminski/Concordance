window.WS_APP = window.WS_APP || {};

(function initSubscriptionDataCleanup() {
  const app = window.WS_APP;
  const RETIRED_SEED_CONTRACT_IDS = Object.freeze([
    "sub-citizen-a-mass-compression-capacity-licensed",
    "sub-citizen-b-mass-compression-capacity-corporate",
    "sub-citizen-b-habitat-secured"
  ]);
  const RETIRED_CATALOG_IDS = Object.freeze(["sub-skill-channel"]);
  const RETIRED_PROVIDER_IDS = Object.freeze(["provider-learnmin-access"]);
  const RETIRED_ORGANIZATION_IDS = Object.freeze(["learnmin-access"]);

  const retiredSeedContractIds = new Set(RETIRED_SEED_CONTRACT_IDS);

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function isRetiredSubscriptionSeedContractId(value = "") {
    return retiredSeedContractIds.has(normalizeId(value));
  }

  function cleanSubscriptionSeedContractList(value = []) {
    return (Array.isArray(value) ? value : [])
      .filter(Boolean)
      .filter((contract) => !isRetiredSubscriptionSeedContractId(
        contract?.subscriptionContractId || contract?.id
      ));
  }

  function cleanRetiredSubscriptionReference(value = "", emptyValue = "") {
    return isRetiredSubscriptionSeedContractId(value) ? emptyValue : value;
  }

  app.SUBSCRIPTION_DATA_CLEANUP_VERSION = "subscriptions_catalog_cleanup_4_7x";
  app.RETIRED_SUBSCRIPTION_SEED_CONTRACT_IDS = RETIRED_SEED_CONTRACT_IDS;
  app.RETIRED_SUBSCRIPTION_CATALOG_IDS = RETIRED_CATALOG_IDS;
  app.RETIRED_SUBSCRIPTION_PROVIDER_IDS = RETIRED_PROVIDER_IDS;
  app.RETIRED_SUBSCRIPTION_ORGANIZATION_IDS = RETIRED_ORGANIZATION_IDS;
  app.isRetiredSubscriptionSeedContractId = isRetiredSubscriptionSeedContractId;
  app.cleanSubscriptionSeedContractList = cleanSubscriptionSeedContractList;
  app.cleanRetiredSubscriptionReference = cleanRetiredSubscriptionReference;
})();
