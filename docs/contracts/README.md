# Active Contracts

This directory contains only contracts that define current runtime ownership, data shape, command boundaries, UI invariants or performance constraints.

```text
admin/        Admin safety, audit and workspace runtime
citizen/      Citizen record, creation, editing, Citizen Files and Database relations
commerce/     Market and Housing boundaries
core/         ItemInstance, Billing, Coverage and Campaign Data I/O
cyberware/    Cyberware runtime, planner, UI and performance
equipment/    Equipment state, tooltips and laterality
knowledge/    Knowledge Pack schema
quality/      Test harness
services/     Service and Subscription boundaries
world_bridge/ cross-domain operation, notifications, firmware and compensation
```

Contracts may retain their implementation version in the title, but authority comes from their presence in `docs/README.md`, not from the highest historical patch number.
