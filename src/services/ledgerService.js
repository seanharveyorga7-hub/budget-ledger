// Obligation Ledger. Every write runs in a transaction that also updates the
// indicator's running `totalObligations`, so concurrent submissions can never
// push an indicator past its available balance. firestore.rules check the
// same rule on the server.
// Obligation Ledger: the "Atomic Obligation Ledger Creation & Edit" flow.
//
//   (client check in utils: done by useLedgerActions before these functions run)
//   Begin runTransaction()
//     → read target indicator (edits: also the existing entry and its original indicator)
//     → target indicator still active? existing entry still active?  no → ValidationError
//     → available = annualBudget + realignment − totalObligations
//         (edit on the same indicator: add back the old amount)
//     → available ≥ new amount?                                         no → InsufficientBalanceError
//     → stage both changes together: ledger entry (createdBy/updatedBy)
//         + totalObligations on every affected indicator
//   Firestore Rules check role, ownership, schema, matching totals and a non-negative balance
//     → rejected: no writes are applied (permission-denied)
//   Commit result
//     → conflict: Firestore re-runs the transaction from the top (up to TX_MAX_ATTEMPTS)
//     → retries used up or other failure: save error
//     → success: returns the saved entry id and the updated available balance
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { ValidationError } from '../utils/errors';
import { assertSufficientBalance, availableBalance } from '../utils/balance';
import { validateLedgerInput } from '../utils/validators';
import { indicatorRef } from './indicatorService';

export const TX_MAX_ATTEMPTS = 5;

const ledgerRef = (id) => doc(db, COLLECTIONS.ledger, id);
const snapOpts = { serverTimestamps: 'estimate' };

export function subscribeLedger(onData, onError, ownerUid = null) {
  const entries = collection(db, COLLECTIONS.ledger);
  const q = ownerUid
    ? query(entries, where('createdBy.uid', '==', ownerUid))
    : query(entries, orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => onData(snap.docs
    .map((d) => ({ id: d.id, ...d.data(snapOpts) }))
    .sort((a, b) => b.date.localeCompare(a.date))), onError);
}

function requireActiveIndicator(snap, code) {
  if (!snap.exists() || snap.data().isDeleted) {
    throw new ValidationError(`Budget Indicator "${code}" is no longer active.`);
  }
  return snap.data();
}

/** @returns {Promise<{ id: string, activityCode: string, availableAfter: number }>} */
export async function createLedgerEntry(input, actor) {
  const data = validateLedgerInput(input);
  const entryRef = doc(collection(db, COLLECTIONS.ledger));
  const indRef = indicatorRef(data.activityCode);

  return runTransaction(
    db,
    async (tx) => {
      // Read the target indicator and confirm it is still active.
      const indicator = requireActiveIndicator(await tx.get(indRef), data.activityCode);

      // Available balance must cover the new amount.
      const available = availableBalance(indicator);
      assertSufficientBalance(available, data.amount, data.activityCode);

      // Stage both changes together.
      tx.set(entryRef, {
        ...data,
        activityTitle: indicator.activityTitle,
        objectOfExpenditure: indicator.objectOfExpenses, // always derived from the indicator
        isDeleted: false,
        createdBy: actor,
        createdAt: serverTimestamp(),
        updatedBy: actor,
        updatedAt: serverTimestamp(),
      });
      tx.update(indRef, {
        totalObligations: indicator.totalObligations + data.amount,
        lastLedgerEntryId: entryRef.id,
      });

      return { id: entryRef.id, activityCode: data.activityCode, availableAfter: available - data.amount };
    },
    { maxAttempts: TX_MAX_ATTEMPTS },
  );
}

/** @returns {Promise<{ id: string, activityCode: string, availableAfter: number }>} */
export async function updateLedgerEntry(entryId, input, actor, { isAdmin = false } = {}) {
  const data = validateLedgerInput(input);
  const entryDoc = ledgerRef(entryId);

  return runTransaction(
    db,
    async (tx) => {
      // Read the existing entry and confirm it is still active.
      const entrySnap = await tx.get(entryDoc);
      if (!entrySnap.exists() || entrySnap.data().isDeleted) {
        throw new ValidationError('This entry has been deleted or no longer exists.');
      }
      const entry = entrySnap.data();
      if (!isAdmin && entry.createdBy?.uid !== actor.uid) {
        throw new ValidationError('You can only edit ledger entries you created.');
      }

      // Read the original indicator, plus the target indicator if the entry moves.
      const sameIndicator = entry.activityCode === data.activityCode;
      const oldRef = indicatorRef(entry.activityCode);
      const newRef = indicatorRef(data.activityCode);
      const oldSnap = await tx.get(oldRef);
      const newSnap = sameIndicator ? oldSnap : await tx.get(newRef);

      // Target indicator still active?
      const newInd = requireActiveIndicator(newSnap, data.activityCode);

      // Available balance; on the same indicator the old amount goes back into the pool.
      const available = availableBalance(newInd) + (sameIndicator ? entry.amount : 0);
      assertSufficientBalance(available, data.amount, data.activityCode);

      // Stage the entry update and every affected indicator total together.
      tx.update(entryDoc, {
        ...data,
        activityTitle: newInd.activityTitle,
        objectOfExpenditure: newInd.objectOfExpenses,
        updatedBy: actor,
        updatedAt: serverTimestamp(),
      });
      if (sameIndicator) {
        tx.update(newRef, {
          totalObligations: newInd.totalObligations - entry.amount + data.amount,
          lastLedgerEntryId: entryId,
        });
      } else {
        const oldInd = requireActiveIndicator(oldSnap, entry.activityCode);
        tx.update(oldRef, { totalObligations: oldInd.totalObligations - entry.amount, lastLedgerEntryId: entryId });
        tx.update(newRef, { totalObligations: newInd.totalObligations + data.amount, lastLedgerEntryId: entryId });
      }

      return { id: entryId, activityCode: data.activityCode, availableAfter: available - data.amount };
    },
    { maxAttempts: TX_MAX_ATTEMPTS },
  );
}

/**
 * Admin only. The entry's amount automatically returns to the indicator's available balance.
 * @returns {Promise<{ activityCode: string, availableAfter: number }>}
 */
export async function softDeleteLedgerEntry(entryId, actor) {
  const entryDoc = ledgerRef(entryId);

  return runTransaction(
    db,
    async (tx) => {
      const entrySnap = await tx.get(entryDoc);
      if (!entrySnap.exists() || entrySnap.data().isDeleted) throw new ValidationError('This entry is already deleted.');
      const entry = entrySnap.data();
      const indRef = indicatorRef(entry.activityCode);
      const indSnap = await tx.get(indRef);
      if (!indSnap.exists()) throw new ValidationError('The linked indicator no longer exists.');
      const indicator = indSnap.data();

      tx.update(entryDoc, { isDeleted: true, deletedBy: actor, deletedAt: serverTimestamp() });
      tx.update(indRef, { totalObligations: indicator.totalObligations - entry.amount, lastLedgerEntryId: entryId });

      return { activityCode: entry.activityCode, availableAfter: availableBalance(indicator) + entry.amount };
    },
    { maxAttempts: TX_MAX_ATTEMPTS },
  );
}
