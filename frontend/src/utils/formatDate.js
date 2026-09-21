// ============================================================
// Date Formatting Utility
// ------------------------------------------------------------
// Formats date strings into 'MM-DD-YYYY' display format (e.g. '08-15-2024').
// ============================================================

export function formatDate(dateStr, isYyyyDdMm = false) {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).split('T')[0].trim();
  const parts = cleanStr.split(/[-\/]/);
  if (parts.length !== 3) return dateStr;

  let year, month, day;
  if (parts[0].length === 4) {
    year = parts[0];
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // If middle number > 12, it must be the day (YYYY-DD-MM)
    if (isYyyyDdMm || (p1 > 12 && p2 <= 12)) {
      day = parts[1];
      month = parts[2];
    } else {
      month = parts[1];
      day = parts[2];
    }
  } else if (parts[2].length === 4) {
    // DD-MM-YYYY or MM-DD-YYYY
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    year = parts[2];

    // In DD-MM-YYYY inputs (e.g. 10-09-2026 -> 10th September 2026)
    if (p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
      day = parts[0];
      month = parts[1];
    } else if (p1 >= 1 && p1 <= 12 && p2 > 12) {
      // MM-DD-YYYY inputs (e.g. 09-25-2026 -> 25th September 2026)
      month = parts[0];
      day = parts[1];
    } else {
      month = parts[1];
      day = parts[0];
    }
  } else {
    return dateStr;
  }

  const mm = String(parseInt(month, 10)).padStart(2, '0');
  const dd = String(parseInt(day, 10)).padStart(2, '0');
  return `${mm}-${dd}-${year}`;
}

