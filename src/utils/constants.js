export const ROLES = Object.freeze({
  SYS_ADMIN: 'sys_admin',
  USER: 'user',
});

export const ROLE_LABELS = {
  [ROLES.SYS_ADMIN]: 'System Admin',
  [ROLES.USER]: 'Normal User',
};

// Must stay in sync with the list in firestore.rules (validIndicator).
export const OBJECTS_OF_EXPENSES = [
  { value: 'PS', label: 'Personnel Services' },
  { value: 'MOOE', label: 'Maintenance & Other Operating Expenses' },
  { value: 'CO', label: 'Capital Outlay' },
  { value: 'FE', label: 'Financial Expenses' },
];

export const OBJECT_CODES = OBJECTS_OF_EXPENSES.map((o) => o.value);

// Document id == activityCode, so it must be a valid Firestore id (no "/").
export const ACTIVITY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,49}$/;

export const MAX_TITLE_LENGTH = 300;
export const MAX_NOTE_LENGTH = 500;
