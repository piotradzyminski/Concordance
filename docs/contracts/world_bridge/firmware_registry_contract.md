# Firmware Registry Contract 1.0x

## Ownership

```text
Registry owner: data/firmware-registry.js + js/firmware-registry.js
Physical firmware state owner: ItemInstance Store
Firmware mutation owner: Cyberware Maintenance / Service through ItemInstance command boundaries
```

Firmware Registry is read-only. It never mutates ItemInstance, Citizen, Subscription, Service Order, Billing or Equipment state.

## Schema markers

```text
FIRMWARE_REGISTRY_API_VERSION = firmware_registry_1_0x
FIRMWARE_REGISTRY_SCHEMA_VERSION = 1
```

## Firmware product

Required fields:

```js
{
  firmwareProductId,
  providerId,
  displayName,
  defaultChannel,
  supportedDefinitionIds: [],
  authorizedServiceProviderIds: [],
  preferredServiceProviderId,
  entitlementProviderId,
  requiredEntitlementCodes: [],
  enforceInstalledFirmware,
  active,
  revision
}
```

Rules:

- `firmwareProductId` is stable and globally unique.
- One `definitionId` has at most one canonical firmware product owner.
- `providerId` identifies the product owner/manufacturer domain.
- `authorizedServiceProviderIds` identifies providers allowed to perform updates.
- `preferredServiceProviderId` is the default Service provider used by eligibility when the caller does not select one.
- Registry records do not copy ItemInstance state.

## Firmware release

Required fields:

```js
{
  firmwareReleaseId,
  firmwareProductId,
  version,
  channel,
  releasedAt,
  mandatory,
  securitySeverity,
  compatibility: {
    supportedDefinitionIds: [],
    minimumItemSchemaVersion,
    requiredTags: [],
    blockedLifecycleStates: []
  },
  requiredEntitlementCodes: [],
  entitlementProviderId,
  supersedesReleaseIds: [],
  active,
  revision
}
```

Supported channels:

```text
STABLE
SECURITY
BETA
LEGACY
```

Supported security severities:

```text
NONE
LOW
MEDIUM
HIGH
CRITICAL
```

## Public read API

```text
getFirmwareProduct(firmwareProductId)
getFirmwareProducts(filters)
getFirmwareRelease(firmwareReleaseId)
getFirmwareProductForDefinition(definitionId)
getFirmwareReleasesForProduct(firmwareProductId, filters)
getLatestCompatibleFirmware(instanceId, options)
getFirmwareStateForItem(instanceIdOrView, options)
resolveFirmwareEligibility(input)
validateFirmwareRegistry()
getFirmwareRegistryDiagnostics()
compareFirmwareVersions(left, right)
```

## Eligibility input

```js
{
  citizenId,
  instanceId,
  firmwareReleaseId,
  providerId,
  channel,
  atTime,
  allowDowngrade
}
```

Eligibility validates:

- Citizen ID is present.
- ItemInstance exists.
- ItemInstance belongs to Citizen.
- ItemInstance is not `DESTROYED` or `DISPOSED`.
- Definition has one canonical firmware product.
- Release belongs to the product.
- Release is active and compatible with definition/schema/tags/lifecycle.
- Selected Service provider is authorized and supports `FIRMWARE_UPDATE`.
- Required Subscription entitlement exists for exact `ITEM_INSTANCE` or fallback `CITIZEN` target.
- Downgrade is blocked unless explicitly allowed.

Canonical result:

```js
{
  allowed,
  status,
  citizenId,
  instanceId,
  definitionId,
  providerId,
  firmwareProductId,
  firmwareReleaseId,
  currentFirmwareReleaseId,
  currentVersion,
  targetVersion,
  updateRequired,
  product,
  release,
  entitlements: [],
  blockers: [],
  warnings: [],
  evaluatedAt,
  registryRevision
}
```

## ItemInstance integration

Installed state remains in:

```text
ItemInstance.cyberwareState.installedFirmware[]
ItemInstance.authorizationRefs.firmwareProductId
ItemInstance.authorizationRefs.firmwareReleaseId
```

Legacy records that only contain `channel + version` are resolved against the canonical product release list without mutating stored data. The next successful update writes canonical product/release IDs.

## Cyberware Authorization integration

`getCyberwareFirmwareState()` delegates to Firmware Registry when the ItemInstance definition has a registry product. Legacy logic remains only for unmapped definitions.

`installCyberwareFirmware()`:

- resolves the canonical target release;
- validates ownership, provider capability and entitlement;
- rejects arbitrary release/product mismatch;
- rejects downgrade unless explicitly allowed;
- returns `FIRMWARE_ALREADY_CURRENT` without mutation for replay/current state;
- writes canonical product/release references after successful ItemInstance update.

## Current seed scope

The initial registry covers existing firmware-bearing fixture families:

```text
CoreMed BasicSight L2
CoreMed Assisted Heart C2
Factory Commons Tool Forearm F2
Mass Compression M3 Modular Bus
Mass Compression Grid Port
```

Current counts:

```text
products: 5
releases: 7
indexed definitionIds: 16
```

## Non-goals

- firmware installation UI;
- Service Order orchestration;
- Billing or Coverage mutation;
- automatic Campaign Time rollout;
- remote forced update events;
- dynamic registry persistence;
- mutation of ItemInstance by Registry;
- Cyberware World Bridge orchestrator.
