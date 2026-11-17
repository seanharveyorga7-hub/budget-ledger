// Balance math & validators.
//
//   Available Balance = (Annual Budget + Realignment) - Total Active Obligations
//
// `totalObligations` is a running total kept on each indicator. It changes only
// inside the same Firestore transaction as the ledger write that causes it, and
// the security rules check that both change by exactly the same amount.

import { InsufficientBalanceError } from './errors';
import { formatCentavos } from './currency';

export function adjustedBudget(indicator) {
  if (!indicator) return 0;
  return (indicator.annualBudget || 0) + (indicator.realignment || 0);
}

export function availableBalance(indicator) {
  if (!indicator) return 0;
  return adjustedBudget(indicator) - (indicator.totalObligations || 0);
}

export function utilizationRate(indicator) {
  const adjusted = adjustedBudget(indicator);
  return adjusted > 0 ? (indicator.totalObligations || 0) / adjusted : 0;
}

/**
 * Balance available to a ledger entry being created or edited.
 * When editing an entry that stays on the same indicator, its current amount is
 * returned to the pool first, so it can be re-obligated.
 */
export function availableForEntry(indicator, existingEntry) {
  const base = availableBalance(indicator);
  if (existingEntry && !existingEntry.isDeleted && existingEntry.activityCode === indicator?.activityCode) {
    return base + existingEntry.amount;
  }
  return base;
}

export function assertSufficientBalance(available, amount, label = 'this indicator') {
  if (amount > available) {
    throw new InsufficientBalanceError(
      `Amount ${formatCentavos(amount)} exceeds the available balance of ${formatCentavos(available)} for ${label}.`,
    );
  }
}

export function utilizationTone(ratio) {
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.8) return 'warning';
  return 'success';
}
