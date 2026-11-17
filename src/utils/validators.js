// Pure input validators shared by forms and services.
// Services always re-validate, so UI checks are a convenience, not the guard.
// The final guard is firestore.rules.

import { ValidationError } from './errors';
import { ACTIVITY_CODE_PATTERN, OBJECT_CODES, MAX_TITLE_LENGTH, MAX_NOTE_LENGTH } from './constants';
import { validateMonthlyAllocation } from './monthly';
import { isValidISODate } from './dates';

export function normalizeActivityCode(code) {
  return String(code || '').trim().toUpperCase();
}

function requireMoney(value, label, { allowZero = true } = {}) {
  if (!Number.isSafeInteger(value) || value < 0 || (!allowZero && value === 0)) {
    throw new ValidationError(`${label} must be a valid amount${allowZero ? '' : ' greater than zero'}.`);
  }
}

/** Returns the normalized indicator payload or throws ValidationError. */
export function validateIndicatorInput(input) {
  const activityCode = normalizeActivityCode(input.activityCode);
  const activityTitle = String(input.activityTitle || '').trim();
  const { objectOfExpenses, annualBudget, monthlyAllocation } = input;

  if (!ACTIVITY_CODE_PATTERN.test(activityCode)) {
    throw new ValidationError('Activity Code is required: letters, numbers, ".", "_" or "-" (max 50).');
  }
  if (!activityTitle || activityTitle.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Activity Title is required (max ${MAX_TITLE_LENGTH} characters).`);
  }
  if (!OBJECT_CODES.includes(objectOfExpenses)) {
    throw new ValidationError('Please choose a valid Object of Expenses.');
  }
  requireMoney(annualBudget, 'Annual Budget');
  const monthly = validateMonthlyAllocation(monthlyAllocation, annualBudget);
  if (!monthly.ok) throw new ValidationError(monthly.message);

  return { activityCode, activityTitle, objectOfExpenses, annualBudget, monthlyAllocation: [...monthlyAllocation] };
}

export function validateLedgerInput(input) {
  const activityCode = normalizeActivityCode(input.activityCode);
  const particulars = String(input.particulars || '').trim();
  if (!activityCode) throw new ValidationError('Please choose a Budget Indicator.');
  requireMoney(input.amount, 'Amount', { allowZero: false });
  if (!isValidISODate(input.date)) throw new ValidationError('Please enter a valid transaction date.');
  if (particulars.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`Particulars must be at most ${MAX_NOTE_LENGTH} characters.`);
  }
  return { activityCode, amount: input.amount, date: input.date, particulars };
}

export function validateRealignmentInput(input) {
  const sourceCode = normalizeActivityCode(input.sourceCode);
  const targetCode = normalizeActivityCode(input.targetCode);
  const reason = String(input.reason || '').trim();
  if (!sourceCode || !targetCode) throw new ValidationError('Choose both a source and a target indicator.');
  if (sourceCode === targetCode) throw new ValidationError('Source and target must be different indicators.');
  requireMoney(input.amount, 'Transfer amount', { allowZero: false });
  if (!reason) throw new ValidationError('Please give a reason for the realignment.');
  if (reason.length > MAX_NOTE_LENGTH) throw new ValidationError(`Reason must be at most ${MAX_NOTE_LENGTH} characters.`);
  return { sourceCode, targetCode, amount: input.amount, reason };
}
