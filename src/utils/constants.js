export const ROLES = Object.freeze({
  SYS_ADMIN: 'sys_admin',
  USER: 'user',
});

export const ROLE_LABELS = {
  [ROLES.SYS_ADMIN]: 'System Admin',
  [ROLES.USER]: 'Normal User',
};

// Object of Expenses. The stored value is the name itself.
// Must stay in sync with objectNames() in firestore.rules.
export const OBJECTS_OF_EXPENSES = [
  'Travelling Expenses - Local',
  'ICT Training Expenses',
  'Training Expenses',
  'ICT Office Supplies Expenses',
  'Office Supplies Expenses',
  'Accountable Forms Expenses',
  'Fuel, Oil and Lubricants',
  'Other Supplies and Materials Expenses',
  'Water Expenses',
  'Electricity Expenses',
  'Postage and Courier Expenses',
  'Mobile',
  'Landline',
  'Internet Subscription Expenses',
  'Cable, Satellite, Telegraph and Radio Expenses',
  'Awards/Rewards Expenses',
  'Extraordinary and Miscellaneous Expenses',
].map((name) => ({ value: name, label: name }));

export const OBJECT_CODES = OBJECTS_OF_EXPENSES.map((o) => o.value);

// The original four classes. Indicators created before the list changed may still
// carry one; they stay valid on those records but can't be chosen for new ones.
export const LEGACY_OBJECTS = {
  PS: 'Personnel Services',
  MOOE: 'Maintenance & Other Operating Expenses',
  CO: 'Capital Outlay',
  FE: 'Financial Expenses',
};

export const isLegacyObject = (value) => Object.hasOwn(LEGACY_OBJECTS, value);

/** Display name for a stored object value ("PS" -> "Personnel Services (PS)"). */
export function objectLabel(value) {
  return isLegacyObject(value) ? `${LEGACY_OBJECTS[value]} (${value})` : value || '';
}

// Document id == activityCode, so it must be a valid Firestore id (no "/").
export const ACTIVITY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,49}$/;

export const MAX_TITLE_LENGTH = 300;
export const MAX_NOTE_LENGTH = 500;
