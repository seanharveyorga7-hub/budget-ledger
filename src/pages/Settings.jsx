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
  const { users, loading, error, updateRole } = useUsers();
  const [pending, setPending] = useState(null); // { target, role }
  const [saving, setSaving] = useState(false);

  const confirmChange = async () => {
    setSaving(true);
    try {
      await updateRole(pending.target.uid, pending.role);
      toast.success(`${pending.target.displayName} is now a ${ROLE_LABELS[pending.role]}.`);
      setPending(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const adminCount = users.filter((u) => u.role === ROLES.SYS_ADMIN).length;

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Manage user roles. Only System Admins can see this page." />
      <Alert>{error && friendlyError(error)}</Alert>

      <Card tourId="settings-users" title={`Registered Users (${users.length})`} actions={<span className="muted small">{adminCount} System Admin(s)</span>} flush>
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
        You cannot remove your own admin access. Another System Admin must do it, so there is always at least one admin.
      </p>

      <ConfirmDialog
        open={Boolean(pending)}
        tone="primary"
        title="Change role?"
        message={
          pending && (
            <>
              Change <strong>{pending.target.displayName}</strong> ({pending.target.email}) from {ROLE_LABELS[pending.target.role]} to{' '}
              <strong>{ROLE_LABELS[pending.role]}</strong>?
            </>
          )
        }
        confirmLabel="Change role"
        busy={saving}
        onConfirm={confirmChange}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
