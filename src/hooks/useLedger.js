import { useMemo } from 'react';
import { subscribeLedger } from '../services/ledgerService';
import { useSubscription } from './useSubscription';

export function useLedger() {
  const { data, loading, error } = useSubscription(subscribeLedger, []);

  return useMemo(
    () => ({ all: data, entries: data.filter((e) => !e.isDeleted), loading, error }),
    [data, loading, error],
  );
}
