// Budget Indicator reads & writes. Document id == activityCode (unique by construction).
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { ValidationError } from '../utils/errors';
import { adjustedBudget } from '../utils/balance';
import { formatCentavos } from '../utils/currency';
import { validateIndicatorInput } from '../utils/validators';

export const indicatorRef = (code) => doc(db, COLLECTIONS.indicators, code);
const snapOpts = { serverTimestamps: 'estimate' };

export function subscribeIndicators(onData, onError) {
  return onSnapshot(
    collection(db, COLLECTIONS.indicators),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }));
      list.sort((a, b) => a.activityCode.localeCompare(b.activityCode));
      onData(list);
    },
    onError,
  );
}

export async function createIndicator(input, actor) {
  const data = validateIndicatorInput(input);
  const ref = indicatorRef(data.activityCode);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      throw new ValidationError(
        `Activity Code "${data.activityCode}" already exists${snap.data().isDeleted ? ' (soft-deleted)' : ''}.`,
      );
    }
    tx.set(ref, {
      ...data,
      realignment: 0,
      totalObligations: 0,
      isDeleted: false,
      createdBy: actor,
      createdAt: serverTimestamp(),
    });
  });
}

export async function updateIndicator(code, input, actor) {
  const data = validateIndicatorInput({ ...input, activityCode: code });
  const ref = indicatorRef(code);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().isDeleted) throw new ValidationError('This indicator no longer exists.');
    const current = snap.data();

    const newAdjusted = adjustedBudget({ annualBudget: data.annualBudget, realignment: current.realignment });
    if (newAdjusted < current.totalObligations) {
      throw new ValidationError(
        `Annual Budget is too low: ${formatCentavos(current.totalObligations)} is already obligated ` +
          `(realignment ${formatCentavos(current.realignment)}).`,
      );
    }
    if (current.totalObligations > 0 && data.objectOfExpenses !== current.objectOfExpenses) {
      throw new ValidationError('Object of Expenses cannot change while the indicator has obligations.');
    }

    tx.update(ref, {
      activityTitle: data.activityTitle,
      objectOfExpenses: data.objectOfExpenses,
      annualBudget: data.annualBudget,
      monthlyAllocation: data.monthlyAllocation,
      updatedBy: actor,
      updatedAt: serverTimestamp(),
    });
  });
}

/** Soft delete only. Blocked while any active obligation references the indicator. */
export async function softDeleteIndicator(code, actor) {
  const ref = indicatorRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().isDeleted) throw new ValidationError('This indicator no longer exists.');
    if (snap.data().totalObligations > 0) {
      throw new ValidationError('Cannot delete an indicator with active obligations. Delete its ledger entries first.');
    }
    if (snap.data().realignment !== 0) {
      throw new ValidationError(
        'Cannot delete an indicator with realigned funds. Realign the money back first so its Realignment is ₱0.00.',
      );
    }
    tx.update(ref, { isDeleted: true, deletedBy: actor, deletedAt: serverTimestamp() });
  });
}
