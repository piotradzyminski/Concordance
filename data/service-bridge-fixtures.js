window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.serviceBridgeFixtureFlows = [
  {
    fixtureId: "service-fixture-install-success",
    label: "Cyberware install success",
    serviceDefinitionId: "svc-cyberware-install-standard",
    providerId: "provider-coremed-service",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-install"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: ["LEFT_EYE"],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-deinstall-success",
    label: "Cyberware deinstall success",
    serviceDefinitionId: "svc-cyberware-deinstall-standard",
    providerId: "provider-coremed-service",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-installed"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: ["LEFT_EYE"],
      returnLocation: {
        type: "HOUSING_STORAGE",
        housingStorageId: "fixture-housing-storage"
      }
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-replace-success",
    label: "Cyberware replace success",
    serviceDefinitionId: "svc-cyberware-replace-standard",
    providerId: "provider-mass-compression-service",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-installed", "fixture-item-replacement"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: ["NEURAL"],
      returnLocation: {
        type: "HOUSING_STORAGE",
        housingStorageId: "fixture-housing-storage"
      }
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-maintenance-success",
    label: "Cyberware repair success",
    serviceDefinitionId: "svc-cyberware-repair-standard",
    providerId: "provider-factory-commons",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-damaged"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-firmware-success",
    label: "Firmware update success",
    serviceDefinitionId: "svc-firmware-update-standard",
    providerId: "provider-kagami-kaisha",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-firmware"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-diagnostic-success",
    label: "Cyberware diagnostic success",
    serviceDefinitionId: "svc-cyberware-diagnostic-standard",
    providerId: "provider-coremed-service",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-diagnostic"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: false
    }
  },
  {
    fixtureId: "service-fixture-clean-success",
    label: "Cyberware cleaning success",
    serviceDefinitionId: "svc-cyberware-clean-standard",
    providerId: "provider-live-prevail",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-clean"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-license-review-success",
    label: "License review success",
    serviceDefinitionId: "svc-license-review-standard",
    providerId: "provider-perfectmin-licensed-clinics",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-license"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: true
    }
  },
  {
    fixtureId: "service-fixture-emergency-extraction-success",
    label: "Emergency extraction success",
    serviceDefinitionId: "svc-emergency-extraction-standard",
    providerId: "provider-trauma-team",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: [],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      itemCommitRequired: false
    }
  },
  {
    fixtureId: "service-fixture-operation-failed",
    label: "Cyberware operation failure",
    serviceDefinitionId: "svc-cyberware-calibrate-standard",
    providerId: "provider-somnacore",
    citizenId: "fixture-citizen",
    subjectRefs: {
      instanceIds: ["fixture-item-calibration"],
      targetCharacterId: "fixture-citizen",
      targetBodySlots: [],
      returnLocation: null
    },
    expected: {
      availability: "AVAILABLE",
      lifecycle: ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "FAILED"],
      terminalEventCode: "SERVICE.ORDER.FAILED",
      itemCommitRequired: false
    }
  }
];

window.APP_DATA.serviceBridgeFinalReadinessScenarios = [
  {
    scenarioId: "service-final-paid-success",
    category: "FULL_PAID_SUCCESS",
    fixtureId: "service-fixture-install-success",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "ENTITLEMENT_REVALIDATE",
      "COVERAGE_REVALIDATE",
      "BILLING_AUTHORIZE",
      "SCHEDULE",
      "START",
      "ITEM_TRANSACTION_COMMIT",
      "BILLING_CAPTURE",
      "COMPLETE"
    ],
    expected: {
      orderStatus: "COMPLETED",
      paymentStatus: "CAPTURED",
      itemTransactionStatus: "COMMITTED",
      terminalEventCode: "SERVICE.ORDER.COMPLETED",
      duplicateDomainEvents: 0,
      duplicateNotifications: 0
    }
  },
  {
    scenarioId: "service-final-covered-success",
    category: "FULL_COVERED_SUCCESS",
    fixtureId: "service-fixture-emergency-extraction-success",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "ENTITLEMENT_REVALIDATE",
      "COVERAGE_REVALIDATE",
      "AUTHORIZE_WITHOUT_BILLING_INTENT",
      "SCHEDULE",
      "START",
      "COMPLETE"
    ],
    expected: {
      orderStatus: "COMPLETED",
      paymentStatus: "COVERED",
      billingIntentCreated: false,
      terminalEventCode: "SERVICE.ORDER.COMPLETED"
    }
  },
  {
    scenarioId: "service-final-no-payment-success",
    category: "NO_PAYMENT_SUCCESS",
    fixtureId: "service-fixture-diagnostic-success",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "AUTHORIZE_WITHOUT_BILLING_INTENT",
      "SCHEDULE",
      "START",
      "COMPLETE"
    ],
    expected: {
      orderStatus: "COMPLETED",
      paymentStatus: "NOT_REQUIRED",
      billingIntentCreated: false,
      terminalEventCode: "SERVICE.ORDER.COMPLETED"
    }
  },
  {
    scenarioId: "service-final-cancel-before-execution",
    category: "PRE_EXECUTION_VOID",
    fixtureId: "service-fixture-clean-success",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "BILLING_AUTHORIZE",
      "BILLING_VOID",
      "CANCEL"
    ],
    expected: {
      orderStatus: "CANCELLED",
      paymentStatus: "VOIDED",
      itemTransactionCreated: false,
      terminalEventCode: "SERVICE.ORDER.CANCELLED"
    }
  },
  {
    scenarioId: "service-final-item-commit-before-capture-failure",
    category: "POST_ITEM_COMMIT_PRE_CAPTURE_COMPENSATION",
    fixtureId: "service-fixture-replace-success",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "BILLING_AUTHORIZE",
      "SCHEDULE",
      "START",
      "ITEM_TRANSACTION_COMMIT",
      "ITEM_TRANSACTION_COMPENSATE",
      "BILLING_VOID",
      "FAIL"
    ],
    expected: {
      orderStatus: "FAILED",
      paymentStatus: "VOIDED",
      itemTransactionStatus: "COMPENSATED",
      terminalEventCode: "SERVICE.ORDER.FAILED"
    }
  },
  {
    scenarioId: "service-final-capture-before-completion-failure",
    category: "POST_CAPTURE_REFUND_COMPENSATION",
    fixtureId: "service-fixture-maintenance-success",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "BILLING_AUTHORIZE",
      "SCHEDULE",
      "START",
      "ITEM_TRANSACTION_COMMIT",
      "BILLING_CAPTURE",
      "ITEM_TRANSACTION_COMPENSATE",
      "BILLING_REFUND",
      "FAIL"
    ],
    expected: {
      orderStatus: "FAILED",
      paymentStatus: "REFUNDED",
      itemTransactionStatus: "COMPENSATED",
      terminalEventCode: "SERVICE.ORDER.FAILED"
    }
  },
  {
    scenarioId: "service-final-operation-failure-no-item-commit",
    category: "FAILURE_WITHOUT_ITEM_MUTATION",
    fixtureId: "service-fixture-operation-failed",
    steps: [
      "QUOTE",
      "OFFER_CREATE",
      "ORDER_CREATE",
      "BILLING_AUTHORIZE",
      "SCHEDULE",
      "START",
      "BILLING_VOID",
      "FAIL"
    ],
    expected: {
      orderStatus: "FAILED",
      paymentStatus: "VOIDED",
      itemTransactionCreated: false,
      terminalEventCode: "SERVICE.ORDER.FAILED"
    }
  },
  {
    scenarioId: "service-final-idempotent-replay",
    category: "IDEMPOTENT_REPLAY",
    fixtureId: "service-fixture-firmware-success",
    steps: [
      "ORDER_CREATE",
      "ORDER_CREATE_REPLAY",
      "BILLING_AUTHORIZE",
      "BILLING_AUTHORIZE_REPLAY",
      "ITEM_TRANSACTION_COMMIT",
      "ITEM_TRANSACTION_COMMIT_REPLAY",
      "BILLING_CAPTURE",
      "BILLING_CAPTURE_REPLAY",
      "COMPLETE",
      "COMPLETE_REPLAY"
    ],
    expected: {
      sameOrderId: true,
      sameBillingIntentId: true,
      sameItemTransactionId: true,
      sameBillingTransactionId: true,
      duplicateDomainEvents: 0,
      duplicateNotifications: 0
    }
  },
  {
    scenarioId: "service-final-revision-conflict",
    category: "REVISION_CONFLICT",
    fixtureId: "service-fixture-license-review-success",
    steps: [
      "ORDER_READ",
      "ORDER_UPDATE",
      "STALE_ORDER_UPDATE_REJECT",
      "ITEM_TRANSACTION_COMMIT",
      "STALE_ITEM_TRANSACTION_REJECT"
    ],
    expected: {
      serviceReason: "SERVICE_ORDER_REVISION_CONFLICT",
      itemReason: "ITEM_INSTANCE_STORE_REVISION_CONFLICT",
      mutationAppliedAfterConflict: false
    }
  },
  {
    scenarioId: "service-final-notification-deduplication",
    category: "NOTIFICATION_DEDUPLICATION",
    fixtureId: "service-fixture-deinstall-success",
    steps: [
      "SCHEDULE",
      "SCHEDULE_REPLAY",
      "COMPLETE",
      "COMPLETE_REPLAY"
    ],
    expected: {
      scheduledNotifications: 1,
      completedNotifications: 1,
      duplicateNotifications: 0
    }
  }
];
