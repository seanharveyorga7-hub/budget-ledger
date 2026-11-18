import { useMemo, useState } from 'react';
import { useIndicators } from '../hooks/useIndicators';
import { useLedger } from '../hooks/useLedger';
import { Alert, Badge, Card, PageHeader, Spinner, Tabs } from '../components/ui';
import DataTable from '../components/DataTable';
import IndicatorDetailModal from '../components/indicators/IndicatorDetailModal';
import LedgerDetailModal from '../components/ledger/LedgerDetailModal';
import { formatAmount } from '../utils/currency';
import { formatISODate, formatTimestamp } from '../utils/dates';
import { friendlyError } from '../utils/errors';

const byDeletedAtDesc = (a, b) => (b.deletedAt?.toMillis?.() ?? 0) - (a.deletedAt?.toMillis?.() ?? 0);

/** Admin-only archive of soft-deleted indicators and obligations. Read-only: records are kept for audit. */
export default function DeletedRecords() {
  const { all: allIndicators, loading: li, error: ei } = useIndicators();
  const { all: allEntries, entries, loading: ll, error: el } = useLedger();

  const [tab, setTab] = useState('indicators');
  const [search, setSearch] = useState('');
  const [indicatorDetail, setIndicatorDetail] = useState(null);
  const [entryDetail, setEntryDetail] = useState(null);

  const term = search.trim().toLowerCase();
  const matches = (...fields) => !term || fields.some((f) => (f || '').toLowerCase().includes(term));

  const deletedIndicators = useMemo(() => allIndicators.filter((i) => i.isDeleted).sort(byDeletedAtDesc), [allIndicators]);
  const deletedEntries = useMemo(() => allEntries.filter((e) => e.isDeleted).sort(byDeletedAtDesc), [allEntries]);

  const indicatorRows = deletedIndicators.filter((i) => matches(i.activityCode, i.activityTitle));
  const entryRows = deletedEntries.filter((e) => matches(e.activityCode, e.activityTitle, e.particulars));

  const deletedCols = [
    { key: 'deletedAt', header: 'Deleted on', render: (r) => formatTimestamp(r.deletedAt) },
    { key: 'deletedBy', header: 'Deleted by', render: (r) => r.deletedBy?.name },
  ];

  return (
    <div className="page">
      <PageHeader title="Deleted Records" subtitle="Soft-deleted indicators and obligations, kept for audit. Click a row for its full history." />
      <Alert>{(ei || el) && friendlyError(ei || el)}</Alert>

      <Tabs
        tourId="deleted-tabs"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'indicators', label: `Indicators (${deletedIndicators.length})` },
          { value: 'ledger', label: `Obligations (${deletedEntries.length})` },
        ]}
      />

      <Card flush tourId="deleted-table">
        <div className="toolbar">
          <input
            className="input"
            placeholder={tab === 'indicators' ? 'Search code or title…' : 'Search code, title or particulars…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {tab === 'indicators' ? (
          li ? (
            <Spinner />
          ) : (
            <DataTable
              rows={indicatorRows}
              onRowClick={setIndicatorDetail}
              emptyMessage="No deleted indicators."
              columns={[
                { key: 'activityCode', header: 'Code', render: (i) => <strong>{i.activityCode}</strong> },
                { key: 'activityTitle', header: 'Activity Title', className: 'cell-wrap' },
                { key: 'objectOfExpenses', header: 'Object', render: (i) => <Badge tone="accent">{i.objectOfExpenses}</Badge> },
                { key: 'annualBudget', header: 'Annual Budget', align: 'right', render: (i) => formatAmount(i.annualBudget) },
                ...deletedCols,
              ]}
            />
          )
        ) : ll ? (
          <Spinner />
        ) : (
          <DataTable
            rows={entryRows}
            onRowClick={setEntryDetail}
            emptyMessage="No deleted obligations."
            columns={[
              { key: 'date', header: 'Date', render: (e) => formatISODate(e.date) },
              { key: 'activityCode', header: 'Code', render: (e) => <strong>{e.activityCode}</strong> },
              { key: 'particulars', header: 'Particulars', className: 'cell-truncate' },
              { key: 'amount', header: 'Amount', align: 'right', render: (e) => <strong>{formatAmount(e.amount)}</strong> },
              { key: 'by', header: 'Encoded by', render: (e) => e.createdBy?.name },
              ...deletedCols,
            ]}
          />
        )}
      </Card>

      <IndicatorDetailModal indicator={indicatorDetail} entries={entries} onClose={() => setIndicatorDetail(null)} />
      <LedgerDetailModal entry={entryDetail} onClose={() => setEntryDetail(null)} />
    </div>
  );
}
