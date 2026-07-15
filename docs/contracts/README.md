# Active Contracts

This directory contains only contracts that define current runtime ownership, data shape, command boundaries, UI invariants or performance constraints.

```text
admin/        Admin safety, audit and workspace runtime
citizen/      Citizen record, creation, editing, Citizen Files and Database relations
commerce/     Global Market, Housing and delivery boundaries
core/         Campaign Time, event windows, ItemInstance, Billing, Coverage and Campaign Data I/O

cyberware/    Cyberware runtime, planner, UI and performance
equipment/    Equipment state, tooltips and laterality
knowledge/    Knowledge Pack schema and registry-isolated relation contract
quality/      Test harness
services/     Service and Subscription boundaries
world_bridge/ cross-domain operation, notifications, firmware and compensation
```

Contracts may retain their implementation version in the title, but authority comes from their presence in `docs/README.md`, not from the highest historical patch number.

## Runtime 15.14x contract additions

```text
core/terminal_inbox_datetime_contract.md
commerce/housing_layout_pools_contract.md
cyberware/cyberware_module_extraction_contract.md
```

Knowledge sidecar presentation remains governed by the existing Knowledge Pack and relation contracts; no competing content contract was introduced.



## Runtime 15.16x contract additions

```text
cyberware/cyberware_anatomy_bodymap_contract.md
commerce/housing_rent_relocation_runtime_contract.md
commerce/market_card_ui_contract.md
core/world_time_scheduled_events_contract.md
```

The Knowledge article-index presentation remains governed by `knowledge/knowledge_relations_contract.md`; no competing Knowledge content contract was introduced.

## Runtime 15.19x contract additions

```text
commerce/market_datetime_scheduler_contract.md
commerce/market_secondary_listing_contract.md
commerce/market_wishlist_contract.md
commerce/housing_household_hub_contract.md
cyberware/cyberware_upgrade_system_contract.md
```

The Knowledge 1.6x masking fix remains governed by `knowledge/knowledge_relations_contract.md`.
