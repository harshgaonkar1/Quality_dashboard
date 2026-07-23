// ============================================================
// Ageing Category Bucketing
// ------------------------------------------------------------
// Converts a raw number of ageing days into the business-defined
// bucket used for summary cards and filtering.
// ============================================================

const AGEING_CATEGORIES = [
  { key: '0-3-months', label: '0-3 Months', min: 0, max: 90 },
  { key: '1-year', label: '1 Year', min: 91, max: 365 },
  { key: '2-year', label: '2 Year', min: 366, max: 730 },
  { key: '3-year', label: '3 Year', min: 731, max: 1095 },
  { key: '4-year', label: '4 Year', min: 1096, max: 1460 },
  { key: 'more-than-4-years', label: 'More than 4 Years', min: 1461, max: Infinity },
];

/**
 * Returns the ageing category object matching a given day count.
 * Returns null if ageingDays is null/undefined/invalid.
 */
function getAgeingCategory(ageingDays) {
  if (ageingDays === null || ageingDays === undefined || isNaN(ageingDays) || ageingDays <= 90) {
    return AGEING_CATEGORIES[0]; // '0-3-months'
  }
  return AGEING_CATEGORIES.find((cat) => ageingDays >= cat.min && ageingDays <= cat.max) || AGEING_CATEGORIES[0];
}

/**
 * Returns the SQL WHERE fragment (ageing_days BETWEEN x AND y) for a given category key.
 * Used by the dashboard details endpoint when a summary card is clicked.
 */
function getAgeingRangeByKey(key) {
  const cat = AGEING_CATEGORIES.find((c) => c.key === key);
  if (!cat) return null;
  return { min: cat.min, max: cat.max === Infinity ? 999999 : cat.max };
}

module.exports = { AGEING_CATEGORIES, getAgeingCategory, getAgeingRangeByKey };
