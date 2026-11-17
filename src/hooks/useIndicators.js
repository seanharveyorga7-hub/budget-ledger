import { useMemo } from 'react';
import { subscribeIndicators } from '../services/indicatorService';
import { useSubscription } from './useSubscription';

export function useIndicators() {
  const { data, loading, error } = useSubscription(subscribeIndicators, []);

  return useMemo(() => {
    const active = data.filter((i) => !i.isDeleted);
    const byCode = Object.fromEntries(data.map((i) => [i.activityCode, i]));
    return { all: data, indicators: active, byCode, loading, error };
  }, [data, loading, error]);
}
