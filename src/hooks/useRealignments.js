import { subscribeRealignments } from '../services/realignmentService';
import { useSubscription } from './useSubscription';

export function useRealignments() {
  const { data, loading, error } = useSubscription(subscribeRealignments, []);
  return { realignments: data, loading, error };
}
