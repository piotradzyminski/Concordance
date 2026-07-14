window.WS_APP = window.WS_APP || {};

(function registerCampaignDataIoAdapters(app) {
  "use strict";

  const C = app.CAMPAIGN_DATA_DOMAIN_CLASSIFICATIONS;
  const create = app.createLocalStorageCampaignDataAdapter;
  const register = app.registerCampaignDataDomainAdapter;
  if (!C || typeof create !== "function" || typeof register !== "function") return;

  function json(key, countPaths = []) {
    return { key, format: "JSON", countPaths };
  }

  function text(key) {
    return { key, format: "TEXT", countPaths: [] };
  }

  function registerStorage(definition) {
    const result = register(create(definition));
    if (!result?.ok) console.warn("W&S Campaign Data I/O adapter registration failed.", definition.domainId, result?.errors || result);
  }

  registerStorage({
    domainId: "campaign-clock",
    schemaVersion: "2",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      text("ws_app_campaign_time_iso_v1"),
      text("ws_app_campaign_time_revision_v1"),
      json("ws_app_campaign_time_receipts_v1"),
      text("ws_app_campaign_date_iso_v1"),
      text("ws_app_next_settlement_period_iso_v1")
    ]
  });

  registerStorage({
    domainId: "citizens",
    schemaVersion: "citizen_record_foundation_2_0x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_citizens_v1"), text("ws_app_citizen_record_schema")]
  });

  registerStorage({
    domainId: "users-access",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_users_v1"), json("ws_app_access_tags_v1")]
  });

  registerStorage({
    domainId: "citizen-files",
    schemaVersion: "citizen_files_record_relations_1_0x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_citizen_files_v1"), text("ws_app_citizen_files_schema")]
  });

  registerStorage({
    domainId: "citizen-command-receipts",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_citizen_command_receipts_v1")]
  });

  registerStorage({
    domainId: "item-instances",
    schemaVersion: "item_instance_foundation_6_1x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_item_instances_v1", ["items"])]
  });

  registerStorage({
    domainId: "item-instance-transactions",
    schemaVersion: "item_instance_transaction_compensation_6_2x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_item_instance_transactions_v1", ["transactions"])]
  });

  registerStorage({
    domainId: "billing",
    schemaVersion: "billing_bridge_schema_2_1x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_app_billing_intents_v2"),
      json("ws_app_billing_transactions_v2"),
      json("ws_app_billing_transfer_accounts_v1"),
      json("ws_app_billing_transfers_v1"),
      json("ws_app_billing_history_v1"),
      text("ws_app_billing_bridge_schema")
    ]
  });

  registerStorage({
    domainId: "subscriptions",
    schemaVersion: "subscriptions_public_api_3_1x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_subscription_command_receipts_v1"),
      json("ws_app_subscription_catalog_definitions_v1"),
      text("ws_app_subscription_catalog_definitions_schema"),
      json("ws_app_subscription_catalog_definitions_v2"),
      text("ws_app_subscription_catalog_definitions_schema_v2"),
      json("ws_app_subscription_catalog_definitions_v3"),
      text("ws_app_subscription_catalog_definitions_schema_v3"),
      text("ws_app_subscription_contracts_schema")
    ]
  });

  registerStorage({
    domainId: "service-bridge",
    schemaVersion: "services_bridge_operational_contract_2_5x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_service_bridge_store_v1", ["offers", "orders", "idempotency"]),
      text("ws_service_bridge_schema")
    ]
  });

  registerStorage({
    domainId: "market",
    schemaVersion: "market_service_fulfillment_fix_4_4x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_market_carts_v1", ["carts"]),
      json("ws_market_orders_v1", ["orders"]),
      json("ws_market_stock_v1", ["reservations", "stockReservations", "stock"])
    ]
  });

  registerStorage({
    domainId: "housing",
    schemaVersion: "housing_bridge_readiness_4_2x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_housing_placement_reservations_v1", ["reservations"])]
  });

  registerStorage({
    domainId: "world-bridge-operations",
    schemaVersion: "world_bridge_operation_recovery_1_0x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_world_bridge_operations_v1", ["operations"])],
    summarizeState(state, helpers) {
      const entry = state?.storage?.["ws_world_bridge_operations_v1"];
      let operations = [];
      if (entry?.present) {
        try { operations = helpers.parseRawValue(entry.value, "JSON")?.operations || []; }
        catch (error) { operations = []; }
      }
      const terminal = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
      const active = operations.filter((operation) => !terminal.has(String(operation?.status || "").toUpperCase()));
      return {
        recordCount: operations.length,
        activeOperationCount: active.length,
        activeOperationIds: active.map((operation) => String(operation?.operationId || "")).filter(Boolean)
      };
    }
  });

  registerStorage({
    domainId: "world-time-scheduler",
    schemaVersion: "world_time_service_completion_scheduler_1_2x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_world_time_service_scheduler_v1", ["receipts"]),
      text("ws_world_time_service_scheduler_schema")
    ]
  });

  registerStorage({
    domainId: "terminal-runtime",
    schemaVersion: "terminal_inbox_datetime_1_0x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_app_terminal_entries_v1"),
      json("ws_app_service_requests_v1"),
      json("ws_app_service_offers_v1"),
      json("ws_app_calendar_reminders_v1")
    ]
  });

  registerStorage({
    domainId: "admin-audit",
    schemaVersion: "admin_audit_store_3_0x",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [
      json("ws_admin_audit_store_v2", ["events"]),
      json("ws_admin_audit_recovery_v1", ["entries"]),
      json("futureNoir.adminAuditLog.v1")
    ],
    validateState(state, helpers) {
      const entry = state?.storage?.["ws_admin_audit_store_v2"];
      if (!entry?.present) return [];
      try {
        const parsed = helpers.parseRawValue(entry.value, "JSON");
        const validation = app.validateAdminAuditState?.(parsed);
        return validation?.ok === false ? validation.errors : [];
      } catch (error) {
        return [{ code: "ADMIN_AUDIT_STORE_INVALID" }];
      }
    },
    summarizeState(state, helpers) {
      const storeEntry = state?.storage?.["ws_admin_audit_store_v2"];
      const recoveryEntry = state?.storage?.["ws_admin_audit_recovery_v1"];
      let events = [];
      let recovery = [];
      try { if (storeEntry?.present) events = helpers.parseRawValue(storeEntry.value, "JSON")?.events || []; } catch (error) {}
      try { if (recoveryEntry?.present) recovery = helpers.parseRawValue(recoveryEntry.value, "JSON")?.entries || []; } catch (error) {}
      return { recordCount: events.length + recovery.length, eventCount: events.length, recoveryCount: recovery.length };
    }
  });

  registerStorage({
    domainId: "knowledge-entries",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_entries_v1"), text("ws_app_entries_schema")]
  });

  registerStorage({
    domainId: "addresses",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_addresses_v1")]
  });

  registerStorage({
    domainId: "tags",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_tags_v1")]
  });

  registerStorage({
    domainId: "system-records",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_system_records_v1"), text("ws_app_system_records_schema")]
  });

  registerStorage({
    domainId: "case-files",
    schemaVersion: "1",
    classification: C.CAMPAIGN_PERSISTENT,
    required: true,
    storageKeys: [json("ws_app_case_files_v1")]
  });

  registerStorage({
    domainId: "firmware-registry",
    schemaVersion: "firmware_registry_1_0x",
    classification: C.SEED_ONLY,
    required: false,
    storageKeys: []
  });

  registerStorage({
    domainId: "notification-catalog",
    schemaVersion: "world_bridge_notifications_2_1x",
    classification: C.SEED_ONLY,
    required: false,
    storageKeys: []
  });

  registerStorage({
    domainId: "equipment-derived-state",
    schemaVersion: "equipment_state_model",
    classification: C.DERIVED,
    required: false,
    storageKeys: []
  });

  registerStorage({
    domainId: "equipment-ui-sort-counter",
    schemaVersion: "1",
    classification: C.LOCAL_UI_ONLY,
    required: false,
    storageKeys: [text("ws_app_sort_counter_v1")]
  });

  registerStorage({
    domainId: "test-mode",
    schemaVersion: "1",
    classification: C.LOCAL_UI_ONLY,
    required: false,
    storageKeys: [text("ws_app_test_mode_v1")]
  });
})(window.WS_APP);
