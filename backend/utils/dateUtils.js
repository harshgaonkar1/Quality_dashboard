// ============================================================
// Date Utilities
// ------------------------------------------------------------
// Excel dates arrive in many shapes: JS Date objects (when ExcelJS
// recognizes a real date cell), Excel serial numbers, or strings
// like "01-Jan-2024" / "2024-01-01" / "01/02/2024". These helpers
// normalize all of them into a single reliable format.
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Converts an Excel serial date number into a JS Date.
 * Excel's epoch starts at 1899-12-30 (accounting for the historical leap-year bug).
 */
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569); // days since 1970-01-01
  const utcValue = utcDays * MS_PER_DAY;
  return new Date(utcValue);
}

/**
 * Attempts to parse a value (Date object, Excel serial number, or string)
 * into a valid JS Date. Returns null if parsing fails.
 */
function parseFlexibleDate(value, options = {}) {
  if (value === null || value === undefined || value === '') return null;

  // Already a JS Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  // Excel serial number
  if (typeof value === 'number' && isFinite(value)) {
    const date = excelSerialToDate(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const preferYyyyDdMm = Boolean(options && (options.preferYyyyDdMm || options.isYyyyDdMm));

    // 1. DD-MM-YYYY (e.g. 10-09-2026 -> 10th September 2026 -> 2026-09-10) or MM-DD-YYYY
    const dmyMatch = trimmed.match(
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/
    );

    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);

      // Primary: DD-MM-YYYY format from Excel sheets (p1 is Day 1-31, p2 is Month 1-12)
      // e.g. 10-09-2026 -> Day 10, Month 9 (September), Year 2026 -> stored as 2026-09-10
      if (p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
        const month = p2 - 1;
        const day = p1;
        const d = new Date(Date.UTC(year, month, day));

        if (
          d.getUTCFullYear() === year &&
          d.getUTCMonth() === month &&
          d.getUTCDate() === day
        ) {
          return d;
        }
      }

      // Fallback: If p1 <= 12 and p2 > 12, it must be MM-DD-YYYY (e.g. 09-25-2026)
      if (p1 >= 1 && p1 <= 12 && p2 > 12 && p2 <= 31) {
        const month = p1 - 1;
        const day = p2;
        const d = new Date(Date.UTC(year, month, day));

        if (
          d.getUTCFullYear() === year &&
          d.getUTCMonth() === month &&
          d.getUTCDate() === day
        ) {
          return d;
        }
      }

      return null;
    }

    // 2. DD-MMM-YYYY (e.g. 03-Aug-2024)
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];

    const ddMmmYyyy = trimmed.match(
      /^(\d{1,2})[-\/\s]([A-Za-z]{3,})[-\/\s](\d{2,4})$/
    );

    if (ddMmmYyyy) {
      const day = parseInt(ddMmmYyyy[1], 10);

      const monthIndex = monthNames.indexOf(
        ddMmmYyyy[2].toLowerCase().slice(0, 3)
      );

      let year = parseInt(ddMmmYyyy[3], 10);

      if (year < 100) year += 2000;

      if (monthIndex >= 0) {
        const d = new Date(
          Date.UTC(year, monthIndex, day)
        );

        if (
          d.getUTCFullYear() === year &&
          d.getUTCMonth() === monthIndex &&
          d.getUTCDate() === day
        ) {
          return d;
        }
      }
    }

    // 3. YYYY-MM-DD or YYYY-DD-MM
    const ymdMatch = trimmed.match(
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/
    );

    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const part2 = parseInt(ymdMatch[2], 10);
      const part3 = parseInt(ymdMatch[3], 10);

      // Default YYYY-MM-DD
      const month = part2 - 1;
      const day = part3;
      const d = new Date(Date.UTC(year, month, day));

      if (
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month &&
        d.getUTCDate() === day
      ) {
        return d;
      }

      // Fallback: YYYY-DD-MM
      if (part2 > 12 && part3 <= 12) {
        const altDay = part2;
        const altMonth = part3 - 1;
        const altD = new Date(Date.UTC(year, altMonth, altDay));

        if (
          altD.getUTCFullYear() === year &&
          altD.getUTCMonth() === altMonth &&
          altD.getUTCDate() === altDay
        ) {
          return altD;
        }
      }
    }

    // Native parsing only as final fallback
    const nativeAttempt = new Date(trimmed);

    if (!isNaN(nativeAttempt.getTime())) {
      return nativeAttempt;
    }
  }

  return null;
}

/**
 * Validates a date cell value and returns structured error diagnostic if invalid.
 * 
 * @param {any} value - Cell value from Excel
 * @param {object} options - { fieldName, cellAddress, rowNumber, colLetter, required, preferYyyyDdMm, minYear, maxYear }
 * @returns {{ valid: boolean, parsedDate: Date|null, error: object|null }}
 */
function validateDateCell(value, options = {}) {
  const {
    fieldName = 'Date',
    cellAddress = '',
    rowNumber = null,
    colLetter = '',
    required = false,
    preferYyyyDdMm = false,
    minYear = 1990,
    maxYear = 2050,
  } = options;

  const cellRef = cellAddress ? `cell ${cellAddress}` : (rowNumber ? `Row ${rowNumber}` : 'cell');

  // Check empty
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    if (required) {
      return {
        valid: false,
        parsedDate: null,
        error: {
          errorType: 'MISSING_REQUIRED_DATE',
          cell: cellAddress || `Row ${rowNumber}`,
          rowNumber,
          colLetter,
          colName: fieldName,
          value: '(empty)',
          expected: 'Valid Date (MM-DD-YYYY or MM/DD/YYYY)',
          message: `Missing mandatory date: ${cellRef} ('${fieldName}') is empty.`,
          suggestedFix: `Provide a valid date in format MM-DD-YYYY (e.g., 08-15-2024) or MM/DD/YYYY.`,
        },
      };
    }
    return { valid: true, parsedDate: null, error: null };
  }

  // Fast check for special invalid placeholders
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    if (['na', 'n/a', 'nil', 'null', 'none', 'invalid', '00/00/0000', '00-00-0000', '0000-00-00', '-', '#n/a', '#value!'].includes(lower)) {
      return {
        valid: false,
        parsedDate: null,
        error: {
          errorType: 'INVALID_DATE_FORMAT',
          cell: cellAddress || `Row ${rowNumber}`,
          rowNumber,
          colLetter,
          colName: fieldName,
          value: trimmed,
          expected: 'MM-DD-YYYY or MM/DD/YYYY',
          message: `Invalid date placeholder '${trimmed}' in ${cellRef} ('${fieldName}').`,
          suggestedFix: `Replace placeholder '${trimmed}' with a real date in MM-DD-YYYY (e.g., 08-15-2024) format.`,
        },
      };
    }
  }

  // Attempt parsing
  const parsedDate = parseFlexibleDate(value, { preferYyyyDdMm });

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    // Specific diagnostic for common date typos
    let specificReason = `Could not parse '${String(value)}' into a valid calendar date.`;
    if (typeof value === 'string') {
      const matchMDY = value.trim().match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (matchMDY) {
        const m = parseInt(matchMDY[1], 10);
        const d = parseInt(matchMDY[2], 10);
        if (m > 12) {
          specificReason = `Month value ${m} is invalid (must be between 1 and 12 in MM-DD-YYYY format).`;
        } else if (d > 31) {
          specificReason = `Day value ${d} is invalid (must be between 1 and 31).`;
        } else if (m === 2 && d > 29) {
          specificReason = `February cannot have ${d} days.`;
        } else if ([4, 6, 9, 11].includes(m) && d > 30) {
          specificReason = `Month ${m} only has 30 days, but day was ${d}.`;
        }
      }
    }

    return {
      valid: false,
      parsedDate: null,
      error: {
        errorType: 'INVALID_DATE_FORMAT',
        cell: cellAddress || `Row ${rowNumber}`,
        rowNumber,
        colLetter,
        colName: fieldName,
        value: String(value),
        expected: 'MM-DD-YYYY or MM/DD/YYYY',
        message: `Invalid date format in ${cellRef} ('${fieldName}'): ${specificReason}`,
        suggestedFix: `Ensure the cell contains a valid date formatted as MM-DD-YYYY (e.g. 08-15-2024) or MM/DD/YYYY.`,
      },
    };
  }

  // Year range validation
  const year = parsedDate.getUTCFullYear();
  if (year < minYear || year > maxYear) {
    return {
      valid: false,
      parsedDate: null,
      error: {
        errorType: 'INVALID_DATE_RANGE',
        cell: cellAddress || `Row ${rowNumber}`,
        rowNumber,
        colLetter,
        colName: fieldName,
        value: String(value),
        expected: `Year between ${minYear} and ${maxYear}`,
        message: `Date '${String(value)}' in ${cellRef} ('${fieldName}') has out-of-range year ${year}.`,
        suggestedFix: `Correct the year in ${cellRef} to a valid year between ${minYear} and ${maxYear}.`,
      },
    };
  }

  return {
    valid: true,
    parsedDate,
    error: null,
  };
}

/**
 * Validates chronological relationship between Date of Installation (DOI) and Complaint Date (DOC).
 */
function validateChronology(doiDate, docDate, options = {}) {
  if (!doiDate || !docDate) return { valid: true, error: null };

  const {
    doiCell = 'DOI',
    docCell = 'DOC',
    rowNumber = null,
  } = options;

  if (doiDate.getTime() > docDate.getTime()) {
    return {
      valid: false,
      error: {
        errorType: 'INVALID_DATE_CHRONOLOGY',
        cell: `${doiCell || 'DOI'} & ${docCell || 'DOC'}`,
        rowNumber,
        colLetter: null,
        colName: 'Installation Date vs Complaint Date',
        value: `DOI (${toMySQLDate(doiDate)}) > DOC (${toMySQLDate(docDate)})`,
        expected: 'Installation Date (DOI) <= Complaint Date (DOC)',
        message: `Chronology error in Row ${rowNumber || '?'}: Installation Date (${toMySQLDate(doiDate)} in ${doiCell}) is AFTER Complaint Date (${toMySQLDate(docDate)} in ${docCell}), yielding negative ageing.`,
        suggestedFix: `Check and swap or correct the installation date (${doiCell}) or complaint date (${docCell}) in your Excel file.`,
      },
    };
  }

  return { valid: true, error: null };
}

/**
 * Formats a Date object into 'YYYY-MM-DD' for SQL DATE columns.
 */
function toMySQLDate(date) {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const toPostgresDate = toMySQLDate;

/**
 * Calculates Ageing = DOC - DOI, expressed as a whole number of days.
 * Returns null when either date is missing/invalid, or when the result
 * would be negative (data-entry error: complaint date before install date).
 */
function calculateAgeingDays(doiDate, docDate) {
  if (!doiDate || !docDate) return null;
  const diffMs = docDate.getTime() - doiDate.getTime();
  if (diffMs < 0) return null;
  return Math.round(diffMs / MS_PER_DAY);
}

function normalizeDateFilter(dateStr) {
  if (!dateStr || dateStr === 'latest') return null;
  const parsed = parseFlexibleDate(dateStr);
  if (parsed && !isNaN(parsed.getTime())) {
    return toMySQLDate(parsed);
  }
  const clean = String(dateStr).split('T')[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  return null;
}

module.exports = {
  parseFlexibleDate,
  validateDateCell,
  validateChronology,
  toMySQLDate,
  toPostgresDate,
  calculateAgeingDays,
  normalizeDateFilter,
};



