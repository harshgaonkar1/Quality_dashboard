// ============================================================
// Verification Test: Part Grouping Aggregation Logic
// ============================================================

const { enrichRowWithLookup } = require('./models/partReplacementModel');

console.log('--- Testing Part Grouping Aggregation Logic ---');

const dummyLookupMap = new Map();
dummyLookupMap.set('1001', 'Motor & Drive');
dummyLookupMap.set('1002', 'Pump Assembly');

const row1 = enrichRowWithLookup({ item_code: '1001', description: 'Motor 220V' }, dummyLookupMap);
console.log('Row 1 grouping:', row1.grouping === 'Motor & Drive' ? '✅ PASS' : '❌ FAIL');

const row2 = enrichRowWithLookup({ item_code: '1002', description: 'Drain Pump' }, dummyLookupMap);
console.log('Row 2 grouping:', row2.grouping === 'Pump Assembly' ? '✅ PASS' : '❌ FAIL');

const row3 = enrichRowWithLookup({ item_code: '9999', description: 'Unknown Part' }, dummyLookupMap);
console.log('Row 3 grouping fallback:', row3.grouping === 'Other Components' ? '✅ PASS' : '❌ FAIL');

console.log('Part grouping aggregation verification completed.');
