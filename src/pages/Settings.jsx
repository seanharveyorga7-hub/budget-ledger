import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useUsers } from '../hooks/useUsers';
import { Alert, Badge, Card, PageHeader, Spinner } from '../components/ui';
import DataTable from '../components/DataTable';
import { ConfirmDialog } from '../components/Modal';
import { ROLE_LABELS, ROLES } from '../utils/constants';
import { formatTimestamp } from '../utils/dates';
import { friendlyError } from '../utils/errors';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const { users, loading, error, updateRole, updateStatus } = useUsers();
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const changesStatus = typeof pending?.isActive === 'boolean';
  const statusAction = pending?.isActive ? 'Activate' : 'Deactivate';

  const confirmChange = async () => {
    setSaving(true);
    try {
      if (changesStatus) {
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

  const adminCount = users.filter((u) => u.role === ROLES.SYS_ADMIN && u.isActive !== false).length;

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Manage user roles and account access." />
      <Alert>{error && friendlyError(error)}</Alert>

      <Card tourId="settings-users" title={`Registered Users (${users.length})`} actions={<span className="muted small">{adminCount} active System Admin(s)</span>} flush>
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            rows={users}
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
            ]}
          />
        )}
      </Card>
      <p className="muted small">
        Only another System Admin can change your role or account status.
      </p>

      <ConfirmDialog
        open={Boolean(pending)}
        tone={changesStatus && !pending.isActive ? 'danger' : 'primary'}
        title={changesStatus ? `${statusAction} account?` : 'Change role?'}
        message={
          pending && (changesStatus ? (
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
        confirmLabel={changesStatus ? statusAction : 'Change role'}
        busy={saving}
        onConfirm={confirmChange}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
