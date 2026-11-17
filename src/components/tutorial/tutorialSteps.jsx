// Tutorial content. Each step can highlight an element marked with
// data-tour="<target>" and switch to `route` first.
// `roles` limits a step to certain roles. `body` may be { [role]: content }.
import { ROLES } from '../../utils/constants';

const A = ROLES.SYS_ADMIN;
const U = ROLES.USER;

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Budget Ledger 👋',
    body: {
      [A]: (
        <>
          <p>You're signed in as a <strong>System Admin</strong>. This quick tour walks you through every feature:</p>
          <ul>
            <li>setting up budget indicators</li>
            <li>moving funds between indicators</li>
            <li>recording obligations</li>
            <li>managing user roles</li>
          </ul>
          <p>It takes about two minutes. You can replay it any time.</p>
        </>
      ),
      [U]: (
        <>
          <p>You're signed in as a <strong>Normal User</strong>. This quick tour shows you how to read budget indicators and record obligations against them.</p>
          <p>It takes about a minute. You can replay it any time.</p>
        </>
      ),
    },
  },
  {
    id: 'nav',
    target: 'nav',
    title: 'Find your way around',
    body: {
      [A]: <p>Use the sidebar to move between the <strong>Dashboard</strong>, <strong>Budget Indicators</strong>, the <strong>Obligation Ledger</strong>, <strong>Deleted Records</strong> (the soft-deleted archive) and <strong>Settings</strong>, where you manage users.</p>,
      [U]: <p>Use the sidebar to move between the <strong>Dashboard</strong>, <strong>Budget Indicators</strong> and the <strong>Obligation Ledger</strong>.</p>,
    },
  },
  {
    id: 'dash-stats',
    route: '/',
    target: 'dashboard-stats',
    title: 'Your budget at a glance',
    body: (
      <>
        <p>These cards total every active indicator. The key number is the <strong>Available Balance</strong>:</p>
        <p className="tour-formula">(Annual Budget + Realignment) − Obligations</p>
        <p>The cards update live whenever anyone records or changes an obligation.</p>
      </>
    ),
  },
  {
    id: 'dash-object',
    route: '/',
    target: 'dashboard-object',
    title: 'Breakdown by Object of Expenses',
    body: (
      <p>
        Totals for each spending class: <strong>PS</strong>, <strong>MOOE</strong>, <strong>CO</strong> and <strong>FE</strong>.
        The <em>Used</em> badge turns amber at 80% utilization and red at 100%.
      </p>
    ),
  },
  {
    id: 'dash-risk',
    route: '/',
    target: 'dashboard-risk',
    title: 'Indicators running low',
    body: <p>Any indicator that has used 80% or more of its budget appears here, so you can act before it runs out.</p>,
  },
  {
    id: 'dash-monthly',
    route: '/',
    target: 'dashboard-monthly',
    title: 'Monthly plan vs. actual',
    body: (
      <p>
        Compare each month's planned <strong>allocation</strong> with what was actually <strong>obligated</strong>. Use the year selector to
        switch years. A red variance means more was spent that month than planned.
      </p>
    ),
  },
  {
    id: 'ind-table',
    route: '/indicators',
    target: 'indicators-table',
    title: 'Budget Indicators',
    body: {
      [A]: (
        <>
          <p>Each row is one activity's budget, showing its annual budget, realignment, obligations and available balance.</p>
          <p>Use the row buttons to <strong>Edit</strong>, <strong>Realign</strong> or <strong>Delete</strong> an indicator. Delete only works when nothing is obligated against it, and it's a soft delete: the record is kept for audit.</p>
          <p><strong>Click any row</strong> to see its month-by-month allocation and spending, and its audit trail.</p>
        </>
      ),
      [U]: (
        <>
          <p>Each row is one activity's approved budget. You can see how much has been obligated and how much is still <strong>available</strong>.</p>
          <p>This page is <strong>read-only</strong> for you. Only System Admins can change budgets.</p>
          <p><strong>Click any row</strong> to see its month-by-month allocation and spending, and its audit trail.</p>
        </>
      ),
    },
  },
  {
    id: 'ind-toolbar',
    route: '/indicators',
    target: 'indicators-toolbar',
    title: 'Search & filter',
    body: {
      [A]: <p>Search by activity code or title, or filter by Object of Expenses. Deleted indicators move to the <strong>Deleted Records</strong> page.</p>,
      [U]: <p>Search by activity code or title, or filter by Object of Expenses.</p>,
    },
  },
  {
    id: 'ind-new',
    roles: [A],
    route: '/indicators',
    target: 'indicators-new',
    title: 'Create a Budget Indicator',
    body: (
      <>
        <p>Enter a unique <strong>Activity Code</strong>, a title, the Object of Expenses and the <strong>Annual Budget</strong>.</p>
        <p>Click <strong>Auto-Distribute</strong> to split the budget evenly across 12 months. Any leftover centavos go to December. You can adjust months by hand, but you can't save until the 12 months add up exactly to the Annual Budget.</p>
      </>
    ),
  },
  {
    id: 'ind-realign',
    roles: [A],
    route: '/indicators',
    target: 'indicators-realign',
    title: 'Realign funds',
    body: (
      <p>
        Move money from a <strong>source</strong> indicator to a <strong>target</strong> indicator. They can have different codes or
        objects of expenses. The source must have enough available balance. Both indicators update together, and the transfer is recorded with your reason.
      </p>
    ),
  },
  {
    id: 'ind-tabs',
    route: '/indicators',
    target: 'indicators-tabs',
    title: 'Realignment Log',
    body: <p>Open the <strong>Realignment Log</strong> tab to see every transfer: the source and target, the amount, the reason, and who made it.</p>,
  },
  {
    id: 'ledger-new',
    route: '/ledger',
    target: 'ledger-new',
    title: 'Record an obligation',
    body: (
      <>
        <p>Choose an active indicator. The <strong>Activity Title</strong> and <strong>Object of Expenditure</strong> fill in automatically. Then enter the amount and the transaction date.</p>
        <p>The form shows the indicator's available balance and won't let you exceed it. The server checks the balance again, so two people saving at the same moment can't overspend.</p>
      </>
    ),
  },
  {
    id: 'ledger-toolbar',
    route: '/ledger',
    target: 'ledger-toolbar',
    title: 'Find entries quickly',
    body: {
      [A]: <p>Search by code, title or particulars, filter by indicator, or tick <strong>My entries</strong> to see only your own.</p>,
      [U]: <p>Search by code, title or particulars, filter by indicator, or tick <strong>My entries</strong> to see only the obligations you encoded.</p>,
    },
  },
  {
    id: 'ledger-table',
    route: '/ledger',
    target: 'ledger-table',
    title: 'The Obligation Ledger',
    body: {
      [A]: (
        <>
          <p>You can <strong>Edit</strong> any entry. <strong>Delete</strong> marks an entry as deleted without removing it, and returns its amount to the indicator's available balance.</p>
          <p><strong>Click any row</strong> to see who created, last edited or deleted it, and when.</p>
        </>
      ),
      [U]: (
        <>
          <p>You can <strong>Edit</strong> the entries you encoded, as long as the new amount fits the available balance. Only System Admins can delete entries.</p>
          <p><strong>Click any row</strong> to see who created or last edited it, and when.</p>
        </>
      ),
    },
  },
  {
    id: 'deleted',
    roles: [A],
    route: '/deleted',
    target: 'deleted-table',
    title: 'Deleted Records',
    body: (
      <p>
        Nothing is ever erased. Deleted indicators and obligations are listed here, with who deleted them and when. Switch between the two
        with the tabs, and <strong>click any row</strong> for its full audit trail.
      </p>
    ),
  },
  {
    id: 'settings',
    roles: [A],
    route: '/settings',
    target: 'settings-users',
    title: 'Manage user roles',
    body: (
      <p>
        Everyone who signs up starts as a <strong>Normal User</strong>. Use the role selector to promote someone to System Admin, or to demote them. You
        can't change your own role, so there is always at least one admin.
      </p>
    ),
  },
  {
    id: 'account',
    target: 'sidebar-user',
    title: 'Your account',
    body: <p>This shows your name and role. Sign out here when you're done.</p>,
  },
  {
    id: 'help',
    target: 'tour-button',
    title: 'Need a refresher?',
    body: (
      <p>
        That's everything! Click the <span className="help-inline" aria-label="question mark">?</span> button at the top of the page any
        time to replay this tour.
      </p>
    ),
  },
];

const isRoleMap = (body) => body && typeof body === 'object' && (A in body || U in body);

/** Steps visible to `role`, with role-specific content resolved. */
export function getStepsForRole(role) {
  return STEPS.filter((s) => !s.roles || s.roles.includes(role)).map((s) => ({
    ...s,
    body: isRoleMap(s.body) ? s.body[role] ?? s.body[U] : s.body,
  }));
}
