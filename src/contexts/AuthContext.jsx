import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { ensureUserProfile, subscribeUserProfile } from '../services/userService';
import { ROLES } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pendingName = useRef(null); // display name typed at registration

  useEffect(
    () =>
      authService.onAuthChange((firebaseUser) => {
        setUser(firebaseUser);
        setError(null);
        if (!firebaseUser) {
          setProfile(null);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }),
    [],
  );

  // Create the profile if needed, then watch it so role changes apply live.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    let unsubscribe = null;

    const pending = pendingName.current;
    const preferredName = pending && pending.email === user.email?.toLowerCase() ? pending.displayName : null;

    ensureUserProfile(user, preferredName)
      .then(() => {
        if (cancelled) return;
        unsubscribe = subscribeUserProfile(
          user.uid,
          (p) => {
            setProfile(p);
            setLoading(false);
          },
          (err) => {
            console.error('[auth] profile listener failed:', err);
            setError(err);
            setLoading(false);
          },
        );
      })
      .catch((err) => {
        console.error('[auth] could not load/create user profile:', err);
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const register = useCallback(async (email, password, displayName) => {
    // Auth state may fire before updateProfile() finishes, so remember the name by email.
    pendingName.current = { email: email.trim().toLowerCase(), displayName };
    return authService.register(email, password, displayName);
  }, []);

  const value = useMemo(() => {
    const isInactive = profile?.isActive === false;
    const role = isInactive ? null : (profile?.role ?? null);
    return {
      user,
      profile,
      isInactive,
      role,
      loading,
      error,
      isAdmin: role === ROLES.SYS_ADMIN,
      // Audit identity stored in createdBy / updatedBy / deletedBy.
      actor: user ? { uid: user.uid, name: profile?.displayName || user.email || 'Unknown' } : null,
      signIn: authService.signIn,
      register,
      resetPassword: authService.resetPassword,
      logOut: authService.logOut,
    };
  }, [user, profile, loading, error, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
