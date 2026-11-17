// End-to-end check of services + firestore.rules against the Firebase Emulator Suite.
// Run with:  npm run test:emulator   (needs Java 11+; downloads firebase-tools via npx)
import { register } from 'node:module';

register('./resolve-hook.mjs', import.meta.url);

const PROJECT = 'demo-budget-ledger';
Object.assign(process.env, {
  VITE_FIREBASE_API_KEY: 'demo-key',
  VITE_FIREBASE_PROJECT_ID: PROJECT,
  VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
  VITE_USE_EMULATORS: 'true',
});

const { auth, db } = await import('../src/lib/firebase.js');
const { doc, getDoc, updateDoc, deleteDoc, writeBatch, collection, serverTimestamp, setDoc } = await import('firebase/firestore');
const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
const authService = await import('../src/services/authService.js');
const userService = await import('../src/services/userService.js');
const ind = await import('../src/services/indicatorService.js');
const ledger = await import('../src/services/ledgerService.js');
const { realignBudget } = await import('../src/services/realignmentService.js');
const { autoDistribute } = await import('../src/utils/monthly.js');

let passed = 0;
let failed = 0;
const ok = (name) => { passed++; console.log(`  ✓ ${name}`); };
const bad = (name, why) => { failed++; console.log(`  ✗ ${name}\n      ${why}`); };

async function expectOk(name, fn) {
  try { const r = await fn(); ok(name); return r; } catch (e) { bad(name, `${e.code || e.name}: ${e.message}`); return undefined; }
}
async function expectFail(name, fn, kind) {
  try { await fn(); bad(name, 'expected failure but it succeeded'); } catch (e) {
    const got = e.code || e.name;
    if (kind && got !== kind) bad(name, `expected ${kind}, got ${got}: ${e.message}`); else ok(`${name} (${got})`);
  }
}
async function expectEqual(name, actual, expected) {
  if (actual === expected) ok(name); else bad(name, `expected ${expected}, got ${actual}`);
}

const users = {};
async function createUser(key, name) {
  const user = await authService.register(`${key}@test.local`, 'password123', name);
  await userService.ensureUserProfile(user, name);
  users[key] = { uid: user.uid, actor: { uid: user.uid, name } };
  await signOut(auth);
}
async function as(key) {
  if (auth.currentUser) await signOut(auth);
  await signInWithEmailAndPassword(auth, `${key}@test.local`, 'password123');
  return users[key].actor;
}
async function promoteWithOwner(uid) {
  // Emulator-only admin bypass (same as setting the role in the Firebase console).
  const url = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=role`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { role: { stringValue: 'sys_admin' } } }),
  });
  if (!res.ok) throw new Error(`promote failed: ${res.status} ${await res.text()}`);
}
const total = async (code) => (await getDoc(ind.indicatorRef(code))).data().totalObligations;
const realign = async (code) => (await getDoc(ind.indicatorRef(code))).data().realignment;

console.log('\nUsers & roles');
await createUser('admin', 'Ada Admin');
await createUser('alice', 'Alice User');
await createUser('bob', 'Bob User');
await promoteWithOwner(users.admin.uid);

let me = await as('alice');
await expectFail('user cannot self-promote', () => updateDoc(doc(db, 'users', me.uid), { role: 'sys_admin' }), 'permission-denied');
await expectFail('user cannot create profile as admin', () =>
  setDoc(doc(db, 'users', me.uid), { uid: me.uid, email: 'x', displayName: 'x', role: 'sys_admin', createdAt: serverTimestamp() }), 'permission-denied');
await expectFail('user cannot change another role', () => userService.updateUserRole(users.bob.uid, 'sys_admin', me), 'permission-denied');
await expectOk('user can rename self', () => updateDoc(doc(db, 'users', me.uid), { displayName: 'Alice U.' }));

me = await as('admin');
await expectFail('admin cannot change own role (service)', () => userService.updateUserRole(me.uid, 'user', me), 'ValidationError');
await expectFail('admin cannot change own role (rules)', () =>
  updateDoc(doc(db, 'users', me.uid), { role: 'user', roleUpdatedBy: me, roleUpdatedAt: serverTimestamp() }), 'permission-denied');

console.log('\nBudget indicators');
const base = (code, budget, object = 'MOOE') => ({
  activityCode: code, activityTitle: `Activity ${code}`, objectOfExpenses: object, annualBudget: budget, monthlyAllocation: autoDistribute(budget),
});
await expectOk('admin creates A-001 (₱1,000.00)', () => ind.createIndicator(base('A-001', 100000), me));
await expectOk('admin creates B-002 (₱500.00, CO)', () => ind.createIndicator(base('B-002', 50000, 'CO'), me));
await expectFail('duplicate activity code rejected', () => ind.createIndicator(base('A-001', 100), me), 'ValidationError');
await expectFail('month sum mismatch rejected (service)', () =>
  ind.createIndicator({ ...base('C-003', 1200), monthlyAllocation: autoDistribute(1100) }, me), 'ValidationError');
await expectFail('month sum mismatch rejected (rules)', () =>
  setDoc(ind.indicatorRef('C-003'), { ...base('C-003', 1200), monthlyAllocation: autoDistribute(1100), realignment: 0, totalObligations: 0, isDeleted: false, createdBy: me, createdAt: serverTimestamp() }), 'permission-denied');

me = await as('alice');
await expectFail('user cannot create indicator', () => ind.createIndicator(base('Z-999', 100), me), 'permission-denied');
await expectFail('user cannot realign', () => realignBudget({ sourceCode: 'A-001', targetCode: 'B-002', amount: 100, reason: 'x' }, me), 'permission-denied');

console.log('\nObligation ledger');
const e1 = await expectOk('alice obligates ₱600 on A-001', () => ledger.createLedgerEntry({ activityCode: 'A-001', amount: 60000, date: '2026-03-10', particulars: 'Supplies' }, me));
await expectEqual('A-001 totalObligations = 60000', await total('A-001'), 60000);
await expectFail('over-budget entry blocked (service)', () =>
  ledger.createLedgerEntry({ activityCode: 'A-001', amount: 50000, date: '2026-03-11', particulars: '' }, me), 'InsufficientBalanceError');
await expectFail('over-budget entry blocked (rules bypass)', async () => {
  const b = writeBatch(db);
  const ref = doc(collection(db, 'ledger'));
  b.set(ref, { activityCode: 'A-001', activityTitle: 'Activity A-001', objectOfExpenditure: 'MOOE', amount: 50000, date: '2026-03-11', particulars: '', isDeleted: false, createdBy: me, createdAt: serverTimestamp(), updatedBy: me, updatedAt: serverTimestamp() });
  b.update(ind.indicatorRef('A-001'), { totalObligations: 110000, lastLedgerEntryId: ref.id });
  await b.commit();
}, 'permission-denied');
await expectFail('ledger write without indicator update blocked', () =>
  setDoc(doc(collection(db, 'ledger')), { activityCode: 'A-001', activityTitle: 'Activity A-001', objectOfExpenditure: 'MOOE', amount: 100, date: '2026-03-11', particulars: '', isDeleted: false, createdBy: me, createdAt: serverTimestamp(), updatedBy: me, updatedAt: serverTimestamp() }), 'permission-denied');
await expectFail('cannot lower an unrelated indicator total', async () => {
  const b = writeBatch(db);
  const ref = doc(collection(db, 'ledger'));
  b.set(ref, { activityCode: 'B-002', activityTitle: 'Activity B-002', objectOfExpenditure: 'CO', amount: 100, date: '2026-03-11', particulars: '', isDeleted: false, createdBy: me, createdAt: serverTimestamp(), updatedBy: me, updatedAt: serverTimestamp() });
  b.update(ind.indicatorRef('B-002'), { totalObligations: 100, lastLedgerEntryId: ref.id });
  b.update(ind.indicatorRef('A-001'), { totalObligations: 0, lastLedgerEntryId: ref.id });
  await b.commit();
}, 'permission-denied');
await expectFail('wrong object of expenditure rejected', async () => {
  const b = writeBatch(db);
  const ref = doc(collection(db, 'ledger'));
  b.set(ref, { activityCode: 'B-002', activityTitle: 'Activity B-002', objectOfExpenditure: 'PS', amount: 100, date: '2026-03-11', particulars: '', isDeleted: false, createdBy: me, createdAt: serverTimestamp(), updatedBy: me, updatedAt: serverTimestamp() });
  b.update(ind.indicatorRef('B-002'), { totalObligations: 100, lastLedgerEntryId: ref.id });
  await b.commit();
}, 'permission-denied');

const results = await Promise.allSettled([
  ledger.createLedgerEntry({ activityCode: 'A-001', amount: 30000, date: '2026-04-01', particulars: 'race 1' }, me),
  ledger.createLedgerEntry({ activityCode: 'A-001', amount: 30000, date: '2026-04-01', particulars: 'race 2' }, me),
]);
const wins = results.filter((r) => r.status === 'fulfilled').length;
await expectEqual('concurrent submissions: exactly one of two ₱300 entries fits ₱400', wins, 1);
await expectEqual('A-001 totalObligations = 90000 after race', await total('A-001'), 90000);

await expectOk('alice edits own entry ₱600 → ₱700 (pool includes own amount)', () =>
  ledger.updateLedgerEntry(e1, { activityCode: 'A-001', amount: 70000, date: '2026-03-10', particulars: 'Supplies' }, me));
await expectEqual('A-001 totalObligations = 100000', await total('A-001'), 100000);
await expectOk('alice moves entry to B-002 at ₱200', () =>
  ledger.updateLedgerEntry(e1, { activityCode: 'B-002', amount: 20000, date: '2026-03-10', particulars: 'Moved' }, me));
await expectEqual('A-001 total back to 30000', await total('A-001'), 30000);
await expectEqual('B-002 total = 20000', await total('B-002'), 20000);
await expectFail('alice cannot soft-delete (admin only)', () => ledger.softDeleteLedgerEntry(e1, me), 'permission-denied');
await expectFail('hard delete blocked', () => deleteDoc(doc(db, 'ledger', e1)), 'permission-denied');

me = await as('bob');
await expectFail("bob cannot edit alice's entry (service)", () =>
  ledger.updateLedgerEntry(e1, { activityCode: 'B-002', amount: 100, date: '2026-03-10', particulars: '' }, me), 'ValidationError');
await expectFail("bob cannot edit alice's entry (rules)", () =>
  ledger.updateLedgerEntry(e1, { activityCode: 'B-002', amount: 100, date: '2026-03-10', particulars: '' }, me, { isAdmin: true }), 'permission-denied');

console.log('\nRealignment');
me = await as('admin');
await expectFail('realign more than source available blocked', () =>
  realignBudget({ sourceCode: 'A-001', targetCode: 'B-002', amount: 70001, reason: 'too much' }, me), 'InsufficientBalanceError');
await expectOk('realign ₱250 A-001 → B-002', () => realignBudget({ sourceCode: 'A-001', targetCode: 'B-002', amount: 25000, reason: 'Re-prioritize' }, me));
await expectEqual('A-001 realignment = -25000', await realign('A-001'), -25000);
await expectEqual('B-002 realignment = +25000', await realign('B-002'), 25000);
await expectFail('realignment without log blocked', () =>
  updateDoc(ind.indicatorRef('B-002'), { realignment: 99999, updatedBy: me, updatedAt: serverTimestamp() }), 'permission-denied');
await expectFail('budget cannot drop below obligations', () => ind.updateIndicator('A-001', { ...base('A-001', 50000) }, me), 'ValidationError');
await expectOk('admin edits A-001 title & budget', () => ind.updateIndicator('A-001', { ...base('A-001', 60000), activityTitle: 'Renamed' }, me));

console.log('\nSoft delete & audit');
await expectOk('admin soft-deletes entry', () => ledger.softDeleteLedgerEntry(e1, me));
await expectEqual('B-002 total returns to 0', await total('B-002'), 0);
const deleted = (await getDoc(doc(db, 'ledger', e1))).data();
await expectEqual('entry isDeleted', deleted.isDeleted, true);
await expectEqual('entry deletedBy recorded', deleted.deletedBy?.uid, me.uid);
await expectFail('cannot delete indicator with obligations', () => ind.softDeleteIndicator('A-001', me), 'ValidationError');
await expectOk('admin soft-deletes empty B-002', () => ind.softDeleteIndicator('B-002', me));
await expectFail('no obligations on deleted indicator', () =>
  ledger.createLedgerEntry({ activityCode: 'B-002', amount: 1, date: '2026-05-01', particulars: '' }, me), 'ValidationError');
await expectFail('hard delete of indicator blocked', () => deleteDoc(ind.indicatorRef('A-001')), 'permission-denied');
await expectOk('admin promotes alice', () => userService.updateUserRole(users.alice.uid, 'sys_admin', me));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
