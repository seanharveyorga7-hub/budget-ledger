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

/** 123456 -> "1234.56" (value for an editable input) */
export function centavosToInput(centavos) {
  if (!Number.isFinite(centavos)) return '';
  return (centavos / 100).toFixed(2);
}

export function formatPercent(ratio) {
  if (!Number.isFinite(ratio)) return '0.0%';
  return `${(ratio * 100).toFixed(1)}%`;
}
