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
function parseFlexibleDate(value) {
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

    // DD/MM/YYYY or DD-MM-YYYY
    const ddMmYyyy = trimmed.match(
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/
    );

    if (ddMmYyyy) {
      const day = parseInt(ddMmYyyy[1], 10);
      const month = parseInt(ddMmYyyy[2], 10) - 1;
      const year = parseInt(ddMmYyyy[3], 10);

      const d = new Date(Date.UTC(year, month, day));

      if (
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month &&
        d.getUTCDate() === day
      ) {
        return d;
      }

      return null;
    }

    // DD-MMM-YYYY
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

    // ISO YYYY-MM-DD
    const iso = trimmed.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

    if (iso) {
      const year = parseInt(iso[1], 10);
      const month = parseInt(iso[2], 10) - 1;
      const day = parseInt(iso[3], 10);

      const d = new Date(Date.UTC(year, month, day));

      if (
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month &&
        d.getUTCDate() === day
      ) {
        return d;
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

module.exports = {
  parseFlexibleDate,
  toMySQLDate,
  toPostgresDate,
  calculateAgeingDays,
};
