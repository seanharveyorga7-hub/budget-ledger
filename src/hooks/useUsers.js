import { subscribeUsers } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from './useSubscription';

/** Lists all users. Only subscribes for admins (rules would deny anyone else). */
export function useUsers() {
  const { isAdmin } = useAuth();
  const { data, loading, error } = useSubscription(subscribeUsers, [], { enabled: isAdmin });
  return { users: data, loading, error };
}
