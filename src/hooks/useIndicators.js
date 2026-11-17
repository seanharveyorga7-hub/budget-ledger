import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createIndicator, softDeleteIndicator, subscribeIndicators, updateIndicator } from '../services/indicatorService';
import { realignBudget } from '../services/realignmentService';
import { useSubscription } from './useSubscription';

/** Live list of budget indicators (real-time updates from Firestore). */
export function useIndicators() {
  const { data, loading, error } = useSubscription(subscribeIndicators, []);

  return useMemo(() => {
    const active = data.filter((i) => !i.isDeleted);
    const byCode = Object.fromEntries(data.map((i) => [i.activityCode, i]));
    return { all: data, indicators: active, byCode, loading, error };
  }, [data, loading, error]);
}

/** Indicator writes for the signed-in user. The audit actor is filled in automatically. */
export function useIndicatorActions() {
  const { actor } = useAuth();
  return useMemo(
    () => ({
      create: (input) => createIndicator(input, actor),
      update: (code, input) => updateIndicator(code, input, actor),
      softDelete: (code) => softDeleteIndicator(code, actor),
      realign: (input) => realignBudget(input, actor),
    }),
    [actor],
  );
}
