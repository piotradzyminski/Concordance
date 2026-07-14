window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.inboxNotificationTypes = [
  {
    id: "BILLING",
    label: "Billing",
    description: "Credits, debt, settlements, payments and ledger-backed financial events.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN BILLING", module: "terminal-hub", panel: "billing" },
    subtypes: [
      { id: "BILLING_STATEMENT", label: "Billing statement", severity: "INFO" },
      { id: "WEEKLY_SETTLEMENT_REPORT", label: "Weekly settlement report", severity: "NOTICE" },
      { id: "CREDIT_TRANSFER_IN", label: "Incoming transfer", severity: "INFO" },
      { id: "CREDIT_TRANSFER_OUT", label: "Outgoing transfer", severity: "INFO" },
      { id: "CREDIT_ADJUSTMENT", label: "Credit adjustment", severity: "NOTICE" },
      { id: "ADMINISTRATIVE_CORRECTION", label: "Administrative correction", severity: "NOTICE" },
      { id: "SUBSCRIPTION_PAYMENT", label: "Subscription payment", severity: "INFO" },
      { id: "DEBT_PAYMENT", label: "Debt payment", severity: "INFO" },
      { id: "DEBT_CREATED", label: "Debt created", severity: "WARNING" },
      { id: "DEBT_INCREASED", label: "Debt increased", severity: "WARNING" },
      { id: "DEBT_REDUCED", label: "Debt reduced", severity: "INFO" },
      { id: "DEBT_RECOVERY", label: "Debt recovery", severity: "INFO" },
      { id: "PAYMENT_FAILED", label: "Payment failed", severity: "WARNING" },
      { id: "PAYMENT_CONFIRMED", label: "Payment confirmed", severity: "INFO" },
      { id: "LEDGER_CLEARED", label: "Ledger cleared", severity: "NOTICE" },
      { id: "BILLING_WARNING", label: "Billing warning", severity: "WARNING" },
      { id: "NEGATIVE_BALANCE_WARNING", label: "Negative balance warning", severity: "CRITICAL" },
      { id: "DEBT_WARNING", label: "Debt warning", severity: "WARNING" },
      { id: "DEBT_PAYMENT_DUE", label: "Debt payment due", severity: "WARNING" },
      { id: "DEBT_PAYMENT_CONFIRMED", label: "Debt payment confirmed", severity: "INFO" }
    ]
  },
  {
    id: "SUBSCRIPTION",
    label: "Subscription",
    description: "Activation, renewal, tier, status, cancellation and subscription-record lifecycle events.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN SUBSCRIPTIONS", module: "subscriptions", panel: "" },
    subtypes: [
      { id: "SUBSCRIPTION_ACTIVATED", label: "Subscription activated", severity: "INFO" },
      { id: "SUBSCRIPTION_RENEWED", label: "Subscription renewed", severity: "INFO" },
      { id: "SUBSCRIPTION_TIER_CHANGED", label: "Subscription tier changed", severity: "NOTICE" },
      { id: "SUBSCRIPTION_STATUS_CHANGED", label: "Subscription status changed", severity: "NOTICE" },
      { id: "SUBSCRIPTION_CANCELLED", label: "Subscription cancelled", severity: "NOTICE" },
      { id: "SUBSCRIPTION_TERMINATED", label: "Subscription terminated", severity: "CRITICAL" },
      { id: "SUBSCRIPTION_SUSPENDED", label: "Subscription suspended", severity: "CRITICAL" },
      { id: "SUBSCRIPTION_RESTORED", label: "Subscription restored", severity: "INFO" },
      { id: "SUBSCRIPTION_OVERDUE", label: "Subscription overdue", severity: "WARNING" },
      { id: "SUBSCRIPTION_PAYMENT_FAILED", label: "Subscription payment failed", severity: "WARNING" },
      { id: "SUBSCRIPTION_REQUIRES_ACTION", label: "Subscription requires action", severity: "WARNING" },
      { id: "SUBSCRIPTION_RECORDS_CLEARED", label: "Subscription records cleared", severity: "NOTICE" },
      { id: "SUBSCRIPTION_LIMIT_REACHED", label: "Subscription limit reached", severity: "WARNING" }
    ]
  },
  {
    id: "SERVICE",
    label: "Service",
    description: "Service records, work state, active jobs, commissions and payout lifecycle events.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN SERVICE", module: "service", panel: "" },
    subtypes: [
      { id: "SERVICE_AVAILABLE", label: "Service available", severity: "INFO" },
      { id: "SERVICE_ASSIGNED", label: "Service assigned", severity: "NOTICE" },
      { id: "SERVICE_ACCEPTED", label: "Service accepted", severity: "INFO" },
      { id: "SERVICE_STARTED", label: "Service started", severity: "INFO" },
      { id: "SERVICE_STATUS_CHANGED", label: "Service status changed", severity: "NOTICE" },
      { id: "SERVICE_COMPLETED", label: "Service completed", severity: "INFO" },
      { id: "SERVICE_FAILED", label: "Service failed", severity: "WARNING" },
      { id: "SERVICE_CANCELLED", label: "Service cancelled", severity: "NOTICE" },
      { id: "SERVICE_OFFER_REJECTED", label: "Service offer rejected", severity: "NOTICE" },
      { id: "SERVICE_TERMINATED", label: "Service terminated", severity: "CRITICAL" },
      { id: "SERVICE_ARCHIVED", label: "Service archived", severity: "NOTICE" },
      { id: "SERVICE_RECORD_REMOVED", label: "Service record removed", severity: "NOTICE" },
      { id: "SERVICE_PAYMENT_PENDING", label: "Service payment pending", severity: "NOTICE" },
      { id: "SERVICE_PAYMENT_CONFIRMED", label: "Service payment confirmed", severity: "INFO" },
      { id: "COMMISSION_PAYOUT_PENDING", label: "Commission payout pending", severity: "NOTICE" },
      { id: "COMMISSION_PAYOUT_APPROVED", label: "Commission payout approved", severity: "INFO" },
      { id: "COMMISSION_PAYOUT_REJECTED", label: "Commission payout rejected", severity: "WARNING" },
      { id: "SERVICE_REQUIRES_REVIEW", label: "Service requires review", severity: "WARNING" }
    ]
  },
  {
    id: "REQUEST",
    label: "Request",
    description: "Citizen requests and admin/system response lifecycle.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN REQUESTS", module: "terminal-hub", panel: "requests" },
    subtypes: [
      { id: "REQUEST_CREATED", label: "Request created", severity: "INFO" },
      { id: "REQUEST_RECEIVED", label: "Request received", severity: "INFO" },
      { id: "REQUEST_UNDER_REVIEW", label: "Request under review", severity: "NOTICE" },
      { id: "REQUEST_APPROVED", label: "Request approved", severity: "INFO" },
      { id: "REQUEST_DENIED", label: "Request denied", severity: "WARNING" },
      { id: "REQUEST_ESCALATED", label: "Request escalated", severity: "WARNING" },
      { id: "REQUEST_CLOSED", label: "Request closed", severity: "NOTICE" },
      { id: "REQUEST_CANCELLED", label: "Request cancelled", severity: "NOTICE" },
      { id: "REQUEST_ADDITIONAL_DATA_REQUIRED", label: "Additional data required", severity: "WARNING" },
      { id: "REQUEST_UPDATED", label: "Request updated", severity: "NOTICE" },
      { id: "REQUEST_REMOVED", label: "Request removed", severity: "NOTICE" }
    ]
  },
  {
    id: "CALENDAR",
    label: "Calendar",
    description: "Calendar records, registered reminders and triggered reminder events.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN CALENDAR", module: "terminal-hub", panel: "inbox" },
    subtypes: [
      { id: "CALENDAR_EVENT_CREATED", label: "Calendar event created", severity: "INFO" },
      { id: "CALENDAR_EVENT_UPDATED", label: "Calendar event updated", severity: "NOTICE" },
      { id: "CALENDAR_EVENT_CANCELLED", label: "Calendar event cancelled", severity: "WARNING" },
      { id: "CALENDAR_REMINDER_REGISTERED", label: "Calendar reminder registered", severity: "INFO" },
      { id: "CALENDAR_REMINDER_TRIGGERED", label: "Calendar reminder triggered", severity: "NOTICE" },
      { id: "APPOINTMENT_REMINDER", label: "Appointment reminder", severity: "NOTICE" },
      { id: "DEADLINE_WARNING", label: "Deadline warning", severity: "WARNING" },
      { id: "PAYMENT_DEADLINE_WARNING", label: "Payment deadline warning", severity: "WARNING" },
      { id: "SERVICE_DEADLINE_WARNING", label: "Service deadline warning", severity: "WARNING" },
      { id: "SETTLEMENT_REMINDER", label: "Settlement reminder", severity: "NOTICE" }
    ]
  },
  {
    id: "PROFILE",
    label: "Profile",
    description: "Citizen profile, risk, address, contact and income-source changes.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN PROFILE", module: "citizen-card", panel: "" },
    subtypes: [
      { id: "PROFILE_UPDATED", label: "Profile updated", severity: "NOTICE" },
      { id: "PROFILE_STATUS_CHANGED", label: "Profile status changed", severity: "WARNING" },
      { id: "PROFILE_FIELD_UPDATED", label: "Profile field updated", severity: "INFO" },
      { id: "RISK_LEVEL_CHANGED", label: "Risk level changed", severity: "WARNING" },
      { id: "COMPLIANCE_STATUS_CHANGED", label: "Compliance status changed", severity: "WARNING" },
      { id: "ADDRESS_UPDATED", label: "Address updated", severity: "NOTICE" },
      { id: "CONTACT_DATA_UPDATED", label: "Contact data updated", severity: "INFO" },
      { id: "INCOME_SOURCE_REGISTERED", label: "Income source registered", severity: "INFO" },
      { id: "INCOME_SOURCE_UPDATED", label: "Income source updated", severity: "NOTICE" },
      { id: "INCOME_SOURCE_ARCHIVED", label: "Income source archived", severity: "NOTICE" },
      { id: "INCOME_SOURCE_RESTORED", label: "Income source restored", severity: "INFO" },
      { id: "INCOME_SOURCE_REMOVED", label: "Income source removed", severity: "NOTICE" }
    ]
  },
  {
    id: "ACCESS",
    label: "Access",
    description: "Access, clearance, module visibility and record permission events.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN DATABASE", module: "database", panel: "" },
    subtypes: [
      { id: "ACCESS_GRANTED", label: "Access granted", severity: "INFO" },
      { id: "ACCESS_DENIED", label: "Access denied", severity: "WARNING" },
      { id: "ACCESS_REVOKED", label: "Access revoked", severity: "WARNING" },
      { id: "ACCESS_UPDATED", label: "Access updated", severity: "NOTICE" },
      { id: "CLEARANCE_UPDATED", label: "Clearance updated", severity: "NOTICE" },
      { id: "MODULE_ACCESS_GRANTED", label: "Module access granted", severity: "INFO" },
      { id: "MODULE_ACCESS_DENIED", label: "Module access denied", severity: "WARNING" },
      { id: "MODULE_ACCESS_REVOKED", label: "Module access revoked", severity: "WARNING" },
      { id: "RECORD_ACCESS_GRANTED", label: "Record access granted", severity: "INFO" },
      { id: "RECORD_ACCESS_DENIED", label: "Record access denied", severity: "WARNING" },
      { id: "RECORD_ACCESS_REVOKED", label: "Record access revoked", severity: "WARNING" },
      { id: "VISIBILITY_CHANGED", label: "Visibility changed", severity: "NOTICE" }
    ]
  },
  {
    id: "DATABASE",
    label: "Database",
    description: "Record, citizen-file and case-file lifecycle notifications.",
    defaultSeverity: "NOTICE",
    defaultAction: { label: "OPEN DATABASE", module: "database", panel: "" },
    subtypes: [
      { id: "RECORD_ADDED", playerVisible: false, label: "Record added", severity: "INFO" },
      { id: "RECORD_UPDATED", playerVisible: false, label: "Record updated", severity: "NOTICE" },
      { id: "RECORD_REMOVED", playerVisible: false, label: "Record removed", severity: "WARNING" },
      { id: "RECORD_CORRECTED", playerVisible: false, label: "Record corrected", severity: "NOTICE" },
      { id: "RECORD_RECLASSIFIED", label: "Record reclassified", severity: "WARNING" },
      { id: "DATABASE_UPDATED", playerVisible: false, label: "Database updated", severity: "NOTICE" },
      { id: "CASE_FILE_ATTACHED", label: "Case file attached", severity: "NOTICE" },
      { id: "CASE_FILE_REMOVED", label: "Case file removed", severity: "NOTICE" },
      { id: "CITIZEN_FILE_UPDATED", playerVisible: false, label: "Citizen file updated", severity: "NOTICE" },
      { id: "CITIZEN_RECORD_UPDATED", playerVisible: false, label: "Citizen record updated", severity: "NOTICE" }
    ]
  },
  {
    id: "SYSTEM",
    label: "System",
    description: "Terminal runtime notices and local store technical events only.",
    defaultSeverity: "INFO",
    defaultAction: { label: "OPEN TERMINAL", module: "terminal-hub", panel: "inbox" },
    subtypes: [
      { id: "SYSTEM_NOTICE", label: "System notice", severity: "INFO" },
      { id: "SYSTEM_WARNING", label: "System warning", severity: "WARNING" },
      { id: "SYSTEM_ERROR", label: "System error", severity: "CRITICAL" },
      { id: "SESSION_STARTED", playerVisible: false, label: "Session started", severity: "INFO" },
      { id: "SESSION_ENDED", playerVisible: false, label: "Session ended", severity: "INFO" },
      { id: "LOCAL_DATA_SYNCED", playerVisible: false, label: "Local data synced", severity: "INFO" },
      { id: "LOCAL_DATA_IMPORT_COMPLETED", playerVisible: false, label: "Local import completed", severity: "NOTICE" },
      { id: "LOCAL_DATA_EXPORT_COMPLETED", playerVisible: false, label: "Local export completed", severity: "NOTICE" },
      { id: "LOCAL_DATA_RESET_WARNING", playerVisible: false, label: "Local reset warning", severity: "CRITICAL" },
      { id: "TERMINAL_MODULE_UPDATED", playerVisible: false, label: "Terminal module updated", severity: "NOTICE" }
    ]
  }
];
