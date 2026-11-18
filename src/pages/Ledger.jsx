import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useIndicators } from '../hooks/useIndicators';
import { useLedger, useLedgerActions } from '../hooks/useLedger';
import { Alert, Badge, Button, Card, PageHeader, Spinner } from '../components/ui';
import DataTable, { RowActions } from '../components/DataTable';
import { ConfirmDialog } from '../components/Modal';
import LedgerFormModal from '../components/ledger/LedgerFormModal';
import LedgerDetailModal from '../components/ledger/LedgerDetailModal';
import { formatAmount, formatCentavos } from '../utils/currency';
import { formatISODate } from '../utils/dates';
import { yearFromISO } from '../utils/monthly';
import { friendlyError } from '../utils/errors';
import { objectLabel } from '../utils/constants';

export default function Ledger() {
  const { isAdmin, user } = useAuth();
  const ledgerActions = useLedgerActions();
  const toast = useToast();
  const { indicators, loading: li, error: ei } = useIndicators();
  const { entries, loading: ll, error: el } = useLedger();

  const [search, setSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const hasFilters = Boolean(search || codeFilter || yearFilter || mineOnly);
  const [formState, setFormState] = useState({ open: false, entry: null });
  const [detail, setDetail] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const years = useMemo(() => [...new Set(entries.map((e) => yearFromISO(e.date)).filter((year) => year > 0))].sort((a, b) => b - a), [entries]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!codeFilter || e.activityCode === codeFilter) &&
        (!yearFilter || yearFromISO(e.date) === Number(yearFilter)) &&
        (!mineOnly || e.createdBy?.uid === user.uid) &&
        (!term ||
          e.activityCode.toLowerCase().includes(term) ||
          e.activityTitle.toLowerCase().includes(term) ||
          (e.particulars || '').toLowerCase().includes(term)),
    );
  }, [entries, search, codeFilter, mineOnly, yearFilter, user.uid]);

  const total = rows.filter((e) => !e.isDeleted).reduce((s, e) => s + e.amount, 0);
  const canEdit = (e) => !e.isDeleted && (isAdmin || e.createdBy?.uid === user.uid);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { availableAfter } = await ledgerActions.softDelete(toDelete);
      toast.success(`Entry deleted. ${formatCentavos(toDelete.amount)} returned to ${toDelete.activityCode} (available balance now ${formatCentavos(availableAfter)}).`);
      setToDelete(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Obligation Ledger"
        subtitle="Every obligation is checked against the indicator's available balance before it is saved."
        actions={
          <Button data-tour="ledger-new" onClick={() => setFormState({ open: true, entry: null })} disabled={indicators.length === 0}>
            + New Obligation
          </Button>
        }
      />
      <Alert>{(ei || el) && friendlyError(ei || el)}</Alert>
      {!li && indicators.length === 0 && <Alert tone="info">No active Budget Indicators yet. A System Admin must create one first.</Alert>}

      <Card flush tourId="ledger-table">
        <div className="toolbar" data-tour="ledger-toolbar">
          <input type="search" className="input" aria-label="Search obligations" placeholder="Search code, title or particulars…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} aria-label="Indicator">
            <option value="">All indicators</option>
            {indicators.map((i) => (
              <option key={i.activityCode} value={i.activityCode}>
                {i.activityCode}
              </option>
            ))}
          </select>
          <select className="input" aria-label="Obligation year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">All obligation years</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          {isAdmin && <label className="checkbox">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> My entries
          </label>}
          {hasFilters && <Button variant="ghost" onClick={() => { setSearch(''); setCodeFilter(''); setYearFilter(''); setMineOnly(false); }}>Clear filters</Button>}
        </div>

        {ll ? (
          <Spinner />
        ) : (
          <DataTable
            rows={rows}
            onRowClick={setDetail}
            rowClassName={(e) => (e.isDeleted ? 'row-deleted' : '')}
            emptyMessage={hasFilters ? 'No obligations match your filters.' : 'No obligations found.'}
            columns={[
              { key: 'date', header: 'Date', render: (e) => formatISODate(e.date) },
              { key: 'activityCode', header: 'Code', render: (e) => <strong>{e.activityCode}</strong> },
              {
                key: 'activityTitle',
                header: 'Activity Title',
                className: 'cell-wrap',
                render: (e) => (
                  <>
                    {e.activityTitle} {e.isDeleted && <Badge tone="danger">Deleted</Badge>}
                  </>
                ),
              },
              { key: 'objectOfExpenditure', header: 'Object', className: 'cell-wrap', render: (e) => objectLabel(e.objectOfExpenditure) },
              { key: 'particulars', header: 'Particulars', className: 'cell-truncate' },
              { key: 'amount', header: 'Amount', align: 'right', render: (e) => <strong>{formatAmount(e.amount)}</strong> },
              { key: 'by', header: 'Encoded by', render: (e) => e.createdBy?.name },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (e) => (
                  <RowActions>
                    {canEdit(e) && (
                      <Button size="sm" variant="ghost" onClick={() => setFormState({ open: true, entry: e })}>
                        Edit
                      </Button>
                    )}
                    {isAdmin && !e.isDeleted && (
                      <Button size="sm" variant="ghost-danger" onClick={() => setToDelete(e)}>
                        Delete
                      </Button>
                    )}
                  </RowActions>
                ),
              },
            ]}
            footer={
              <tr>
                <td colSpan={5}>Total ({rows.filter((e) => !e.isDeleted).length} active entries)</td>
                <td className="ta-right">{formatAmount(total)}</td>
                <td colSpan={2} />
              </tr>
            }
          />
        )}
      </Card>

      <LedgerFormModal open={formState.open} entry={formState.entry} indicators={indicators} onClose={() => setFormState({ open: false, entry: null })} />
      <LedgerDetailModal entry={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete obligation?"
        message={
          toDelete && (
            <>
              The {formatCentavos(toDelete.amount)} obligation under <strong>{toDelete.activityCode}</strong> will be marked as deleted and the
              amount returned to the indicator's available balance. The record is kept for audit.
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
