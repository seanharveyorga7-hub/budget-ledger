import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createLedgerEntry, softDeleteLedgerEntry, subscribeLedger, updateLedgerEntry } from '../services/ledgerService';
import { validateLedgerSubmission } from '../utils/validators';
import { useSubscription } from './useSubscription';

/** Live list of ledger entries (real-time updates from Firestore). */
export function useLedger() {
  const { user, isAdmin } = useAuth();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeLedger(onData, onError, isAdmin ? null : user.uid),
    [user?.uid, isAdmin],
    { enabled: Boolean(user) },
  );

  return useMemo(
    () => ({ all: data, entries: data.filter((e) => !e.isDeleted), loading, error }),
    [data, loading, error],
  );
}

/**
 * Ledger writes, following the "Atomic Obligation Ledger Creation & Edit" flow:
 *   1. User submits activity code, amount and date.
 *   2. Client check in utils: amount > 0 and the selected indicator is active.
 *      If not, a ValidationError is thrown before any transaction starts.
 *   3. The service runs the transaction (see ledgerService.js).
 */
export function useLedgerActions() {
  const { actor, isAdmin } = useAuth();
  return useMemo(
    () => ({
      create: async (input, selectedIndicator) => {
        const data = validateLedgerSubmission(input, selectedIndicator);
        return createLedgerEntry(data, actor);
      },
      update: async (entry, input, selectedIndicator) => {
        const data = validateLedgerSubmission(input, selectedIndicator);
        return updateLedgerEntry(entry.id, data, actor, { isAdmin });
      },
      softDelete: (entry) => softDeleteLedgerEntry(entry.id, actor),
    }),
    [actor, isAdmin],
  );
}
