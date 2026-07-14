"use strict";

function makeCitizen(overrides = {}) {
  return {
    id: "citizen-test",
    recordType: "citizen",
    recordState: "DRAFT",
    ownerUserId: "user-test",
    identity: { firstName: "Test", surname: "Citizen" },
    credits: 5000,
    debt: "0 ₡",
    revision: 1,
    ...structuredClone(overrides)
  };
}

function makeServiceOrder(overrides = {}) {
  return {
    serviceOrderId: "service-order-test",
    serviceOfferId: "service-offer-test",
    serviceDefinitionId: "service-definition-test",
    providerId: "provider-test",
    citizenId: "citizen-test",
    status: "DRAFT",
    paymentStatus: "NOT_REQUIRED",
    subjectRefs: { instanceIds: [], targetCharacterId: "citizen-test", targetBodySlots: [], returnLocation: null },
    quote: { grossPrice: 0, coveredAmount: 0, payableAmount: 0, currency: "CREDIT" },
    billingRefs: {},
    subscriptionRefs: [],
    insuranceRefs: [],
    createdAt: "2109-02-13T10:00:00.000Z",
    updatedAt: "2109-02-13T10:00:00.000Z",
    revision: 1,
    metadata: {},
    ...structuredClone(overrides)
  };
}

function makeWorldOperation(overrides = {}) {
  return {
    operationId: "world-operation-test",
    idempotencyKey: "world-operation-key",
    operationType: "INSTALL",
    citizenId: "citizen-test",
    providerId: "",
    status: "DRAFT",
    currentStep: "DRAFT",
    refs: { instanceIds: ["item-test"], housingReservationIds: [], marketStockReservationIds: [] },
    revision: 1,
    ...structuredClone(overrides)
  };
}

module.exports = { makeCitizen, makeServiceOrder, makeWorldOperation };
