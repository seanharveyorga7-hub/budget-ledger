// Monthly allocation math (all values in integer centavos).

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Split an annual budget evenly across 12 months.
 * Any centavo remainder goes to December so the total is exact.
 * e.g. 100000 (₱1,000.00) -> 11 × 8333 + 8337
 */
export function autoDistribute(annualCentavos) {
  const total = Math.max(0, Math.trunc(Number(annualCentavos) || 0));
  const base = Math.floor(total / 12);
  const months = Array(11).fill(base);
  months.push(total - base * 11);
  return months;
}

export function sumMonths(months) {
  return (months || []).reduce((sum, m) => sum + (Number(m) || 0), 0);
}

/** Validate a 12-month allocation against the annual budget. */
export function validateMonthlyAllocation(months, annualCentavos) {
  if (!Array.isArray(months) || months.length !== 12) {
    return { ok: false, sum: 0, diff: annualCentavos, message: 'Monthly allocation must have 12 months.' };
  }
  if (months.some((m) => !Number.isSafeInteger(m) || m < 0)) {
    return { ok: false, sum: 0, diff: annualCentavos, message: 'Every month must be a valid non-negative amount.' };
  }
  const sum = sumMonths(months);
  const diff = annualCentavos - sum;
  return {
    ok: diff === 0,
    sum,
    diff,
    message: diff === 0 ? '' : 'The 12-month total must equal the Annual Budget.',
  };
}

/** "2026-03-15" -> 2 (March) */
export function monthIndexFromISO(isoDate) {
  return Number(String(isoDate).slice(5, 7)) - 1;
}

export function yearFromISO(isoDate) {
  return Number(String(isoDate).slice(0, 4));
}
