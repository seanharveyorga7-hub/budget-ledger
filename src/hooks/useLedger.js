import { useMemo } from 'react';
import { subscribeLedger } from '../services/ledgerService';
import { useSubscription } from './useSubscription';
import { useAuth } from '../contexts/AuthContext';

export function useLedger() {
  const { user, isAdmin } = useAuth();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeLedger(onData, onError, isAdmin ? null : user.uid),
    [user?.uid, isAdmin],
    { enabled: Boolean(user) },
  );

  return useMemo(
    () => ({ all: data, entries: data.filter((e) => !e.isDeleted), loading, error }),
    [data, loading, error],
  );
}
