(function initCyberwareController() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime;
  if (!runtime) throw new Error("Cyberware runtime package is not loaded.");
  const {
    activateCyberwareEquipmentLicense,
    activateInstalledCyberwareLicense,
    areCyberwareItemsCompatible,
    buildCyberwareDeinstallPreview,
    buildCyberwareDragPayload,
    buildCyberwareEquipmentCatalogItem,
    buildCyberwareInstallCandidateFromEquipmentItem,
    buildCyberwareInstallPreview,
    calculateCyberwareAcceptanceChance,
    calculateCyberwareProcedureCost,
    canCyberwareItemsShareSlot,
    classifyCyberwareRejectionFailure,
    commitCyberwareDeinstallPlan,
    commitCyberwareInstallFromEquipment,
    commitCyberwareInstallPlan,
    commitCyberwareReplaceFromEquipment,
    compressCyberwareSlotFootprint,
    createCyberwareInstallCandidateFromCatalogItem,
    createInterfaceInstallCandidateFromCatalogItem,
    createNeurochipInstallCandidateFromCatalogItem,
    createServicePortInstallCandidateFromCatalogItem,
    expandCyberwareSlotFootprint,
    getBodyCyberwareCatalog,
    getBodyCyberwareCatalogItem,
    getCyberwareCatalog,
    getCyberwareCatalogItem,
    getCyberwareCompliancePresentation,
    getCyberwareDropTargets,
    getCyberwareEditorOptions,
    getCyberwareEquipmentCatalogItems,
    getCyberwareNeuralCoreState,
    getCyberwareRuntimeState,
    getCyberwareRuntimeStatus,
    resolveCyberwareOperationalState,
    getCyberwareScaleDefinition,
    getCyberwareScaleLabel,
    getCyberwareSlotAncestors,
    getCyberwareSlotChildren,
    getCyberwareSlotDefinition,
    getCyberwareSlotDescendants,
    getCyberwareSlotDisplayGroupKey,
    getCyberwareSlotDisplayGroupLabel,
    getCyberwareSlotDisplayLabel,
    getCyberwareSlotGroup,
    getCyberwareSlotLabel,
    getCyberwareSlotLevel,
    getCyberwareSlotParent,
    getCyberwareSlotPurposeKey,
    getCyberwareSlotPurposeLabel,
    getCyberwareSlotSide,
    getCyberwareSlotState,
    getCyberwareSlotsLabel,
    getCyberwareSurgeryPreset,
    getInterfaceCatalog,
    getInterfaceCatalogItem,
    getInterfaceCatalogManufacturers,
    getNeurochipCatalog,
    getNeurochipCatalogItem,
    getNeurochipCatalogManufacturers,
    getOwnedCyberwareEquipmentCandidates,
    getServicePortCatalog,
    getServicePortCatalogItem,
    getServicePortCatalogManufacturers,
    getServicePortEquipmentCatalogItems,
    hasCyberwareRequiredSubscription,
    inferCyberwareSlot,
    inferCyberwareSlots,
    isCyberwareActiveStatus,
    isCyberwareFirmwareCurrentStatus,
    isCyberwareInstalledStatus,
    isCyberwareInventoryStatus,
    isCyberwareLicenseActiveStatus,
    isCyberwareOccupyingStatus,
    isCyberwareRemovedStatus,
    isCyberwareSlotAncestor,
    isEquipmentItemCyberwareInstallCandidate,
    normalizeBodyCyberwareCatalogItem,
    normalizeCyberwareCatalogItem,
    normalizeCyberwareEntry,
    normalizeCyberwareFirmwareStatus,
    normalizeCyberwareGradeKey,
    normalizeCyberwareInstallStatus,
    normalizeCyberwareLicenseStatus,
    normalizeCyberwareList,
    normalizeCyberwareScaleKey,
    normalizeCyberwareSlotKey,
    normalizeCyberwareSlotList,
    normalizeCyberwareSurgeryContext,
    normalizeInterfaceCatalogItem,
    normalizeNeurochipCatalogItem,
    normalizeServicePortCatalogItem,
    resolveCyberwareCandidateSlotsForDrop,
    resolveCyberwareInstallOutcome,
    searchBodyCyberwareCatalog,
    searchCyberwareCatalog,
    searchInterfaceCatalog,
    searchNeurochipCatalog,
    searchServicePortCatalog,
    summarizeCyberwareSlotLabels,
    updateCyberwareEquipmentFirmware,
    updateInstalledCyberwareFirmware,
    validateCyberwareAccessForItem,
    validateCyberwareDeinstallForItem,
    validateCyberwareNeuralCoreForItem,
    validateCyberwareSlotsForItem,
    CYBERWARE_OPERATIONAL_STATES,
    CYBERWARE_GRADE_DEFINITIONS,
    CYBERWARE_SCALE_DEFINITIONS,
    CYBERWARE_SLOT_DEFINITIONS,
    CYBERWARE_SLOT_GROUP_DEFINITIONS,
    CYBERWARE_SLOT_PURPOSE_DEFINITIONS,
    CYBERWARE_SURGERY_PRESETS,
  } = runtime;

  window.WS_APP.CYBERWARE_SLOT_DEFINITIONS = CYBERWARE_SLOT_DEFINITIONS;
  window.WS_APP.CYBERWARE_SCALE_DEFINITIONS = CYBERWARE_SCALE_DEFINITIONS;
  window.WS_APP.getCyberwareSlotDefinitions = () => CYBERWARE_SLOT_DEFINITIONS.map((slot) => ({
    ...slot,
    accepts: [...slot.accepts],
    displayGroup: getCyberwareSlotDisplayGroupKey(slot.key),
    displayGroupLabel: getCyberwareSlotDisplayGroupLabel(slot.key),
    purpose: getCyberwareSlotPurposeKey(slot.key),
    purposeLabel: getCyberwareSlotPurposeLabel(slot.key)
  }));
  window.WS_APP.getCyberwareSlotGroupDefinitions = () => CYBERWARE_SLOT_GROUP_DEFINITIONS.map((group) => ({ ...group, slotKeys: [...group.slotKeys] }));
  window.WS_APP.getCyberwareSlotPurposeDefinitions = () => CYBERWARE_SLOT_PURPOSE_DEFINITIONS.map((purpose) => ({ ...purpose, slotKeys: [...purpose.slotKeys] }));
  window.WS_APP.getCyberwareSlotGroup = getCyberwareSlotGroup;
  window.WS_APP.getCyberwareSlotDisplayGroupKey = getCyberwareSlotDisplayGroupKey;
  window.WS_APP.getCyberwareSlotDisplayGroupLabel = getCyberwareSlotDisplayGroupLabel;
  window.WS_APP.getCyberwareSlotPurposeKey = getCyberwareSlotPurposeKey;
  window.WS_APP.getCyberwareSlotPurposeLabel = getCyberwareSlotPurposeLabel;
  window.WS_APP.getCyberwareSlotDisplayLabel = getCyberwareSlotDisplayLabel;
  window.WS_APP.getCyberwareSlotsGroupedLabel = summarizeCyberwareSlotLabels;
  window.WS_APP.getCyberwareSlotLevel = getCyberwareSlotLevel;
  window.WS_APP.getCyberwareSlotParent = getCyberwareSlotParent;
  window.WS_APP.getCyberwareSlotChildren = getCyberwareSlotChildren;
  window.WS_APP.getCyberwareSlotDescendants = getCyberwareSlotDescendants;
  window.WS_APP.getCyberwareSlotAncestors = getCyberwareSlotAncestors;
  window.WS_APP.isCyberwareSlotAncestor = isCyberwareSlotAncestor;
  window.WS_APP.expandCyberwareSlotFootprint = expandCyberwareSlotFootprint;
  window.WS_APP.compressCyberwareSlotFootprint = compressCyberwareSlotFootprint;
  window.WS_APP.getCyberwareSlotSide = getCyberwareSlotSide;
  window.WS_APP.getCyberwareScaleDefinitions = () => CYBERWARE_SCALE_DEFINITIONS.map((scale) => ({ ...scale }));
  window.WS_APP.normalizeCyberwareSlotKey = normalizeCyberwareSlotKey;
  window.WS_APP.normalizeCyberwareSlotList = normalizeCyberwareSlotList;
  window.WS_APP.normalizeCyberwareScaleKey = normalizeCyberwareScaleKey;
  window.WS_APP.getCyberwareSlotDefinition = getCyberwareSlotDefinition;
  window.WS_APP.getCyberwareSlotLabel = getCyberwareSlotLabel;
  window.WS_APP.getCyberwareSlotsLabel = getCyberwareSlotsLabel;
  window.WS_APP.getCyberwareScaleDefinition = getCyberwareScaleDefinition;
  window.WS_APP.getCyberwareScaleLabel = getCyberwareScaleLabel;
  window.WS_APP.inferCyberwareSlot = inferCyberwareSlot;
  window.WS_APP.inferCyberwareSlots = inferCyberwareSlots;
  window.WS_APP.isEquipmentItemCyberwareInstallCandidate = isEquipmentItemCyberwareInstallCandidate;
  window.WS_APP.buildCyberwareInstallCandidateFromEquipmentItem = buildCyberwareInstallCandidateFromEquipmentItem;
  window.WS_APP.getOwnedCyberwareEquipmentCandidates = getOwnedCyberwareEquipmentCandidates;
  window.WS_APP.commitCyberwareInstallFromEquipment = commitCyberwareInstallFromEquipment;
  window.WS_APP.activateCyberwareEquipmentLicense = activateCyberwareEquipmentLicense;
  window.WS_APP.updateCyberwareEquipmentFirmware = updateCyberwareEquipmentFirmware;
  window.WS_APP.activateInstalledCyberwareLicense = activateInstalledCyberwareLicense;
  window.WS_APP.updateInstalledCyberwareFirmware = updateInstalledCyberwareFirmware;
  window.WS_APP.normalizeCyberwareEntry = normalizeCyberwareEntry;
  window.WS_APP.normalizeCyberwareList = normalizeCyberwareList;
  window.WS_APP.normalizeCyberwareInstallStatus = normalizeCyberwareInstallStatus;
  window.WS_APP.isCyberwareInventoryStatus = isCyberwareInventoryStatus;
  window.WS_APP.isCyberwareRemovedStatus = isCyberwareRemovedStatus;
  window.WS_APP.isCyberwareInstalledStatus = isCyberwareInstalledStatus;
  window.WS_APP.isCyberwareActiveStatus = isCyberwareActiveStatus;
  window.WS_APP.isCyberwareOccupyingStatus = isCyberwareOccupyingStatus;
  window.WS_APP.getCyberwareRuntimeState = getCyberwareRuntimeState;
  window.WS_APP.getCyberwareRuntimeStatus = getCyberwareRuntimeStatus;
  window.WS_APP.resolveCyberwareOperationalState = resolveCyberwareOperationalState;
  window.WS_APP.CYBERWARE_OPERATIONAL_STATES = CYBERWARE_OPERATIONAL_STATES;
  window.WS_APP.getCyberwareSlotState = getCyberwareSlotState;
  window.WS_APP.validateCyberwareSlotsForItem = validateCyberwareSlotsForItem;
  window.WS_APP.validateCyberwareNeuralCoreForItem = validateCyberwareNeuralCoreForItem;
  window.WS_APP.validateCyberwareAccessForItem = validateCyberwareAccessForItem;
  window.WS_APP.hasCyberwareRequiredSubscription = hasCyberwareRequiredSubscription;
  window.WS_APP.normalizeCyberwareLicenseStatus = normalizeCyberwareLicenseStatus;
  window.WS_APP.normalizeCyberwareFirmwareStatus = normalizeCyberwareFirmwareStatus;
  window.WS_APP.isCyberwareLicenseActiveStatus = isCyberwareLicenseActiveStatus;
  window.WS_APP.isCyberwareFirmwareCurrentStatus = isCyberwareFirmwareCurrentStatus;
  window.WS_APP.getCyberwareCompliancePresentation = getCyberwareCompliancePresentation;
  window.WS_APP.getCyberwareNeuralCoreState = getCyberwareNeuralCoreState;
  window.WS_APP.calculateCyberwareAcceptanceChance = calculateCyberwareAcceptanceChance;
  window.WS_APP.classifyCyberwareRejectionFailure = classifyCyberwareRejectionFailure;
  window.WS_APP.resolveCyberwareInstallOutcome = resolveCyberwareInstallOutcome;
  window.WS_APP.commitCyberwareInstallPlan = commitCyberwareInstallPlan;
  window.WS_APP.validateCyberwareDeinstallForItem = validateCyberwareDeinstallForItem;
  window.WS_APP.buildCyberwareDeinstallPreview = buildCyberwareDeinstallPreview;
  window.WS_APP.commitCyberwareDeinstallPlan = commitCyberwareDeinstallPlan;
  window.WS_APP.commitCyberwareReplaceFromEquipment = commitCyberwareReplaceFromEquipment;
  window.WS_APP.normalizeCyberwareGradeKey = normalizeCyberwareGradeKey;
  window.WS_APP.getCyberwareGradeDefinitions = () => CYBERWARE_GRADE_DEFINITIONS.map((grade) => ({ ...grade }));
  window.WS_APP.getNeurochipCatalogManufacturers = getNeurochipCatalogManufacturers;
  window.WS_APP.getNeurochipCatalog = getNeurochipCatalog;
  window.WS_APP.getNeurochipCatalogItem = getNeurochipCatalogItem;
  window.WS_APP.searchNeurochipCatalog = searchNeurochipCatalog;
  window.WS_APP.normalizeNeurochipCatalogItem = normalizeNeurochipCatalogItem;
  window.WS_APP.createNeurochipInstallCandidateFromCatalogItem = createNeurochipInstallCandidateFromCatalogItem;
  window.WS_APP.getInterfaceCatalogManufacturers = getInterfaceCatalogManufacturers;
  window.WS_APP.getInterfaceCatalog = getInterfaceCatalog;
  window.WS_APP.getInterfaceCatalogItem = getInterfaceCatalogItem;
  window.WS_APP.searchInterfaceCatalog = searchInterfaceCatalog;
  window.WS_APP.normalizeInterfaceCatalogItem = normalizeInterfaceCatalogItem;
  window.WS_APP.createInterfaceInstallCandidateFromCatalogItem = createInterfaceInstallCandidateFromCatalogItem;
  window.WS_APP.getServicePortCatalogManufacturers = getServicePortCatalogManufacturers;
  window.WS_APP.getServicePortCatalog = getServicePortCatalog;
  window.WS_APP.getServicePortCatalogItem = getServicePortCatalogItem;
  window.WS_APP.searchServicePortCatalog = searchServicePortCatalog;
  window.WS_APP.normalizeServicePortCatalogItem = normalizeServicePortCatalogItem;
  window.WS_APP.createServicePortInstallCandidateFromCatalogItem = createServicePortInstallCandidateFromCatalogItem;
  window.WS_APP.getServicePortEquipmentCatalogItems = getServicePortEquipmentCatalogItems;
  window.WS_APP.getBodyCyberwareCatalog = getBodyCyberwareCatalog;
  window.WS_APP.getBodyCyberwareCatalogItem = getBodyCyberwareCatalogItem;
  window.WS_APP.searchBodyCyberwareCatalog = searchBodyCyberwareCatalog;
  window.WS_APP.normalizeBodyCyberwareCatalogItem = normalizeBodyCyberwareCatalogItem;
  window.WS_APP.getCyberwareCatalog = getCyberwareCatalog;
  window.WS_APP.getCyberwareCatalogItem = getCyberwareCatalogItem;
  window.WS_APP.searchCyberwareCatalog = searchCyberwareCatalog;
  window.WS_APP.normalizeCyberwareCatalogItem = normalizeCyberwareCatalogItem;
  window.WS_APP.createCyberwareInstallCandidateFromCatalogItem = createCyberwareInstallCandidateFromCatalogItem;
  window.WS_APP.buildCyberwareEquipmentCatalogItem = buildCyberwareEquipmentCatalogItem;
  window.WS_APP.getCyberwareEquipmentCatalogItems = getCyberwareEquipmentCatalogItems;
  window.WS_APP.getCyberwareSurgeryPresets = () => CYBERWARE_SURGERY_PRESETS.map((preset) => ({ ...preset }));
  window.WS_APP.getCyberwareSurgeryPreset = getCyberwareSurgeryPreset;
  window.WS_APP.normalizeCyberwareSurgeryContext = normalizeCyberwareSurgeryContext;
  window.WS_APP.calculateCyberwareProcedureCost = calculateCyberwareProcedureCost;
  window.WS_APP.buildCyberwareDragPayload = buildCyberwareDragPayload;
  window.WS_APP.buildCyberwareInstallPreview = buildCyberwareInstallPreview;
  window.WS_APP.getCyberwareDropTargets = getCyberwareDropTargets;
  window.WS_APP.resolveCyberwareCandidateSlotsForDrop = resolveCyberwareCandidateSlotsForDrop;
  window.WS_APP.areCyberwareItemsCompatible = areCyberwareItemsCompatible;
  window.WS_APP.canCyberwareItemsShareSlot = canCyberwareItemsShareSlot;
  window.WS_APP.getCyberwareEditorOptions = getCyberwareEditorOptions;
  window.WS_APP.invalidateEquipmentCatalogIndex?.();
})();
