// ============================================================
// Model Spec Parser (FL Models)
// ------------------------------------------------------------
// Extracts Capacity (Kg) and Spin Speed (RPM) from Front Load (FL)
// washing machine model strings.
//
// Rule:
// FL models contain a 4-digit code (e.g. 9014, 7012, 8014, 6512, 6514):
// - First 2 digits = Capacity:
//     90 -> 9.0 Kg (9 Kg)
//     85 -> 8.5 Kg
//     80 -> 8.0 Kg (8 Kg)
//     75 -> 7.5 Kg
//     70 -> 7.0 Kg (7 Kg)
//     65 -> 6.5 Kg
//     60 -> 6.0 Kg (6 Kg)
//     10 -> 10.0 Kg (10 Kg)
// - Last 2 digits = Spin Speed (RPM):
//     14 -> 1400 RPM
//     12 -> 1200 RPM
//     10 -> 1000 RPM
//     16 -> 1600 RPM
//     08 -> 800 RPM
//
// Examples:
// - "EXECUTIVE MSN 9014K CMS" -> 9 Kg, 1400 RPM
// - "SENORITA WX 6512"        -> 6.5 Kg, 1200 RPM
// - "SERENA 7012"             -> 7 Kg, 1200 RPM
// - "DIVA 8014"               -> 8 Kg, 1400 RPM
// - "SENORITA ZX 6514"        -> 6.5 Kg, 1400 RPM
// ============================================================

/**
 * Parses an individual FL model name string.
 * @param {string} modelStr - Raw model string from DB
 * @returns {object} Parsed model specification
 */
export function parseFLModelSpecs(modelStr) {
  if (!modelStr || typeof modelStr !== 'string') {
    return {
      rawModel: modelStr || 'Unknown Model',
      capacityKg: null,
      capacityLabel: 'Unknown Capacity',
      rpm: null,
      rpmLabel: 'Unknown RPM',
      specKey: 'Unknown Spec',
      matchedCode: null,
      isParsed: false,
    };
  }

  const clean = modelStr.trim().toUpperCase();

  // 1. Try matching standard 4-digit pattern (e.g. 9014, 9014K, 6512CMS, 8014-G)
  // Match 4 continuous digits possibly followed by letters or isolated
  const fourDigitRegexes = [
    /\b(\d{2})(\d{2})[A-Z0-9]*\b/g,
    /(?:^|\s|[A-Z])(\d{2})(\d{2})(?:[A-Z\s\-_]|$)/g,
  ];

  let capacityKg = null;
  let rpm = null;
  let matchedCode = null;

  for (const regex of fourDigitRegexes) {
    const matches = [...clean.matchAll(regex)];
    for (const m of matches) {
      const capDigits = parseInt(m[1], 10);
      const rpmDigits = parseInt(m[2], 10);

      // Validate capacity: either 50-99 (5.0 - 9.9 kg), 10-12 (10 - 12 kg), or 5-9 (5-9 kg)
      // Validate RPM: 06-18 (600 - 1800 RPM)
      const isKnownCap = (capDigits >= 50 && capDigits <= 99) || capDigits === 10 || capDigits === 11 || capDigits === 12;
      const isKnownRpm = (rpmDigits >= 6 && rpmDigits <= 18) || (rpmDigits === 80 || rpmDigits === 10 || rpmDigits === 12 || rpmDigits === 14 || rpmDigits === 16);

      if (isKnownCap && isKnownRpm) {
        matchedCode = `${m[1]}${m[2]}`;
        if (capDigits >= 50 && capDigits <= 99) {
          capacityKg = capDigits / 10;
        } else {
          capacityKg = capDigits;
        }

        if (rpmDigits <= 20) {
          rpm = rpmDigits * 100;
        } else {
          rpm = rpmDigits * 10;
        }
        break;
      }
    }
    if (matchedCode) break;
  }

  // 2. Check 5-digit edge case (e.g., 10014 -> 10.0 Kg, 1400 RPM)
  if (!matchedCode) {
    const fiveDigitMatch = clean.match(/\b(100)(\d{2})[A-Z]*\b/);
    if (fiveDigitMatch) {
      matchedCode = fiveDigitMatch[0];
      capacityKg = 10.0;
      rpm = parseInt(fiveDigitMatch[2], 10) * 100;
    }
  }

  // 3. Fallback: Check standard IFB keywords if digits weren't in 4-digit block
  if (!matchedCode) {
    // Capacity keyword scan
    const capMatch = clean.match(/\b(6|6\.5|7|7\.5|8|8\.5|9|9\.5|10)\s*KG\b/);
    if (capMatch) {
      capacityKg = parseFloat(capMatch[1]);
    }
    // RPM keyword scan
    const rpmMatch = clean.match(/\b(800|1000|1200|1400|1600)\s*RPM\b/);
    if (rpmMatch) {
      rpm = parseInt(rpmMatch[1], 10);
    }
  }

  const isParsed = capacityKg !== null || rpm !== null;
  const capacityLabel = capacityKg !== null ? `${capacityKg % 1 === 0 ? capacityKg : capacityKg.toFixed(1)} Kg` : 'Other Capacity';
  const rpmLabel = rpm !== null ? `${rpm} RPM` : 'Other RPM';
  const specKey = capacityKg !== null && rpm !== null ? `${capacityLabel} · ${rpmLabel}` : (capacityKg !== null ? capacityLabel : 'Other Spec');

  return {
    rawModel: modelStr,
    capacityKg,
    capacityLabel,
    rpm,
    rpmLabel,
    specKey,
    matchedCode,
    isParsed,
  };
}

/**
 * Aggregates a list of product_replacement records into FL Capacity & RPM metrics.
 * @param {Array<object>} rows - Array of product_replacement rows
 * @returns {object} Aggregated stats and chart-ready datasets
 */
export function aggregateFLModelSpecs(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      totalFLMachines: 0,
      byCapacity: [],
      byRpm: [],
      bySpec: [],
      topModels: [],
      capacityList: [],
      rpmList: [],
      matrix: {},
      parsedCount: 0,
      unparsedCount: 0,
    };
  }

  // Filter for Front Load (FL) models only
  const flRows = rows.filter((r) => {
    const model = (r.model || '').toUpperCase().trim();
    const subCat = (r.sub_category || '').toUpperCase().trim();
    // Exclude TL models
    if (model.startsWith('TL') || subCat === 'TL') return false;
    return true;
  });

  const capacityMap = new Map();
  const rpmMap = new Map();
  const specMap = new Map();
  const modelCountMap = new Map();
  const matrix = {}; // { [capacityLabel]: { [rpmLabel]: count } }

  let parsedCount = 0;
  let unparsedCount = 0;

  for (const row of flRows) {
    const spec = parseFLModelSpecs(row.model);
    if (spec.isParsed) parsedCount++;
    else unparsedCount++;

    // Track by Model Name
    const modelKey = row.model || 'Unknown Model';
    if (!modelCountMap.has(modelKey)) {
      modelCountMap.set(modelKey, { model: modelKey, spec, count: 0 });
    }
    modelCountMap.get(modelKey).count++;

    // Track by Capacity
    const capKey = spec.capacityLabel;
    if (!capacityMap.has(capKey)) {
      capacityMap.set(capKey, {
        capacityKg: spec.capacityKg ?? 999,
        capacityLabel: capKey,
        count: 0,
        rpms: {},
      });
    }
    const capEntry = capacityMap.get(capKey);
    capEntry.count++;
    capEntry.rpms[spec.rpmLabel] = (capEntry.rpms[spec.rpmLabel] || 0) + 1;

    // Track by RPM
    const rpmKey = spec.rpmLabel;
    if (!rpmMap.has(rpmKey)) {
      rpmMap.set(rpmKey, {
        rpm: spec.rpm ?? 999,
        rpmLabel: rpmKey,
        count: 0,
        capacities: {},
      });
    }
    const rpmEntry = rpmMap.get(rpmKey);
    rpmEntry.count++;
    rpmEntry.capacities[spec.capacityLabel] = (rpmEntry.capacities[spec.capacityLabel] || 0) + 1;

    // Track by Combined Spec
    const specKey = spec.specKey;
    if (!specMap.has(specKey)) {
      specMap.set(specKey, {
        specKey,
        capacityLabel: spec.capacityLabel,
        capacityKg: spec.capacityKg ?? 999,
        rpmLabel: spec.rpmLabel,
        rpm: spec.rpm ?? 999,
        count: 0,
        models: new Set(),
      });
    }
    const sEntry = specMap.get(specKey);
    sEntry.count++;
    sEntry.models.add(modelKey);

    // Matrix
    if (!matrix[capKey]) matrix[capKey] = {};
    matrix[capKey][rpmKey] = (matrix[capKey][rpmKey] || 0) + 1;
  }

  const totalFL = flRows.length;

  // Sort capacities numerically
  const byCapacity = Array.from(capacityMap.values()).sort((a, b) => a.capacityKg - b.capacityKg).map((c) => ({
    ...c,
    percentage: totalFL > 0 ? ((c.count / totalFL) * 100).toFixed(1) : '0.0',
  }));

  // Sort RPMs numerically
  const byRpm = Array.from(rpmMap.values()).sort((a, b) => a.rpm - b.rpm).map((r) => ({
    ...r,
    percentage: totalFL > 0 ? ((r.count / totalFL) * 100).toFixed(1) : '0.0',
  }));

  // Sort Specs by count descending
  const bySpec = Array.from(specMap.values()).map((s) => ({
    ...s,
    models: Array.from(s.models),
    percentage: totalFL > 0 ? ((s.count / totalFL) * 100).toFixed(1) : '0.0',
  })).sort((a, b) => b.count - a.count);

  // Top models
  const topModels = Array.from(modelCountMap.values())
    .map((m) => ({
      model: m.model,
      capacityLabel: m.spec.capacityLabel,
      rpmLabel: m.spec.rpmLabel,
      specKey: m.spec.specKey,
      matchedCode: m.spec.matchedCode,
      count: m.count,
      percentage: totalFL > 0 ? ((m.count / totalFL) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.count - a.count);

  const capacityList = byCapacity.map((c) => c.capacityLabel);
  const rpmList = byRpm.map((r) => r.rpmLabel);

  return {
    totalFLMachines: totalFL,
    byCapacity,
    byRpm,
    bySpec,
    topModels,
    capacityList,
    rpmList,
    matrix,
    parsedCount,
    unparsedCount,
  };
}
