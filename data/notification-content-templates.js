window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.NOTIFICATION_CONTENT_TEMPLATES = {
  schemaVersion: 1,
  version: "terminal_notification_content_projection_2_6x",

  templates: {
    "WORLD_OPERATION.STATUS_CHANGED": { templateId: "world-bridge-operation-status", kind: "WORLD_OPERATION" },

    "MARKET.ORDER.COMPLETED": { templateId: "market-order-status", kind: "MARKET_ORDER" },
    "MARKET.ORDER.CANCELLED": { templateId: "market-order-status", kind: "MARKET_ORDER" },
    "MARKET.ORDER.FAILED": { templateId: "market-order-status", kind: "MARKET_ORDER" },
    "MARKET.ORDER.REFUND_REQUESTED": { templateId: "market-order-status", kind: "MARKET_ORDER" },
    "MARKET.ORDER.REFUNDED": { templateId: "market-order-status", kind: "MARKET_ORDER" },
    "MARKET.ORDER.RECOVERY_REQUIRED": { templateId: "market-order-status", kind: "MARKET_ORDER" },

    "HOUSING.SHIPMENT.DELIVERED": { templateId: "housing-shipment-status", kind: "HOUSING_SHIPMENT" },
    "HOUSING.SHIPMENT.HELD": { templateId: "housing-shipment-status", kind: "HOUSING_SHIPMENT" },
    "HOUSING.STORAGE.CAPACITY_WARNING": { templateId: "housing-shipment-status", kind: "HOUSING_SHIPMENT" },

    "SERVICE.ORDER.SCHEDULED": { templateId: "service-order-status", kind: "SERVICE_ORDER" },
    "SERVICE.ORDER.COMPLETED": { templateId: "service-order-status", kind: "SERVICE_ORDER" },
    "SERVICE.ORDER.FAILED": { templateId: "service-order-status", kind: "SERVICE_ORDER" },
    "SERVICE.ORDER.CANCELLED": { templateId: "service-order-status", kind: "SERVICE_ORDER" },

    "SUBSCRIPTION.CONTRACT.CREATED": { templateId: "subscription-contract-status", kind: "SUBSCRIPTION" },
    "SUBSCRIPTION.ENTITLEMENT.CHANGED": { templateId: "subscription-contract-status", kind: "SUBSCRIPTION" },
    "SUBSCRIPTION.CONTRACT.CANCELLED": { templateId: "subscription-contract-status", kind: "SUBSCRIPTION" },
    "SUBSCRIPTION.BILLING.FAILED": { templateId: "subscription-contract-status", kind: "SUBSCRIPTION" },
    "SUBSCRIPTION.CONTRACT.SUSPENDED": { templateId: "subscription-contract-status", kind: "SUBSCRIPTION" },
    "SUBSCRIPTION.CONTRACT.RESTORED": { templateId: "subscription-contract-status", kind: "SUBSCRIPTION" },

    "BILLING.PAYMENT.AUTHORIZED": { templateId: "billing-payment-status", kind: "BILLING" },
    "BILLING.PAYMENT.CAPTURED": { templateId: "billing-payment-status", kind: "BILLING" },
    "BILLING.PAYMENT.FAILED": { templateId: "billing-payment-status", kind: "BILLING" },
    "BILLING.PAYMENT.REFUNDED": { templateId: "billing-payment-status", kind: "BILLING" },
    "BILLING.PAYMENT_RECOVERY_REQUIRED": { templateId: "billing-payment-status", kind: "BILLING" }
  },

  operationLabels: {
    PURCHASE_TO_HOUSING: "Cyberware purchase",
    PURCHASE_AND_INSTALL: "Cyberware purchase and installation",
    INSTALL: "Cyberware installation",
    DEINSTALL: "Cyberware removal",
    REPLACE: "Cyberware replacement",
    MAINTENANCE: "Cyberware maintenance",
    REPAIR: "Cyberware repair",
    CALIBRATION: "Cyberware calibration",
    FIRMWARE_UPDATE: "Firmware update",
    LICENSE_REVIEW: "Cyberware license review"
  },

  statusLabels: {
    DRAFT: "Draft",
    VALIDATING: "Validation in progress",
    RESERVED: "Resources reserved",
    PENDING: "Pending",
    PENDING_CONFIRMATION: "Pending confirmation",
    AUTHORIZED: "Authorized",
    SCHEDULED: "Scheduled",
    IN_PROGRESS: "In progress",
    COMMITTING: "Applying changes",
    CAPTURING: "Finalizing payment",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    SUSPENDED: "Suspended",
    RESTORED: "Restored",
    ACTIVE: "Active",
    ALLOWED: "Available",
    DENIED: "Unavailable",
    NOT_FOUND: "Unavailable",
    PAID: "Paid",
    CAPTURED: "Captured",
    PARTIALLY_CAPTURED: "Partially captured",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially refunded",
    VOIDED: "Voided",
    OVERDUE: "Overdue",
    RECOVERY_REQUIRED: "Recovery required",
    PAYMENT_RECOVERY_REQUIRED: "Payment recovery required",
    COMPENSATION_REQUIRED: "Compensation required",
    COMPENSATED: "Compensated",
    NOT_REQUIRED: "Not required"
  },

  paymentSourceLabels: {
    CREDITS: "Credits",
    DEBT_ACCOUNT: "Debt Account",
    COVERAGE: "Coverage",
    EXTERNAL: "External settlement"
  },

  reasonLabels: {
    INSUFFICIENT_CREDITS: "The account does not contain enough credits.",
    DEBT_LIMIT_EXCEEDED: "The Debt Account limit would be exceeded.",
    ACCOUNT_COMMIT_FAILED: "The account balance could not be updated.",
    TRANSACTION_PERSISTENCE_FAILED: "The payment record could not be saved.",
    INTENT_PERSISTENCE_FAILED: "The payment authorization could not be finalized.",
    BILLING_INTENT_NOT_FOUND: "The payment authorization is no longer available.",
    BILLING_TRANSACTION_NOT_FOUND: "The payment record is no longer available.",
    SUBSCRIPTION_BILLING_FAILED: "The subscription charge could not be completed.",
    PAYMENT_FAILED: "The payment could not be completed.",
    PAYMENT_RECOVERY_REQUIRED: "The payment requires manual recovery.",
    SERVICE_BILLING_VOID_REQUIRED: "The service payment authorization must be released.",
    SERVICE_BILLING_COMPENSATION_REQUIRED: "The captured service payment must be refunded.",
    SERVICE_ORDER_NOT_FOUND: "The service order is no longer available.",
    MARKET_ORDER_NOT_FOUND: "The market order is no longer available.",
    MARKET_ORDER_FAILED: "The order could not be completed.",
    MARKET_ORDER_CANCELLATION_INTERRUPTED: "The cancellation requires recovery.",
    MARKET_ORDER_REFUND_FINALIZATION_PERSISTENCE_FAILED: "The refund could not be finalized.",
    MARKET_ORDER_REFUND_RECOVERY_REQUIRED: "The refund requires recovery.",
    MARKET_SHIPMENT_DELIVERY_FAILED: "The shipment could not be delivered.",
    MARKET_SHIPMENT_CAPACITY_REQUIRED: "The destination storage does not have enough capacity.",
    HOUSING_STORAGE_FULL: "The destination storage does not have enough free grid space.",
    HOUSING_STORAGE_CAPACITY_EXCEEDED: "The destination storage capacity has been exceeded.",
    HOUSING_GRID_NO_SPACE: "No contiguous storage area is available for the shipment.",
    HOUSING_PLACEMENT_UNAVAILABLE: "The shipment cannot be placed in the selected Housing storage.",
    HOUSING_RESERVATION_PERSISTENCE_FAILED: "The Housing placement reservation could not be saved.",
    HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED: "The Housing delivery requires recovery before it can be finalized.",
    ITEM_INSTANCE_NOT_FOUND: "The referenced item is no longer available.",
    ENTITLEMENT_NOT_FOUND: "No active entitlement covers this request.",
    ENTITLEMENT_SUSPENDED: "The entitlement is currently suspended.",
    COVERAGE_TARGET_UNAVAILABLE: "The covered asset is no longer available.",
    CANCELLED: "The operation was cancelled.",
    FAILED: "The operation could not be completed.",
    NOT_FOUND: "The referenced record is no longer available."
  }
};
