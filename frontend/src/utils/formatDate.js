// ============================================================
// Date Formatting Utility
// ------------------------------------------------------------
// Formats MySQL 'YYYY-MM-DD' date strings into a readable
// 'DD MMM YYYY' display format (e.g. '01 Jan 2024').
// ============================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const monthLabel = MONTHS[parseInt(month, 10) - 1] || month;
  return `${day} ${monthLabel} ${year}`;
}
