window.APP_DATA = window.APP_DATA || {};

(function buildHousingLayoutPoolsCatalog() {
  const standardsCatalog = window.APP_DATA.housingRentStandards || { standards: [] };
  const CELL_AREA_M2 = Number(standardsCatalog.cellAreaM2 || 0.25);
  const RANDOM_FAMILIES = ["LINEAR", "OFFSET", "ALCOVE", "CORNER"];
  const CHOICE_FAMILIES = ["OPEN", "ALCOVE", "OFFSET", "CORNER"];
  const ROOM_CAPABILITIES = Object.freeze({
    MULTIPURPOSE: ["REST", "SLEEP", "CONSUMABLE_USE"],
    LIVING: ["REST", "SOCIAL"],
    SLEEPING: ["REST", "SLEEP", "RECOVERY"],
    HYGIENE: ["HYGIENE"],
    WORKSPACE: ["UTILITY", "WORKSPACE"],
    FLEX: ["UTILITY", "SOCIAL"],
    ENTRY: ["ACCESS"]
  });

  function cellKey(column, row) {
    return `${column}:${row}`;
  }

  function sortCells(cells = []) {
    return [...cells].sort((left, right) => left.row - right.row || left.column - right.column);
  }

  function rowSpecs(targetCellCount, family) {
    const aspect = {
      LINEAR: 1.9,
      OPEN: 1.45,
      OFFSET: 1.55,
      ALCOVE: 1.35,
      CORNER: 1.25,
      SIGNATURE: 1.5
    }[family] || 1.5;
    const width = Math.max(6, Math.round(Math.sqrt(targetCellCount * aspect)));
    let height = Math.max(4, Math.ceil(targetCellCount / Math.max(1, width - 2)));
    while (height < 64) {
      const specs = [];
      for (let row = 0; row < height; row += 1) {
        let start = 0;
        let rowWidth = width;
        if (family === "OFFSET") {
          start = row < Math.ceil(height / 2) ? 0 : 1;
          rowWidth = width - 1;
        } else if (family === "ALCOVE") {
          const inset = row >= 1 && row <= height - 2 ? 1 : 0;
          start = inset;
          rowWidth = width - inset;
          if (row === height - 1) rowWidth = width + 1;
        } else if (family === "CORNER") {
          const cutoff = Math.max(1, Math.floor(height * 0.42));
          if (row < cutoff) {
            start = 2;
            rowWidth = Math.max(3, width - 2);
          }
        } else if (family === "SIGNATURE") {
          start = Math.floor(row / 2) % 2;
          rowWidth = width - (row % 3 === 1 ? 1 : 0);
        }
        specs.push({ start, width: Math.max(2, rowWidth) });
      }
      if (specs.reduce((sum, spec) => sum + spec.width, 0) >= targetCellCount) return specs;
      height += 1;
    }
    return [{ start: 0, width: targetCellCount }];
  }

  function buildShape(targetCellCount, family) {
    const specs = rowSpecs(targetCellCount, family);
    const rawCells = [];
    let remaining = targetCellCount;
    specs.some((spec, row) => {
      const take = Math.min(spec.width, remaining);
      for (let column = spec.start; column < spec.start + take; column += 1) rawCells.push({ column, row });
      remaining -= take;
      return remaining <= 0;
    });
    const minColumn = Math.min(...rawCells.map((cell) => cell.column));
    const minRow = Math.min(...rawCells.map((cell) => cell.row));
    return sortCells(rawCells.map((cell) => ({
      column: cell.column - minColumn + 1,
      row: cell.row - minRow + 1
    })));
  }

  function selectCornerCells(allCells, availableKeys, requestedCount, corner) {
    const cells = allCells.filter((cell) => availableKeys.has(cellKey(cell.column, cell.row)));
    if (!cells.length || requestedCount <= 0) return [];
    const maxColumn = Math.max(...allCells.map((cell) => cell.column));
    const maxRow = Math.max(...allCells.map((cell) => cell.row));
    const score = (cell) => {
      if (corner === "BR") return (maxColumn - cell.column) + (maxRow - cell.row) * 0.9;
      if (corner === "TR") return (maxColumn - cell.column) + cell.row * 0.9;
      if (corner === "BL") return cell.column + (maxRow - cell.row) * 0.9;
      if (corner === "TL") return cell.column + cell.row * 0.9;
      return cell.column * 0.1 + cell.row * 0.1;
    };
    const ordered = cells.sort((left, right) => score(left) - score(right) || left.row - right.row || left.column - right.column);
    const selected = [ordered[0]];
    availableKeys.delete(cellKey(ordered[0].column, ordered[0].row));
    while (selected.length < requestedCount && availableKeys.size) {
      const selectedKeys = new Set(selected.map((cell) => cellKey(cell.column, cell.row)));
      const frontier = allCells
        .filter((cell) => availableKeys.has(cellKey(cell.column, cell.row)))
        .map((cell) => {
          const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((count, offset) => (
            count + (selectedKeys.has(cellKey(cell.column + offset[0], cell.row + offset[1])) ? 1 : 0)
          ), 0);
          return { cell, neighbours, rank: score(cell) - neighbours * 3 };
        })
        .filter((entry) => entry.neighbours > 0)
        .sort((left, right) => left.rank - right.rank || left.cell.row - right.cell.row || left.cell.column - right.cell.column);
      const next = frontier[0]?.cell || allCells
        .filter((cell) => availableKeys.has(cellKey(cell.column, cell.row)))
        .sort((left, right) => score(left) - score(right) || left.row - right.row || left.column - right.column)[0];
      if (!next) break;
      selected.push(next);
      availableKeys.delete(cellKey(next.column, next.row));
    }
    return sortCells(selected);
  }

  function getBounds(cells = []) {
    const columns = cells.map((cell) => cell.column);
    const rows = cells.map((cell) => cell.row);
    return {
      column: Math.min(...columns),
      row: Math.min(...rows),
      width: Math.max(...columns) - Math.min(...columns) + 1,
      height: Math.max(...rows) - Math.min(...rows) + 1
    };
  }

  function toCellKeys(cells = []) {
    return sortCells(cells).map((cell) => cellKey(cell.column, cell.row));
  }

  function fixturesContain(fixtures = [], fragments = []) {
    return fixtures.some((fixture) => fragments.some((fragment) => String(fixture || "").includes(fragment)));
  }

  function buildRooms(standardCode, tier, cells) {
    const fixtures = tier.fixedFixtures || [];
    const availableKeys = new Set(cells.map((cell) => cellKey(cell.column, cell.row)));
    const rooms = [];
    let wetCount = { G: 4, F: 6, E: 6, D: 8, C: 8, B: 10, A: 14 }[standardCode] || 4;
    if (fixturesContain(fixtures, ["SECOND_WET", "TWO_WET", "MULTIPLE_WET"])) wetCount += 4;
    const wetCells = selectCornerCells(cells, availableKeys, Math.min(wetCount, Math.max(2, Math.floor(cells.length / 8))), "BR");
    if (wetCells.length) rooms.push({ key: "wet", label: "Wet Module", type: "HYGIENE", cells: wetCells });

    const separateSleep = ["D", "C", "B", "A"].includes(standardCode)
      || fixturesContain(fixtures, ["SLEEPING_RECESS", "SLEEP_ZONE", "BEDROOM", "PRIMARY_BEDROOM", "PRIMARY_SUITE", "CHILD_SLEEP", "SLEEP_PARTITION"]);
    if (separateSleep) {
      const ratio = { F: 0.16, E: 0.18, D: 0.21, C: 0.23, B: 0.24, A: 0.26 }[standardCode] || 0.16;
      const requested = Math.min(Math.max(6, Math.round(cells.length * ratio)), Math.max(0, availableKeys.size - 8));
      const sleepingCells = selectCornerCells(cells, availableKeys, requested, "TR");
      if (sleepingCells.length) rooms.push({
        key: "sleep",
        label: ["F", "E"].includes(standardCode) ? "Sleeping Recess" : standardCode === "A" ? "Primary Suite" : "Sleeping Zone",
        type: "SLEEPING",
        cells: sleepingCells
      });
    }

    const hasWork = fixturesContain(fixtures, ["WORK", "OFFICE", "FLEX", "GUEST", "VISITOR", "SERVICE_ROOM"]);
    if (hasWork && availableKeys.size > 14) {
      const ratio = { D: 0.12, C: 0.14, B: 0.16, A: 0.2 }[standardCode] || 0.1;
      const requested = Math.min(Math.max(5, Math.round(cells.length * ratio)), Math.max(0, availableKeys.size - 8));
      const workCells = selectCornerCells(cells, availableKeys, requested, "BL");
      if (workCells.length) {
        const type = fixturesContain(fixtures, ["FLEX", "GUEST", "VISITOR"]) ? "FLEX" : "WORKSPACE";
        rooms.push({ key: type === "FLEX" ? "flex" : "work", label: type === "FLEX" ? "Flex / Guest Zone" : "Work Recess", type, cells: workCells });
      }
    }

    const mainCells = cells.filter((cell) => availableKeys.has(cellKey(cell.column, cell.row)));
    const mainType = ["G", "F", "E"].includes(standardCode) ? "MULTIPURPOSE" : "LIVING";
    const mainLabel = ["G", "F"].includes(standardCode) ? "Main Cell" : standardCode === "E" ? "Adaptive Main Cell" : "Living Area";
    rooms.unshift({ key: "main", label: mainLabel, type: mainType, cells: mainCells });

    return rooms.filter((room) => room.cells.length).map((room) => ({
      key: room.key,
      label: room.label,
      type: room.type,
      bounds: getBounds(room.cells),
      activeCells: toCellKeys(room.cells),
      capabilities: [...(ROOM_CAPABILITIES[room.type] || [])],
      restrictions: []
    }));
  }

  function buildFixtureAnchors(tier, rooms) {
    const main = rooms.find((room) => room.key === "main") || rooms[0];
    const wet = rooms.find((room) => room.type === "HYGIENE") || main;
    const sleeping = rooms.find((room) => room.type === "SLEEPING") || main;
    const work = rooms.find((room) => ["WORKSPACE", "FLEX"].includes(room.type)) || main;
    return (tier.fixedFixtures || []).map((fixtureId) => {
      const target = /WET|BATH|TOILET|WASH/.test(fixtureId)
        ? wet
        : /SLEEP|BEDROOM|SUITE/.test(fixtureId)
          ? sleeping
          : /WORK|FLEX|GUEST|VISITOR|SERVICE_ROOM/.test(fixtureId)
            ? work
            : main;
      return { fixtureId, roomKey: target.key, anchorCell: target.activeCells[0] || "1:1" };
    });
  }

  const catalog = {
    schemaVersion: "housing_layout_pools_3_1x",
    cellAreaM2: CELL_AREA_M2,
    templates: [],
    pools: []
  };

  (standardsCatalog.standards || []).forEach((standard) => {
    (standard.tiers || []).forEach((tier) => {
      const pool = {
        poolId: `${tier.tierId}-layout-pool`,
        standardCode: standard.code,
        tierId: tier.tierId,
        layoutPolicy: standard.layoutPolicy,
        templateIds: []
      };
      if (tier.areaM2 == null || standard.layoutPolicy === "ASSIGNED_BEDSPACE") {
        catalog.pools.push(pool);
        return;
      }
      const families = standard.layoutPolicy === "RANDOM_POOL"
        ? RANDOM_FAMILIES
        : standard.layoutPolicy === "CHOICE_POOL"
          ? CHOICE_FAMILIES
          : ["SIGNATURE"];
      const targetCellCount = Math.round(Number(tier.areaM2) / CELL_AREA_M2);
      families.forEach((family, index) => {
        const cells = buildShape(targetCellCount, family);
        const width = Math.max(...cells.map((cell) => cell.column));
        const height = Math.max(...cells.map((cell) => cell.row));
        const activeCellKeys = new Set(cells.map((cell) => cellKey(cell.column, cell.row)));
        const inactiveCells = [];
        for (let row = 1; row <= height; row += 1) {
          for (let column = 1; column <= width; column += 1) {
            if (!activeCellKeys.has(cellKey(column, row))) inactiveCells.push({ column, row });
          }
        }
        const rooms = buildRooms(standard.code, tier, cells);
        const layoutTemplateId = `${tier.tierId}-layout-${family.toLowerCase()}-${String(index + 1).padStart(2, "0")}`;
        catalog.templates.push({
          layoutTemplateId,
          standardCode: standard.code,
          tierId: tier.tierId,
          tierLevel: tier.tierLevel,
          label: `${tier.label} / ${family.replace(/_/g, " ")}`,
          variantFamily: family,
          assignmentMode: standard.layoutPolicy,
          areaM2: tier.areaM2,
          activeCellCount: cells.length,
          floorPlan: {
            width,
            height,
            cellAreaM2: CELL_AREA_M2,
            activeCells: toCellKeys(cells),
            inactiveCells: toCellKeys(inactiveCells)
          },
          rooms,
          fixedFixtureAnchors: buildFixtureAnchors(tier, rooms)
        });
        pool.templateIds.push(layoutTemplateId);
      });
      catalog.pools.push(pool);
    });
  });

  window.APP_DATA.housingLayoutPools = catalog;
})();
