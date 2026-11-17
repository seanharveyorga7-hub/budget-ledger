// All money is stored and computed as INTEGER CENTAVOS to avoid floating-point drift.
// Convert to pesos only for display.

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123456 -> "₱1,234.56" */
export function formatCentavos(centavos) {
  return pesoFormatter.format((Number(centavos) || 0) / 100);
}

/** 123456 -> "1,234.56" (no currency sign; for dense tables) */
export function formatAmount(centavos) {
  return plainFormatter.format((Number(centavos) || 0) / 100);
}

/**
 * Parse a user-entered peso string ("1,234.5", "₱ 1000") into integer centavos.
 * Returns null when the input is empty or not a valid non-negative amount
 * with at most two decimal places.
 */
export function parseToCentavos(input) {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[₱,\s]/g, '');
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const centavos = Number(whole || '0') * 100 + Number((fraction + '00').slice(0, 2));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** 123456 -> "1,234.56" (value for an editable input) */
export function centavosToInput(centavos) {
  if (!Number.isFinite(centavos)) return '';
  return plainFormatter.format(centavos / 100);
}

/**
 * Tidy a money field while the user types: keep only digits and one ".",
 * at most 2 decimals, no leading zeros, and add thousands commas.
 *   "1234567.891" -> "1,234,567.89"    "abc12" -> "12"    ".5" -> "0.5"
 */
export function formatMoneyTyping(raw) {
  const s = String(raw ?? '').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  let whole = dot === -1 ? s : s.slice(0, dot);
  const fraction = dot === -1 ? null : s.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  whole = whole.replace(/^0+(?=\d)/, '');
  if (whole === '' && fraction !== null) whole = '0';
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === null ? grouped : `${grouped}.${fraction}`;
}

/** Number of digits and "." in a string (commas are ignored). Used to keep the caret in place. */
export function countMoneyChars(str) {
  return (String(str).match(/[\d.]/g) || []).length;
}

/** Caret index just after the n-th digit or "." in a formatted string. */
export function caretAfterMoneyChars(str, n) {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < str.length; i++) {
    if (/[\d.]/.test(str[i]) && ++seen === n) return i + 1;
  }
  return str.length;
}

export function formatPercent(ratio) {
  if (!Number.isFinite(ratio)) return '0.0%';
  return `${(ratio * 100).toFixed(1)}%`;
}
