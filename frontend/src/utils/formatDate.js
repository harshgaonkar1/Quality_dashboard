// ============================================================
// Date Formatting Utility
// ------------------------------------------------------------
// Formats 'YYYY-MM-DD' or 'YYYY-DD-MM' date strings into a readable
// 'DD MMM YYYY' display format (e.g. '01 Jan 2024').
// ============================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    // DD/MM/YYYY
    year = parts[2];
    day = parts[0];
    month = parts[1];
  } else {
    return dateStr;
  }

  const mIdx = parseInt(month, 10) - 1;
  const monthLabel = MONTHS[mIdx] || month;
  return `${String(parseInt(day, 10)).padStart(2, '0')} ${monthLabel} ${year}`;
}

