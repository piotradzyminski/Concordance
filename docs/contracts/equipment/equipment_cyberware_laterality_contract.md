# Equipment and Cyberware Laterality Contract

## Status

```text
installed: Equipment/Cyberware Laterality Unification 1.0x
validated: Equipment/Cyberware Laterality UI Validation 1.0x
```

## Canonical rule

Product definitions are anatomically neutral. Laterality belongs only to the current placement of an ItemInstance.

```text
definitionId / product name:
  no LEFT-only or RIGHT-only variant

BODY / EQUIPPED placement:
  may use left/right anatomical slots and mounts

stored / demounted item:
  has no intrinsic side
```

## Definition-owned identity

The canonical catalog definition owns product-facing identity and compatibility metadata. A stale `ItemInstance.instanceData` snapshot must not override the current definition for:

```text
name / title
summary / description / publicDescription
primarySlot / targetSlot / slot / slots
compatibleSlots
compatibilityGroup / compatibleWith
requiredComponentStandards
```

Instance-owned state continues to own serial identity, durability, lifecycle, authorization, service history and current location. For an installed BODY item, current `bodySlots` override the definition template in the runtime `slots`, `slot` and `primarySlot` projection.

## Compatibility and placement

Neutral definitions may expose `compatibleSlots` containing left and right anatomical destinations.

```text
compatibleSlots
  legal installation/equip destinations for the neutral product

slots / BODY bodySlots
  template footprint or current occupied anatomy
```

Strict Cyberware Planner projection must derive selectable target roots from `compatibleSlots` when they are present. Selecting a target mirrors/resolves the neutral anatomical footprint onto that side.

Legacy definition IDs are resolved through:

```text
window.APP_DATA.bodyCyberwareDefinitionAliases
window.APP_DATA.equipmentDefinitionAliases
getCyberwareCatalogItem()
getEquipmentCatalogItemById()
```

Alias resolution must preserve the original ItemInstance identity and current BODY/EQUIPPED location. It must not create a second physical instance.

## UI projection

Equipment Inspector, Item Index, tooltips and Cyberware Planner consume the canonical ItemInstance/catalog projection.

A legacy snapshot such as:

```text
CoreMed BasicSight L2 Left Eye
```

must render as the neutral canonical product:

```text
CoreMed BasicSight L2 Eye
```

The selected/current placement may still display `Left Eye` or `Right Eye` as location information.

## Forbidden model fields

Do not introduce definition-level exceptions such as:

```text
laterality
LEFT_ONLY
RIGHT_ONLY
intrinsicSide
```

Side-specific slot and mount identifiers remain valid because they describe anatomy and placement rather than product identity.
