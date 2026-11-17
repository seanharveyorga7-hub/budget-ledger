export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InsufficientBalanceError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

const FIREBASE_MESSAGES = {
  // Security rules rejected the commit; none of its writes were applied.
  'permission-denied':
    'The server rejected this change and nothing was saved. You may not have permission, or it would break a budget rule.',
  // Every transaction attempt hit a conflict.
  aborted: 'Could not save: other users kept changing the same records. Nothing was saved. Please try again.',
  'failed-precondition': 'Could not save because the data changed while saving. Nothing was saved. Please try again.',
  unavailable: 'Cannot reach the server. Check your connection and try again.',
  'not-found': 'The record no longer exists.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

/**
 * Which outcome of the ledger flowchart an error belongs to:
 * 'validation' | 'insufficient' | 'rejected' | 'save'.
 */
export function errorKind(err) {
  if (err instanceof InsufficientBalanceError) return 'insufficient';
  if (err instanceof ValidationError) return 'validation';
  if (err?.code === 'permission-denied') return 'rejected';
  return 'save';
}

export const ERROR_TITLES = {
  validation: 'Validation error',
  insufficient: 'Insufficient balance',
  rejected: 'Rejected by security rules',
  save: 'Save error',
};

/** Turn any thrown value into a message that is safe to show the user. */
export function friendlyError(err) {
  if (!err) return 'Something went wrong.';
  if (err instanceof ValidationError) return err.message;
  if (err.code && FIREBASE_MESSAGES[err.code]) return FIREBASE_MESSAGES[err.code];
  return err.message || 'Something went wrong.';
}
