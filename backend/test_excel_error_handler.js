// ============================================================
// Verification Test: Excel Error Handler & Date Validator
// ============================================================

const { validateDateCell, validateChronology, toMySQLDate } = require('./utils/dateUtils');
const { indexToColumnLetter, getFieldMeta } = require('./middlewares/validateUpload');
const { processRows } = require('./services/ageingService');

console.log('--- Starting Excel Error Handler & Date Validation Tests ---\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Test indexToColumnLetter
assert(indexToColumnLetter(1) === 'A', '1 -> A');
assert(indexToColumnLetter(4) === 'D', '4 -> D');
assert(indexToColumnLetter(26) === 'Z', '26 -> Z');
assert(indexToColumnLetter(27) === 'AA', '27 -> AA');
assert(indexToColumnLetter(28) === 'AB', '28 -> AB');

// 2. Test validateDateCell with valid dates
const validD1 = validateDateCell('10-09-2026', { fieldName: 'DOC', cellAddress: 'D14', rowNumber: 14, colLetter: 'D' });
assert(validD1.valid === true && toMySQLDate(validD1.parsedDate) === '2026-09-10', 'Valid 10-09-2026 parsed to 2026-09-10 (September 10)');

const validD2 = validateDateCell('15-08-2024', { fieldName: 'DOI', cellAddress: 'E14', rowNumber: 14, colLetter: 'E' });
assert(validD2.valid === true && toMySQLDate(validD2.parsedDate) === '2024-08-15', 'Valid 15-08-2024 parsed to 2024-08-15');

const validD3 = validateDateCell(45500, { fieldName: 'DOP', cellAddress: 'F14' });
assert(validD3.valid === true && validD3.parsedDate instanceof Date, 'Valid Excel serial date parsed');

// 3. Test validateDateCell with invalid date formats and bounds
const invD1 = validateDateCell('02-31-2024', { fieldName: 'DOC', cellAddress: 'D14', rowNumber: 14, colLetter: 'D' });
assert(invD1.valid === false, 'Invalid calendar date 02-31-2024 rejected');
assert(invD1.error.cell === 'D14', 'Error cell coordinate is D14');
assert(invD1.error.errorType === 'INVALID_DATE_FORMAT', 'Error type is INVALID_DATE_FORMAT');
assert(invD1.error.message.includes('February cannot have 31 days') || invD1.error.message.includes('Could not parse'), 'Specific explanation provided for Feb 31');

const invD2 = validateDateCell('2024-15-40', { fieldName: 'SPU Created Date', cellAddress: 'C22', rowNumber: 22, colLetter: 'C' });
assert(invD2.valid === false && invD2.error.cell === 'C22', 'Malformed date 2024-15-40 rejected at C22');

const invD3 = validateDateCell('invalid_string', { fieldName: 'DOI', cellAddress: 'E8', rowNumber: 8, colLetter: 'E' });
assert(invD3.valid === false && invD3.error.cell === 'E8', 'Text in date cell rejected at E8');

const invD4 = validateDateCell('', { fieldName: 'DOC', cellAddress: 'D5', rowNumber: 5, colLetter: 'D', required: true });
assert(invD4.valid === false && invD4.error.errorType === 'MISSING_REQUIRED_DATE', 'Empty required date flagged at D5');

// 4. Test validateChronology
const chronErr = validateChronology(new Date('2024-09-01'), new Date('2024-05-01'), {
  doiCell: 'E10',
  docCell: 'D10',
  rowNumber: 10,
});
assert(chronErr.valid === false, 'Chronological mismatch DOI > DOC flagged');
assert(chronErr.error.errorType === 'INVALID_DATE_CHRONOLOGY', 'Error type is INVALID_DATE_CHRONOLOGY');
assert(chronErr.error.cell.includes('E10') && chronErr.error.cell.includes('D10'), 'Cell references both E10 and D10');

// 5. Test processRows end-to-end with mock Excel row data containing cell coordinates
const mockRows = [
  // Valid Row
  {
    rowNumber: 2,
    sheetName: 'Sheet1',
    data: {
      'Serial Number': 'WM123456',
      'ZMAC ID': 'COMP-001',
      'Machine Status': 'Warranty',
      'SPU Status': 'ClosedByStoreExecutive',
      'Sub Category': 'FL',
      'Approved Qty': 1,
      'Rej Qty': 0,
      'SPU Created Date': '08-15-2024',
      'DOI': '01-01-2024',
      _cellMap: {
        'Serial Number': 'A2',
        'ZMAC ID': 'B2',
        'SPU Status': 'C2',
        'SPU Created Date': 'D2',
        'DOI': 'E2',
        'Machine Status': 'F2',
        'Sub Category': 'G2',
        'Approved Qty': 'H2',
        'Rej Qty': 'I2',
      },
      _colLetters: {
        'Serial Number': 'A',
        'ZMAC ID': 'B',
        'SPU Status': 'C',
        'SPU Created Date': 'D',
        'DOI': 'E',
        'Machine Status': 'F',
        'Sub Category': 'G',
        'Approved Qty': 'H',
        'Rej Qty': 'I',
      },
    },
  },
  // Row with Invalid Date Format in cell D3
  {
    rowNumber: 3,
    sheetName: 'Sheet1',
    data: {
      'Serial Number': 'WM999999',
      'ZMAC ID': 'COMP-002',
      'Machine Status': 'Warranty',
      'SPU Status': 'ClosedByStoreExecutive',
      'Sub Category': 'FL',
      'Approved Qty': 1,
      'Rej Qty': 0,
      'SPU Created Date': '02-31-2024', // INVALID DATE!
      'DOI': '01-01-2024',
      _cellMap: {
        'Serial Number': 'A3',
        'ZMAC ID': 'B3',
        'SPU Status': 'C3',
        'SPU Created Date': 'D3',
        'DOI': 'E3',
        'Machine Status': 'F3',
        'Sub Category': 'G3',
        'Approved Qty': 'H3',
        'Rej Qty': 'I3',
      },
      _colLetters: {
        'Serial Number': 'A',
        'ZMAC ID': 'B',
        'SPU Status': 'C',
        'SPU Created Date': 'D',
        'DOI': 'E',
        'Machine Status': 'F',
        'Sub Category': 'G',
        'Approved Qty': 'H',
        'Rej Qty': 'I',
      },
    },
  },
  // Row with Business Filter Exclusion (SPU Status 'Open' - NOT ClosedByStoreExecutive) at Row 4
  {
    rowNumber: 4,
    sheetName: 'Sheet1',
    data: {
      'Serial Number': 'WM888888',
      'ZMAC ID': 'COMP-003',
      'Machine Status': 'Warranty',
      'SPU Status': 'Open', // NOT ClosedByStoreExecutive -> silently filtered out!
      'Sub Category': 'FL',
      'Approved Qty': 1,
      'Rej Qty': 0,
      'SPU Created Date': '10/08/2024',
      'DOI': '01/01/2024',
      _cellMap: {
        'Serial Number': 'A4',
        'ZMAC ID': 'B4',
        'SPU Status': 'C4',
        'SPU Created Date': 'D4',
        'DOI': 'E4',
        'Machine Status': 'F4',
        'Sub Category': 'G4',
        'Approved Qty': 'H4',
        'Rej Qty': 'I4',
      },
      _colLetters: {
        'Serial Number': 'A',
        'ZMAC ID': 'B',
        'SPU Status': 'C',
        'SPU Created Date': 'D',
        'DOI': 'E',
        'Machine Status': 'F',
        'Sub Category': 'G',
        'Approved Qty': 'H',
        'Rej Qty': 'I',
      },
    },
  },
  // Row with Duplicate Serial Number at cell A5
  {
    rowNumber: 5,
    sheetName: 'Sheet1',
    data: {
      'Serial Number': 'WM123456', // DUPLICATE of Row 2!
      'ZMAC ID': 'COMP-004',
      'Machine Status': 'Warranty',
      'SPU Status': 'ClosedByStoreExecutive',
      'Sub Category': 'TL',
      'Approved Qty': 1,
      'Rej Qty': 0,
      'SPU Created Date': '08-15-2024',
      'DOI': '01-01-2024',
      _cellMap: {
        'Serial Number': 'A5',
        'ZMAC ID': 'B5',
        'SPU Status': 'C5',
        'SPU Created Date': 'D5',
        'DOI': 'E5',
        'Machine Status': 'F5',
        'Sub Category': 'G5',
        'Approved Qty': 'H5',
        'Rej Qty': 'I5',
      },
      _colLetters: {
        'Serial Number': 'A',
        'ZMAC ID': 'B',
        'SPU Status': 'C',
        'SPU Created Date': 'D',
        'DOI': 'E',
        'Machine Status': 'F',
        'Sub Category': 'G',
        'Approved Qty': 'H',
        'Rej Qty': 'I',
      },
    },
  },
  // Row with Missing/Null DOC at cell D6
  {
    rowNumber: 6,
    sheetName: 'Sheet1',
    data: {
      'Serial Number': 'WM777777',
      'ZMAC ID': 'COMP-005',
      'Machine Status': 'Warranty',
      'SPU Status': 'ClosedByStoreExecutive',
      'Sub Category': 'MW',
      'Approved Qty': 1,
      'Rej Qty': 0,
      'SPU Created Date': '', // NULL DOC!
      'DOI': '01-01-2024',
      _cellMap: {
        'Serial Number': 'A6',
        'ZMAC ID': 'B6',
        'SPU Status': 'C6',
        'SPU Created Date': 'D6',
        'DOI': 'E6',
        'Machine Status': 'F6',
        'Sub Category': 'G6',
        'Approved Qty': 'H6',
        'Rej Qty': 'I6',
      },
      _colLetters: {
        'Serial Number': 'A',
        'ZMAC ID': 'B',
        'SPU Status': 'C',
        'SPU Created Date': 'D',
        'DOI': 'E',
        'Machine Status': 'F',
        'Sub Category': 'G',
        'Approved Qty': 'H',
        'Rej Qty': 'I',
      },
    },
  },
  // Row with Invalid DOI format ("N/A") at cell E7
  {
    rowNumber: 7,
    sheetName: 'Sheet1',
    data: {
      'Serial Number': 'WM666666',
      'ZMAC ID': 'COMP-006',
      'Machine Status': 'Warranty',
      'SPU Status': 'ClosedByStoreExecutive',
      'Sub Category': 'FL',
      'Approved Qty': 1,
      'Rej Qty': 0,
      'SPU Created Date': '08-18-2024',
      'DOI': 'N/A', // INVALID DOI FORMAT!
      _cellMap: {
        'Serial Number': 'A7',
        'ZMAC ID': 'B7',
        'SPU Status': 'C7',
        'SPU Created Date': 'D7',
        'DOI': 'E7',
        'Machine Status': 'F7',
        'Sub Category': 'G7',
        'Approved Qty': 'H7',
        'Rej Qty': 'I7',
      },
      _colLetters: {
        'Serial Number': 'A',
        'ZMAC ID': 'B',
        'SPU Status': 'C',
        'SPU Created Date': 'D',
        'DOI': 'E',
        'Machine Status': 'F',
        'Sub Category': 'G',
        'Approved Qty': 'H',
        'Rej Qty': 'I',
      },
    },
  },
];

const result = processRows(mockRows, 'PART_REPLACEMENT');
assert(result.records.length === 1, '1 valid record processed into records');
assert(result.filteredCount === 1, '1 row silently filtered out due to business criteria (Row 4 SPU Status)');
assert(result.cellErrors.length === 4, '4 actual cell error issues detected (D3 invalid date, A5 duplicate serial, D6 missing DOC, E7 invalid DOI)');

// 1. Verify exact cell coordinate D3 was flagged for invalid date format
const d3Error = result.cellErrors.find((e) => e.cell === 'D3');
assert(Boolean(d3Error), 'Cell D3 recorded as error cell');
assert(d3Error?.errorType === 'INVALID_DATE_FORMAT', 'Cell D3 error type is INVALID_DATE_FORMAT');
assert(d3Error?.rowNumber === 3, 'Cell D3 rowNumber is 3');

// 2. Verify Row 4 (SPU Status 'Open') was silently filtered out without creating a cell error
const c4Error = result.cellErrors.find((e) => e.cell === 'C4' || e.rowNumber === 4);
assert(!c4Error, 'Row 4 SPU Status Open was silently excluded and NOT logged as an error');

// 3. Verify Cell A5 was flagged for Duplicate Serial Number
const a5Error = result.cellErrors.find((e) => e.cell === 'A5');
assert(Boolean(a5Error), 'Cell A5 recorded as duplicate serial error');
assert(a5Error?.errorType === 'DUPLICATE_KEY', 'Cell A5 error type is DUPLICATE_KEY');

// 4. Verify Cell D6 was flagged for Missing DOC
const d6Error = result.cellErrors.find((e) => e.cell === 'D6');
assert(Boolean(d6Error), 'Cell D6 recorded as missing DOC error');
assert(d6Error?.errorType === 'MISSING_REQUIRED_DATE', 'Cell D6 error type is MISSING_REQUIRED_DATE');

// 5. Verify Cell E7 was flagged for Invalid DOI format
const e7Error = result.cellErrors.find((e) => e.cell === 'E7');
assert(Boolean(e7Error), 'Cell E7 recorded as invalid DOI format');
assert(e7Error?.errorType === 'INVALID_DATE_FORMAT', 'Cell E7 error type is INVALID_DATE_FORMAT');

console.log('\n--- Summary ---');
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
