// Budget realignment: atomic transfer between two indicators + append-only log.
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { ValidationError } from '../utils/errors';
import { assertSufficientBalance, availableBalance } from '../utils/balance';
import { validateRealignmentInput } from '../utils/validators';
import { indicatorRef } from './indicatorService';

const snapOpts = { serverTimestamps: 'estimate' };

export function subscribeRealignments(onData, onError) {
  const q = query(collection(db, COLLECTIONS.realignments), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }))), onError);
}

export async function realignBudget(input, actor) {
  const { sourceCode, targetCode, amount, reason } = validateRealignmentInput(input);
  const sourceRef = indicatorRef(sourceCode);
  const targetRef = indicatorRef(targetCode);
  const logRef = doc(collection(db, COLLECTIONS.realignments));

  await runTransaction(db, async (tx) => {
    // All reads before any writes.
    const [sourceSnap, targetSnap] = await Promise.all([tx.get(sourceRef), tx.get(targetRef)]);
    if (!sourceSnap.exists() || sourceSnap.data().isDeleted) throw new ValidationError('Source indicator not found.');
    if (!targetSnap.exists() || targetSnap.data().isDeleted) throw new ValidationError('Target indicator not found.');

    const source = sourceSnap.data();
    const target = targetSnap.data();
    const sourceAvailable = availableBalance(source);
    assertSufficientBalance(sourceAvailable, amount, `source ${sourceCode}`);

    tx.set(logRef, {
      sourceCode,
      sourceTitle: source.activityTitle,
      sourceObject: source.objectOfExpenses,
      sourceAvailableBefore: sourceAvailable,
      targetCode,
      targetTitle: target.activityTitle,
      targetObject: target.objectOfExpenses,
      targetAvailableBefore: availableBalance(target),
      amount,
      reason,
      createdBy: actor,
      createdAt: serverTimestamp(),
    });
    tx.update(sourceRef, {
      realignment: (source.realignment || 0) - amount,
      lastRealignmentId: logRef.id,
      updatedBy: actor,
      updatedAt: serverTimestamp(),
    });
    tx.update(targetRef, {
      realignment: (target.realignment || 0) + amount,
      lastRealignmentId: logRef.id,
      updatedBy: actor,
      updatedAt: serverTimestamp(),
    });
  });
}
