# Documentation

## Authority

When documents disagree, use this order:

```text
1. project.md
2. docs/PATCH_STATE.md
3. docs/FILE_MAP.md
4. docs/ROADMAP.md
5. docs/contracts/**
```

Root `PATCH_STATE.md` and `FILE_MAP.md` are pointers, not competing copies.

## Repository policy

The active tree contains current documentation only.

Not committed:

```text
completed patch notes
superseded audits
implemented plans
retirement tombstones
removed-file placeholder documents
```

Git history and released archives preserve implementation history. A temporary audit or plan may be used during work, but it should be removed or converted into a current contract/state entry when its scope is closed.

## Canonical state documents

```text
project.md
PATCH_STATE.md
FILE_MAP.md
docs/PATCH_STATE.md
docs/FILE_MAP.md
docs/ROADMAP.md
```

## Active contracts

### Core

```text
docs/contracts/core/item_instance_contract.md
docs/contracts/core/item_instance_transaction_contract.md
docs/contracts/core/billing_bridge_contract.md
docs/contracts/core/coverage_contract.md
docs/contracts/core/campaign_data_io_v6_contract.md
```

### Citizen

```text
docs/contracts/citizen/citizen_record_contract.md
docs/contracts/citizen/citizen_creator_contract.md
docs/contracts/citizen/citizen_card_editor_contract.md
docs/contracts/citizen/citizen_creator_editor_polish_contract.md
docs/contracts/citizen/citizen_files_contract.md
docs/contracts/citizen/database_record_relations_contract.md
```

### Admin

```text
docs/contracts/admin/admin_dependency_guard_contract.md
docs/contracts/admin/admin_operations_workspace_contract.md
docs/contracts/admin/admin_record_lifecycle_contract.md
docs/contracts/admin/admin_audit_store_contract.md
docs/contracts/admin/admin_workspace_runtime_contract.md
docs/contracts/admin/admin_transfers_contract.md
```

### Services and subscriptions

```text
docs/contracts/services/service_bridge_contract.md
docs/contracts/services/service_ui_render_contract.md
docs/contracts/services/subscription_contracts_contract.md
```

### Commerce and Housing

```text
docs/contracts/commerce/market_bridge_contract.md
docs/contracts/commerce/market_delivery_fulfillment_contract.md
docs/contracts/commerce/market_cart_navigation_contract.md
docs/contracts/commerce/housing_household_foundation_contract.md
docs/contracts/commerce/housing_household_furnishing_workspace_contract.md
docs/contracts/commerce/market_partial_return_refund_contract.md
docs/contracts/commerce/market_product_visual_assets_contract.md
docs/contracts/commerce/housing_bridge_contract.md
docs/contracts/commerce/housing_grid_engine_unification_contract.md
```

### Equipment

```text
docs/contracts/equipment/equipment_state_model.md
docs/contracts/equipment/equipment_item_tooltips_contract.md
docs/contracts/equipment/equipment_cyberware_laterality_contract.md
docs/contracts/equipment/equipment_bodymap_view_contract.md
docs/contracts/equipment/equipment_selection_fast_path_contract.md
docs/contracts/equipment/item_grid_presentation_contract.md
```

### Cyberware

```text
docs/contracts/cyberware/cyberware_runtime_contract.md
docs/contracts/cyberware/cyberware_planner_contract.md
docs/contracts/cyberware/cyberware_core_stack_contract.md
docs/contracts/cyberware/cyberware_authorization_contract.md
docs/contracts/cyberware/cyberware_diagnostics_contract.md
docs/contracts/cyberware/cyberware_maintenance_contract.md
docs/contracts/cyberware/cyberware_contract_stability_contract.md
docs/contracts/cyberware/cyberware_planner_performance_contract.md
docs/contracts/cyberware/cyberware_interaction_performance_contract.md
docs/contracts/cyberware/cyberware_ui_contract.md
```

### World Bridge

```text
docs/contracts/world_bridge/world_bridge_operation_recovery_contract.md
docs/contracts/world_bridge/world_time_service_scheduler_contract.md
docs/contracts/world_bridge/terminal_notifications_bridge_contract.md
docs/contracts/world_bridge/firmware_registry_contract.md
docs/contracts/world_bridge/cyberware_world_bridge_contract.md
docs/contracts/world_bridge/cyberware_world_bridge_stability_contract.md
docs/contracts/world_bridge/cyberware_world_bridge_compensation_contract.md
docs/contracts/world_bridge/cyberware_performance_equipment_contract.md
```

### Knowledge and quality

```text
docs/contracts/knowledge/knowledge_pack_schema.md
docs/contracts/quality/project_test_harness_contract.md
docs/contracts/quality/ui_tabs_component_contract.md
```

## Maintenance rules

- keep one current document per responsibility;
- update the contract that owns a changed invariant instead of creating another phase document;
- record remaining work in `docs/ROADMAP.md` as a recommendation;
- do not use patch numbers as documentation authority;
- after moving or deleting documentation, validate every `docs/...` reference;
- do not restore historical files during later merges.

## Active additions in 15.6.1x

```text
docs/contracts/admin/admin_subscriptions_ui_contract.md
docs/contracts/equipment/item_type_contract.md
```

Service cold-entry behavior is documented in the existing Service UI and Subscription contracts. Deterministic Equipment fixtures remain test data, not a separate runtime ownership contract. ItemInstance projection caching and bounded idle warmup are part of `contracts/core/item_instance_contract.md`.

## Active additions in 15.8x

```text
docs/contracts/commerce/market_partial_return_refund_contract.md
```

Admin workspace renderers are documented in the existing `docs/contracts/admin/admin_workspace_runtime_contract.md`.

## Active additions in 15.9x

```text
docs/contracts/admin/admin_record_lifecycle_contract.md
docs/contracts/commerce/market_product_visual_assets_contract.md
docs/contracts/equipment/item_effect_resolution_contract.md
```

Notification projection policy extends the existing Terminal Notifications contract. Housing Storage Runtime Split, Runtime Cold Entry Dependencies and Subscriptions Actions & Feedback update their existing domain contracts instead of creating competing ownership documents.
## Active additions in 15.10x

```text
docs/contracts/admin/admin_operations_workspace_contract.md
docs/contracts/commerce/housing_household_foundation_contract.md
docs/contracts/commerce/housing_household_furnishing_workspace_contract.md
docs/contracts/commerce/market_delivery_fulfillment_contract.md
docs/contracts/commerce/market_cart_navigation_contract.md
docs/contracts/equipment/item_grid_presentation_contract.md
docs/contracts/quality/ui_tabs_component_contract.md
```

Terminal Inbox Content UI extends the existing Terminal Notifications contract. Subscriptions Catalog Presentation updates the existing Subscription contract. Housing Market Workspace Split updates Housing/Market ownership in the canonical state and file map instead of creating a competing store contract.

## Active additions in 15.11x

```text
docs/contracts/commerce/housing_household_furnishing_workspace_contract.md
docs/contracts/commerce/market_cart_navigation_contract.md
```

Cyberware Index extends the existing Cyberware UI contract. Terminal Store extraction and Market Notification Producer extend the existing Terminal Notifications contract. Subscriptions accessibility, shared-tab visual polish and Housing grid parity update their existing domain/quality contracts.
