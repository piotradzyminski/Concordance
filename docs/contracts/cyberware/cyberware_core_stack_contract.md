# Cyberware Core Stack Contract — 9.0x

## Canonical source

The panel is a read-only projection of:

```text
getCyberwareRuntimeState(citizen)
-> runtime.neuralCore
-> runtime.installed[]
```

No Core Stack metric is persisted separately. `ItemInstance`, Cyberware Runtime 7.0x and Planner 8.0x remain the canonical mutation/runtime layers.

## Core components

```text
Neurochip
Interface
Service Port
```

Neurochip and Interface are required for dependent cyberware operation. Service Port remains optional and generates a warning when absent.

## Resource metrics

```text
Neuroload       = neuralCore.neuroLoad / neuralCore.neuroCapacity
Neurochannels   = neuralCore.channelLoad / neuralCore.controlChannels
Interface Load  = neuralCore.interfaceLoad / neuralCore.interfaceCapacity
```

Core components do not consume their own resource allocations. Dependent implants consume values calculated by Runtime 7.0x.

## Quality metrics

```text
Security
Stability
Neurolatency
Neural Strain
Max Cyberware Grade
Max Scale
```

All values are derived from the active Neurochip, Interface, optional Service Port, enabled dependent implants and Runtime 7.0x allocation results.

## Effective compatibility

Effective protocols are the Neurochip/Interface capability intersection calculated by Runtime 7.0x. Body buses are displayed separately.

Each dependent implant row exposes:

```text
operational state
operational reason
Neuroload allocation
Neurochannel allocation
Interface Load allocation
required protocols
missing protocols
runtime blockers
runtime warnings
```

The panel does not run a second compatibility engine. It formats the canonical runtime assessment.

## Component presentation

Neurochip card exposes:

```text
Neuroload capacity
control channels
firmware slots
security
stability
latency
maximum grade
maximum scale
supported buses
```

Interface card exposes:

```text
interface capacity
interface lanes
neurochip socket rating
signal integrity
security isolation
redundancy
power routing
thermal routing
supported buses
```

Service Port card exposes:

```text
service access
diagnostic depth
firmware access
calibration quality
security lock
emergency access
traceability
supported buses
```

## Planner integration

Installed Core Stack components retain the existing Planner actions:

```text
Plan Removal
Plan Replace
```

No new commit path is introduced.
