import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { ROLES } from '../utils/constants';
import { ValidationError } from '../utils/errors';

const userRef = (uid) => doc(db, COLLECTIONS.users, uid);
const snapOpts = { serverTimestamps: 'estimate' };

/**
 * Create the user's profile on first sign-in. New users always start as `user`;
 * firestore.rules reject any other role at creation.
 */
export async function ensureUserProfile(firebaseUser, preferredName) {
  const ref = userRef(firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  const displayName =
    (preferredName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User').trim().slice(0, 100);
  await setDoc(ref, {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName,
    role: ROLES.USER,
    createdAt: serverTimestamp(),
  });
}

export function subscribeUserProfile(uid, onData, onError) {
  return onSnapshot(
    userRef(uid),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data(snapOpts) } : null),
    onError,
  );
}

/** Admin only (rules enforce this). */
export function subscribeUsers(onData, onError) {
  return onSnapshot(
    collection(db, COLLECTIONS.users),
    (snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }));
      users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      onData(users);
    },
    onError,
  );
}

/** Records that the user finished (or skipped) the onboarding tutorial. */
export async function markTutorialComplete(uid) {
  await updateDoc(userRef(uid), { tutorialCompletedAt: serverTimestamp() });
}

/** Admin promotes/demotes another user. Admins can never change their own role. */
export async function updateUserRole(targetUid, role, actor) {
  if (targetUid === actor.uid) {
    throw new ValidationError('You cannot change your own role.');
  }
  if (!Object.values(ROLES).includes(role)) {
    throw new ValidationError('Invalid role.');
  }
  await updateDoc(userRef(targetUid), {
    role,
    roleUpdatedBy: actor,
    roleUpdatedAt: serverTimestamp(),
  });
}

/** Admin changes another user's access to the ledger app. */
export async function updateUserStatus(targetUid, isActive, actor) {
  if (targetUid === actor.uid) {
    throw new ValidationError('You cannot change your own account status.');
  }
  await updateDoc(userRef(targetUid), {
    isActive,
    statusUpdatedBy: actor,
    statusUpdatedAt: serverTimestamp(),
  });
}
