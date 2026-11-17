import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function register(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function logOut() {
  return signOut(auth);
}
