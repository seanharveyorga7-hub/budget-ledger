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
  'permission-denied':
    'The server rejected this change. You may not have permission, or it would break a budget rule.',
  aborted: 'Another user changed this record at the same time. Please try again.',
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

/** Turn any thrown value into a message that is safe to show the user. */
export function friendlyError(err) {
  if (!err) return 'Something went wrong.';
  if (err instanceof ValidationError) return err.message;
  if (err.code && FIREBASE_MESSAGES[err.code]) return FIREBASE_MESSAGES[err.code];
  return err.message || 'Something went wrong.';
}
