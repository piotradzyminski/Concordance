window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.subscriptionBridgeFixtureFlows = [
  {
    fixtureId: "subscription-fixture-citizen-create-active",
    operation: "CREATE_CONTRACT",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-live-prevail",
    tierId: "lp-sustain",
    coverageTarget: { type: "CITIZEN", id: "fixture-citizen-a" },
    entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE_T2",
    expected: {
      createAllowed: true,
      entitlementStatus: "ACTIVE",
      targetValidation: "VALID",
      duplicatePolicy: "ONE_OPEN_CONTRACT_PER_EXACT_TARGET",
      idempotentReplayCreatesDuplicate: false
    }
  },
  {
    fixtureId: "subscription-fixture-citizen-provider-mismatch",
    operation: "RESOLVE_ENTITLEMENT",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-live-prevail",
    tierId: "lp-prevail",
    coverageTarget: { type: "CITIZEN", id: "fixture-citizen-a" },
    entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE_T3",
    providerId: "provider-trauma-team",
    expected: {
      allowed: false,
      status: "NOT_FOUND",
      reasonCode: "SUBSCRIPTION_PROVIDER_MISMATCH"
    }
  },
  {
    fixtureId: "subscription-fixture-item-create-active",
    operation: "CREATE_CONTRACT",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-kagami-sentinel",
    tierId: "kagami-torii",
    coverageTarget: { type: "ITEM_INSTANCE", id: "fixture-cyberware-a" },
    itemSnapshot: {
      instanceId: "fixture-cyberware-a",
      ownerId: "fixture-citizen-a",
      definitionId: "fixture-kagami-neurochip",
      lifecycleState: "STORED",
      location: { type: "HOUSING_STORAGE" },
      instanceData: {
        category: "CYBERWARE",
        subtype: "NEUROCHIP",
        tags: ["CYBERWARE", "NEUROCHIP"]
      }
    },
    entitlementCode: "KAGAMI_SENTINEL_ACCESS_T2",
    expected: {
      createAllowed: true,
      entitlementStatus: "ACTIVE",
      targetValidation: "VALID",
      idempotentReplayCreatesDuplicate: false
    }
  },
  {
    fixtureId: "subscription-fixture-item-owner-mismatch",
    operation: "VALIDATE_TARGET",
    citizenId: "fixture-citizen-b",
    subscriptionCatalogId: "sub-kagami-sentinel",
    tierId: "kagami-mirror",
    coverageTarget: { type: "ITEM_INSTANCE", id: "fixture-cyberware-a" },
    itemSnapshot: {
      instanceId: "fixture-cyberware-a",
      ownerId: "fixture-citizen-a",
      definitionId: "fixture-kagami-neurochip",
      lifecycleState: "STORED",
      location: { type: "HOUSING_STORAGE" },
      instanceData: {
        category: "CYBERWARE",
        subtype: "NEUROCHIP",
        tags: ["CYBERWARE", "NEUROCHIP"]
      }
    },
    expected: {
      createAllowed: false,
      reasonCode: "SUBSCRIPTION_ITEM_TARGET_OWNER_MISMATCH"
    }
  },
  {
    fixtureId: "subscription-fixture-item-ineligible",
    operation: "VALIDATE_TARGET",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-mass-compression-service",
    tierId: "capacity-licensed",
    coverageTarget: { type: "ITEM_INSTANCE", id: "fixture-cyberware-a" },
    itemSnapshot: {
      instanceId: "fixture-cyberware-a",
      ownerId: "fixture-citizen-a",
      definitionId: "fixture-kagami-neurochip",
      lifecycleState: "STORED",
      location: { type: "HOUSING_STORAGE" },
      instanceData: {
        category: "CYBERWARE",
        subtype: "NEUROCHIP",
        tags: ["CYBERWARE", "NEUROCHIP"]
      }
    },
    expected: {
      createAllowed: false,
      reasonCode: "SUBSCRIPTION_ITEM_TARGET_CATEGORY_INELIGIBLE"
    }
  },
  {
    fixtureId: "subscription-fixture-item-distinct-targets",
    operation: "CREATE_MULTIPLE_TARGET_CONTRACTS",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-coremed-service",
    tierId: "cms-field",
    coverageTargets: [
      { type: "ITEM_INSTANCE", id: "fixture-cyberware-a" },
      { type: "ITEM_INSTANCE", id: "fixture-cyberware-b" }
    ],
    expected: {
      createAllowed: true,
      openContractCount: 2,
      duplicateExactTargetAllowed: false,
      distinctTargetsAllowed: true
    }
  },
  {
    fixtureId: "subscription-fixture-item-target-loss",
    operation: "RECONCILE_TARGET",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-coremed-service",
    tierId: "cms-priority",
    coverageTarget: { type: "ITEM_INSTANCE", id: "fixture-cyberware-a" },
    expected: {
      contractRecordPreserved: true,
      entitlementStatus: "REVOKED",
      eventName: "ws:subscription-entitlement-changed",
      contractRevisionIncremented: false
    }
  },
  {
    fixtureId: "subscription-fixture-noop-event",
    operation: "NOOP_COMMAND",
    citizenId: "fixture-citizen-a",
    subscriptionCatalogId: "sub-live-prevail",
    tierId: "lp-live",
    coverageTarget: { type: "CITIZEN", id: "fixture-citizen-a" },
    expected: {
      revisionIncremented: false,
      updatedEventEmitted: false,
      entitlementEventEmitted: false
    }
  }
];
