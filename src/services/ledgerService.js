// Obligation Ledger. Every write runs in a transaction that also updates the
// indicator's running `totalObligations`, so concurrent submissions can never
// push an indicator past its available balance. firestore.rules check the
// same rule on the server.
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { ValidationError } from '../utils/errors';
import { assertSufficientBalance, availableBalance } from '../utils/balance';
import { validateLedgerInput } from '../utils/validators';
import { indicatorRef } from './indicatorService';

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
    throw new ValidationError(`Budget Indicator "${code}" is not active.`);
  }
  return snap.data();
}

export async function createLedgerEntry(input, actor) {
  const data = validateLedgerInput(input);
  const entryRef = doc(collection(db, COLLECTIONS.ledger));
  const indRef = indicatorRef(data.activityCode);

  await runTransaction(db, async (tx) => {
    const indicator = requireActiveIndicator(await tx.get(indRef), data.activityCode);
    assertSufficientBalance(availableBalance(indicator), data.amount, data.activityCode);

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
  });
  return entryRef.id;
}

export async function updateLedgerEntry(entryId, input, actor, { isAdmin = false } = {}) {
  const data = validateLedgerInput(input);
  const entryDoc = ledgerRef(entryId);

  await runTransaction(db, async (tx) => {
    const entrySnap = await tx.get(entryDoc);
    if (!entrySnap.exists() || entrySnap.data().isDeleted) throw new ValidationError('This entry no longer exists.');
    const entry = entrySnap.data();
    if (!isAdmin && entry.createdBy?.uid !== actor.uid) {
      throw new ValidationError('You can only edit ledger entries you created.');
    }

    const sameIndicator = entry.activityCode === data.activityCode;
    const oldRef = indicatorRef(entry.activityCode);
    const newRef = indicatorRef(data.activityCode);
    const oldSnap = await tx.get(oldRef);
    const newSnap = sameIndicator ? oldSnap : await tx.get(newRef);
    const newInd = requireActiveIndicator(newSnap, data.activityCode);

    const entryUpdate = {
      ...data,
      activityTitle: newInd.activityTitle,
      objectOfExpenditure: newInd.objectOfExpenses,
      updatedBy: actor,
      updatedAt: serverTimestamp(),
    };

    if (sameIndicator) {
      // The entry's current amount goes back into the pool before re-checking.
      assertSufficientBalance(availableBalance(newInd) + entry.amount, data.amount, data.activityCode);
      tx.update(entryDoc, entryUpdate);
      tx.update(newRef, {
        totalObligations: newInd.totalObligations - entry.amount + data.amount,
        lastLedgerEntryId: entryId,
      });
    } else {
      const oldInd = requireActiveIndicator(oldSnap, entry.activityCode);
      assertSufficientBalance(availableBalance(newInd), data.amount, data.activityCode);
      tx.update(entryDoc, entryUpdate);
      tx.update(oldRef, {
        totalObligations: oldInd.totalObligations - entry.amount,
        lastLedgerEntryId: entryId,
      });
      tx.update(newRef, {
        totalObligations: newInd.totalObligations + data.amount,
        lastLedgerEntryId: entryId,
      });
    }
  });
}

/** Admin only. The entry's amount automatically returns to the indicator's available balance. */
export async function softDeleteLedgerEntry(entryId, actor) {
  const entryDoc = ledgerRef(entryId);

  await runTransaction(db, async (tx) => {
    const entrySnap = await tx.get(entryDoc);
    if (!entrySnap.exists() || entrySnap.data().isDeleted) throw new ValidationError('This entry is already deleted.');
    const entry = entrySnap.data();
    const indRef = indicatorRef(entry.activityCode);
    const indSnap = await tx.get(indRef);
    if (!indSnap.exists()) throw new ValidationError('The linked indicator no longer exists.');
    const indicator = indSnap.data();

    tx.update(entryDoc, { isDeleted: true, deletedBy: actor, deletedAt: serverTimestamp() });
    tx.update(indRef, {
      totalObligations: indicator.totalObligations - entry.amount,
      lastLedgerEntryId: entryId,
    });
  });
}
