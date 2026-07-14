window.WS_APP = window.WS_APP || {};

(function initCitizenTemplateService() {
  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getCitizenTemplates(options = {}) {
    const characterType = String(options.characterType || "").trim().toUpperCase();
    return (window.APP_DATA?.citizenTemplates || [])
      .filter((template) => !characterType || (template.allowedCharacterTypes || []).includes(characterType))
      .map(clone);
  }

  function getCitizenTemplate(templateId) {
    const id = String(templateId || "").trim();
    return getCitizenTemplates().find((template) => template.id === id) || null;
  }

  function getCitizenCompetencePresets() {
    return (window.APP_DATA?.citizenCompetencePresets || []).map(clone);
  }

  function getCitizenCompetencePreset(presetId) {
    const id = String(presetId || "STANDARD").trim().toUpperCase();
    return getCitizenCompetencePresets().find((preset) => preset.id === id)
      || getCitizenCompetencePresets()[0]
      || { id: "STANDARD", label: "Standard", abilityDelta: 0, skillDelta: 0 };
  }

  function buildCitizenTemplatePatch(templateId, options = {}) {
    const template = getCitizenTemplate(templateId);
    if (!template) return { ok: false, error: { code: "CITIZEN_TEMPLATE_NOT_FOUND", templateId } };

    const characterType = String(options.characterType || "PLAYER").trim().toUpperCase();
    if (!(template.allowedCharacterTypes || []).includes(characterType)) {
      return { ok: false, error: { code: "CITIZEN_TEMPLATE_CHARACTER_TYPE_DENIED", templateId, characterType } };
    }

    const preset = getCitizenCompetencePreset(options.competencePresetId);
    const abilityDefinitions = window.WS_APP.getAbilityDefinitions?.() || [];
    const skillDefinitions = window.WS_APP.getSkillDefinitions?.() || [];
    const skillDefinitionIds = new Set(skillDefinitions.map((definition) => definition.id));

    const abilities = abilityDefinitions.map((definition) => {
      const base = Number(template.abilities?.[definition.id] ?? 1);
      return {
        abilityId: definition.id,
        label: definition.label,
        natural: clamp(base + Number(preset.abilityDelta || 0), 0, Number(definition.maxNatural ?? 7)),
        cyberware: 0,
        cyberwareActive: true
      };
    });

    const skills = (template.skills || [])
      .filter((entry) => skillDefinitionIds.has(entry.skillId))
      .map((entry) => {
        const definition = skillDefinitions.find((candidate) => candidate.id === entry.skillId);
        return {
          skillId: entry.skillId,
          value: clamp(Number(entry.value || 1) + Number(preset.skillDelta || 0), 1, Number(definition?.maxValue ?? 10))
        };
      });

    return {
      ok: true,
      template,
      preset,
      patch: {
        characterType,
        biologicalProfile: template.biologicalProfile || "GAMMA",
        profile: template.biologicalProfile || "GAMMA",
        classProfile: template.classProfile || "UNASSIGNED",
        abilities,
        skills
      }
    };
  }

  Object.assign(window.WS_APP, {
    getCitizenTemplates,
    getCitizenTemplate,
    getCitizenCompetencePresets,
    getCitizenCompetencePreset,
    buildCitizenTemplatePatch
  });
})();
