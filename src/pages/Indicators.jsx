import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useIndicatorActions, useIndicators } from '../hooks/useIndicators';
import { useLedger } from '../hooks/useLedger';
import { useRealignments } from '../hooks/useRealignments';
import { Alert, Badge, Button, Card, PageHeader, Spinner, Tabs } from '../components/ui';
import DataTable, { RowActions } from '../components/DataTable';
import { ConfirmDialog } from '../components/Modal';
import { IfRole } from '../components/RoleGuards';
import IndicatorFormModal from '../components/indicators/IndicatorFormModal';
import IndicatorDetailModal from '../components/indicators/IndicatorDetailModal';
import RealignmentModal from '../components/indicators/RealignmentModal';
import { adjustedBudget, availableBalance, utilizationRate, utilizationTone } from '../utils/balance';
import { formatAmount, formatCentavos, formatPercent } from '../utils/currency';
import { formatTimestamp } from '../utils/dates';
import { OBJECTS_OF_EXPENSES, ROLES } from '../utils/constants';
import { friendlyError } from '../utils/errors';

export default function Indicators() {
  const { isAdmin } = useAuth();
  const indicatorActions = useIndicatorActions();
  const toast = useToast();
  const { indicators, loading, error } = useIndicators();
  const { entries } = useLedger();

  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [objectFilter, setObjectFilter] = useState('');
  const [formState, setFormState] = useState({ open: false, indicator: null });
  const [realignState, setRealignState] = useState({ open: false, source: '' });
  const [detail, setDetail] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return indicators.filter(
      (i) =>
        (!objectFilter || i.objectOfExpenses === objectFilter) &&
        (!term || i.activityCode.toLowerCase().includes(term) || i.activityTitle.toLowerCase().includes(term)),
    );
  }, [indicators, search, objectFilter]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, i) => ({
          annual: t.annual + i.annualBudget,
          realignment: t.realignment + i.realignment,
          adjusted: t.adjusted + adjustedBudget(i),
          obligations: t.obligations + i.totalObligations,
          available: t.available + availableBalance(i),
        }),
        { annual: 0, realignment: 0, adjusted: 0, obligations: 0, available: 0 },
      ),
    [rows],
  );

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await indicatorActions.softDelete(toDelete.activityCode);
      toast.success(`Indicator ${toDelete.activityCode} deleted.`);
      setToDelete(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'activityCode', header: 'Code', render: (i) => <strong>{i.activityCode}</strong> },
    {
      key: 'activityTitle',
      header: 'Activity Title',
      className: 'cell-wrap',
      render: (i) => (
        <>
          {i.activityTitle} {i.isDeleted && <Badge tone="danger">Deleted</Badge>}
        </>
      ),
    },
    { key: 'objectOfExpenses', header: 'Object', render: (i) => <Badge tone="accent">{i.objectOfExpenses}</Badge> },
    { key: 'annualBudget', header: 'Annual Budget', align: 'right', render: (i) => formatAmount(i.annualBudget) },
    {
      key: 'realignment',
      header: 'Realignment',
      align: 'right',
      render: (i) => <span className={i.realignment < 0 ? 'text-danger' : i.realignment > 0 ? 'text-success' : ''}>{formatAmount(i.realignment)}</span>,
    },
    { key: 'obligations', header: 'Obligations', align: 'right', render: (i) => formatAmount(i.totalObligations) },
    { key: 'available', header: 'Available', align: 'right', render: (i) => <strong>{formatAmount(availableBalance(i))}</strong> },
    {
      key: 'utilization',
      header: 'Used',
      align: 'right',
      render: (i) => <Badge tone={utilizationTone(utilizationRate(i))}>{formatPercent(utilizationRate(i))}</Badge>,
    },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) =>
        i.isDeleted ? null : (
          <RowActions>
            <Button size="sm" variant="ghost" onClick={() => setFormState({ open: true, indicator: i })}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRealignState({ open: true, source: i.activityCode })}>
              Realign
            </Button>
            <Button
              size="sm"
              variant="ghost-danger"
              onClick={() => setToDelete(i)}
              disabled={i.totalObligations > 0 || i.realignment !== 0}
              title={
                i.totalObligations > 0
                  ? 'Has active obligations'
                  : i.realignment !== 0
                    ? 'Has realigned funds: realign them back to ₱0.00 first'
                    : 'Soft delete'
              }
            >
              Delete
            </Button>
          </RowActions>
        ),
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Budget Indicators"
        subtitle={isAdmin ? 'Create, edit and realign budget indicators.' : 'Read-only view of approved budget indicators.'}
        actions={
          <IfRole role={ROLES.SYS_ADMIN}>
            <Button variant="secondary" data-tour="indicators-realign" onClick={() => setRealignState({ open: true, source: '' })} disabled={indicators.length < 2}> 
              Realign Budget
            </Button>
            <Button data-tour="indicators-new" onClick={() => setFormState({ open: true, indicator: null })}>+ New Indicator</Button>
          </IfRole>
        }
      />
      <Alert>{error && friendlyError(error)}</Alert>

      <Tabs
        tourId="indicators-tabs"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'list', label: 'Indicators' },
          { value: 'realignments', label: 'Realignment Log' },
        ]}
      />

      {tab === 'list' ? (
        <Card flush tourId="indicators-table">
          <div className="toolbar" data-tour="indicators-toolbar">
            <input className="input" placeholder="Search code or title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input" value={objectFilter} onChange={(e) => setObjectFilter(e.target.value)} aria-label="Object of expenses">
              <option value="">All objects</option>
              {OBJECTS_OF_EXPENSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <Spinner />
          ) : (
            <DataTable
              rows={rows}
              columns={columns}
              onRowClick={setDetail}
              rowClassName={(i) => (i.isDeleted ? 'row-deleted' : '')}
              emptyMessage={isAdmin ? 'No indicators yet. Click “New Indicator” to add one.' : 'No indicators found.'}
              footer={
                <tr>
                  <td colSpan={3}>Total (active)</td>
                  <td className="ta-right">{formatAmount(totals.annual)}</td>
                  <td className="ta-right">{formatAmount(totals.realignment)}</td>
                  <td className="ta-right">{formatAmount(totals.obligations)}</td>
                  <td className="ta-right">{formatAmount(totals.available)}</td>
                  <td colSpan={isAdmin ? 2 : 1} />
                </tr>
              }
            />
          )}
        </Card>
      ) : (
        <RealignmentLog />
      )}

      <IndicatorFormModal open={formState.open} indicator={formState.indicator} onClose={() => setFormState({ open: false, indicator: null })} />
      <RealignmentModal
        open={realignState.open}
        defaultSource={realignState.source}
        indicators={indicators}
        onClose={() => setRealignState({ open: false, source: '' })}
      />
      <IndicatorDetailModal indicator={detail} entries={entries} onClose={() => setDetail(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete indicator?"
        message={
          toDelete && (
            <>
              <strong>{toDelete.activityCode}</strong> — {toDelete.activityTitle} will be marked as deleted. The record is kept for audit and
              cannot be used for new obligations.
            </>
          )
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function RealignmentLog() {
  const { realignments, loading, error } = useRealignments();
  if (loading) return <Spinner />;
  return (
    <Card flush>
      <Alert>{error && friendlyError(error)}</Alert>
      <DataTable
        rows={realignments}
        emptyMessage="No realignments yet."
        columns={[
          { key: 'createdAt', header: 'Date', render: (r) => formatTimestamp(r.createdAt) },
          { key: 'source', header: 'From', render: (r) => <span title={r.sourceTitle}><strong>{r.sourceCode}</strong> <Badge>{r.sourceObject}</Badge></span> },
          { key: 'target', header: 'To', render: (r) => <span title={r.targetTitle}><strong>{r.targetCode}</strong> <Badge>{r.targetObject}</Badge></span> },
          { key: 'amount', header: 'Amount', align: 'right', render: (r) => <strong>{formatCentavos(r.amount)}</strong> },
          { key: 'reason', header: 'Reason', className: 'cell-wrap' },
          { key: 'by', header: 'By', render: (r) => r.createdBy?.name },
        ]}
      />
    </Card>
  );
}
