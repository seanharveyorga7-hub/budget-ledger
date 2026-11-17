/** Today's date in the user's local timezone as YYYY-MM-DD. */
export function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  // Compare in UTC on both sides so the user's timezone cannot shift the day.
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "2026-11-17" -> "Nov 17, 2026" */
export function formatISODate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Firestore Timestamp (or Date) -> readable date-time. */
export function formatTimestamp(ts) {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '—';
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
