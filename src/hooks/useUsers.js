import { useMemo } from 'react';
import { softDeleteUser, subscribeUsers, updateUserRole, updateUserStatus } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from './useSubscription';

/** Lists all users. Only subscribes for admins (rules would deny anyone else). */
export function useUsers() {
  const { isAdmin, actor } = useAuth();
  const { data, loading, error } = useSubscription(subscribeUsers, [], { enabled: isAdmin });
  const updateRole = useMemo(() => (uid, role) => updateUserRole(uid, role, actor), [actor]);
  const updateStatus = useMemo(() => (uid, isActive) => updateUserStatus(uid, isActive, actor), [actor]);
  const deleteUser = useMemo(() => (uid) => softDeleteUser(uid, actor), [actor]);
  return { users: data, loading, error, updateRole, updateStatus, deleteUser };
}
