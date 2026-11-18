import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useUsers } from '../hooks/useUsers';
import { Alert, Badge, Button, Card, PageHeader, Spinner } from '../components/ui';
import DataTable from '../components/DataTable';
import { ConfirmDialog } from '../components/Modal';
import { ROLE_LABELS, ROLES } from '../utils/constants';
import { formatTimestamp } from '../utils/dates';
import { friendlyError } from '../utils/errors';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const { users, loading, error, updateRole, updateStatus, deleteUser } = useUsers();
  const registeredUsers = users.filter((u) => !u.isDeleted);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const changesStatus = typeof pending?.isActive === 'boolean';
  const deleting = pending?.delete === true;
  const statusAction = pending?.isActive ? 'Activate' : 'Deactivate';

  const confirmChange = async () => {
    setSaving(true);
    try {
      if (deleting) {
        await deleteUser(pending.target.uid);
        toast.success(`${pending.target.displayName} was moved to Deleted Records.`);
      } else if (changesStatus) {
        await updateStatus(pending.target.uid, pending.isActive);
        toast.success(`${pending.target.displayName} is now ${pending.isActive ? 'active' : 'inactive'}.`);
      } else {
        await updateRole(pending.target.uid, pending.role);
        toast.success(`${pending.target.displayName} is now a ${ROLE_LABELS[pending.role]}.`);
      }
      setPending(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const adminCount = registeredUsers.filter((u) => u.role === ROLES.SYS_ADMIN && u.isActive !== false).length;

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Manage user roles and account access." />
      <Alert>{error && friendlyError(error)}</Alert>

      <Card tourId="settings-users" title={`Registered Users (${registeredUsers.length})`} actions={<span className="muted small">{adminCount} active System Admin(s)</span>} flush>
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            rows={registeredUsers}
            rowKey="uid"
            columns={[
              {
                key: 'displayName',
                header: 'Name',
                render: (u) => (
                  <>
                    <strong>{u.displayName}</strong> {u.uid === user.uid && <Badge tone="accent">You</Badge>}
                  </>
                ),
              },
              { key: 'email', header: 'Email' },
              {
                key: 'isActive',
                header: 'Status',
                render: (u) => {
                  const isActive = u.isActive !== false;
                  const isSelf = u.uid === user.uid;
                  return (
                    <button
                      type="button"
                      className="status-switch"
                      role="switch"
                      aria-checked={isActive}
                      aria-label={`Account active for ${u.displayName}`}
                      disabled={isSelf}
                      title={isSelf ? 'Another System Admin can change your account status.' : undefined}
                      onClick={() => setPending({ target: u, isActive: !isActive })}
                    >
                      <span className="status-switch-track" aria-hidden="true" />
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                  );
                },
              },
              { key: 'createdAt', header: 'Registered', render: (u) => formatTimestamp(u.createdAt) },
              {
                key: 'roleUpdatedBy',
                header: 'Role last changed',
                render: (u) => (u.roleUpdatedBy ? `${u.roleUpdatedBy.name} · ${formatTimestamp(u.roleUpdatedAt)}` : '—'),
              },
              {
                key: 'role',
                header: 'Role',
                render: (u) => {
                  const isSelf = u.uid === user.uid;
                  return (
                    <select
                      className="input input-sm"
                      value={u.role}
                      disabled={isSelf}
                      title={isSelf ? 'You cannot change your own role.' : undefined}
                      onChange={(e) => setPending({ target: u, role: e.target.value })}
                      aria-label={`Role for ${u.displayName}`}
                    >
                      <option value={ROLES.SYS_ADMIN}>{ROLE_LABELS[ROLES.SYS_ADMIN]}</option>
                      <option value={ROLES.USER}>{ROLE_LABELS[ROLES.USER]}</option>
                    </select>
                  );
                },
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (u) => u.uid !== user.uid && (
                  <Button size="sm" variant="ghost-danger" onClick={() => setPending({ target: u, delete: true })}>
                    Delete
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>
      <p className="muted small">
        Only another System Admin can change your role or account status.
      </p>

      <ConfirmDialog
        open={Boolean(pending)}
        tone={deleting || (changesStatus && !pending.isActive) ? 'danger' : 'primary'}
        title={deleting ? 'Delete user?' : changesStatus ? `${statusAction} account?` : 'Change role?'}
        message={
          pending && (deleting ? (
            <>
              Remove app access for <strong>{pending.target.displayName}</strong> ({pending.target.email}) and move their profile to Deleted Records?
            </>
          ) : changesStatus ? (
            <>
              {statusAction} app access for <strong>{pending.target.displayName}</strong> ({pending.target.email})?
            </>
          ) : (
            <>
              Change <strong>{pending.target.displayName}</strong> ({pending.target.email}) from {ROLE_LABELS[pending.target.role]} to{' '}
              <strong>{ROLE_LABELS[pending.role]}</strong>?
            </>
          ))
        }
        confirmLabel={deleting ? 'Delete user' : changesStatus ? statusAction : 'Change role'}
        busy={saving}
        onConfirm={confirmChange}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
