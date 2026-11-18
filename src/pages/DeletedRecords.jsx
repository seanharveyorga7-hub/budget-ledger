import { useMemo, useState } from 'react';
import { useIndicators } from '../hooks/useIndicators';
import { useLedger } from '../hooks/useLedger';
import { useUsers } from '../hooks/useUsers';
import { Alert, Badge, Button, Card, PageHeader, Spinner, Tabs } from '../components/ui';
import DataTable from '../components/DataTable';
import IndicatorDetailModal from '../components/indicators/IndicatorDetailModal';
import LedgerDetailModal from '../components/ledger/LedgerDetailModal';
import { formatAmount } from '../utils/currency';
import { formatISODate, formatTimestamp } from '../utils/dates';
import { ROLE_LABELS } from '../utils/constants';
import { friendlyError } from '../utils/errors';
import { objectLabel } from '../utils/constants';

const byDeletedAtDesc = (a, b) => (b.deletedAt?.toMillis?.() ?? 0) - (a.deletedAt?.toMillis?.() ?? 0);
const deletionYear = (record) => record.deletedAt?.toDate?.()?.getFullYear();

/** Admin-only archive of soft-deleted records. */
export default function DeletedRecords() {
  const { all: allIndicators, loading: li, error: ei } = useIndicators();
  const { all: allEntries, entries, loading: ll, error: el } = useLedger();
  const { users, loading: lu, error: eu } = useUsers();

  const [tab, setTab] = useState('indicators');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [indicatorDetail, setIndicatorDetail] = useState(null);
  const [entryDetail, setEntryDetail] = useState(null);

  const term = search.trim().toLowerCase();
  const matches = (record, ...fields) =>
    (!yearFilter || deletionYear(record) === Number(yearFilter)) &&
    (!term || fields.some((f) => (f || '').toLowerCase().includes(term)));

  const deletedIndicators = useMemo(() => allIndicators.filter((i) => i.isDeleted).sort(byDeletedAtDesc), [allIndicators]);
  const deletedEntries = useMemo(() => allEntries.filter((e) => e.isDeleted).sort(byDeletedAtDesc), [allEntries]);
  const deletedUsers = useMemo(() => users.filter((u) => u.isDeleted).sort(byDeletedAtDesc), [users]);

  const indicatorRows = deletedIndicators.filter((i) => matches(i, i.activityCode, i.activityTitle));
  const entryRows = deletedEntries.filter((e) => matches(e, e.activityCode, e.activityTitle, e.particulars));
  const userRows = deletedUsers.filter((u) => matches(u, u.displayName, u.email));
  const records = { indicators: deletedIndicators, ledger: deletedEntries, users: deletedUsers }[tab];
  const years = [...new Set(records.map(deletionYear).filter(Boolean))].sort((a, b) => b - a);
  const hasFilters = Boolean(search || yearFilter);
  const clearFilters = () => {
    setSearch('');
    setYearFilter('');
  };
  const error = { indicators: ei, ledger: el, users: eu }[tab];
  const searchPlaceholder = {
    indicators: 'Search code or title',
    ledger: 'Search code, title or particulars',
    users: 'Search name or email',
  }[tab];

  const deletedCols = [
    { key: 'deletedAt', header: 'Deleted on', render: (r) => formatTimestamp(r.deletedAt) },
    { key: 'deletedBy', header: 'Deleted by', render: (r) => r.deletedBy?.name },
  ];

  return (
    <div className="page">
      <PageHeader title="Deleted Records" subtitle="Deleted indicators, obligations and users kept for audit." />
      <Alert>{error && friendlyError(error)}</Alert>

      <Tabs
        tourId="deleted-tabs"
        value={tab}
        onChange={(nextTab) => {
          if (nextTab === tab) return;
          setTab(nextTab);
          clearFilters();
        }}
        tabs={[
          { value: 'indicators', label: `Indicators (${deletedIndicators.length})` },
          { value: 'ledger', label: `Obligations (${deletedEntries.length})` },
          { value: 'users', label: `Users (${deletedUsers.length})` },
        ]}
      />

      <Card flush tourId="deleted-table">
        <div className="toolbar">
          <input
            type="search"
            className="input"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" aria-label="Deletion year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">All deletion years</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}
        </div>

        {tab === 'indicators' ? (
          li ? (
            <Spinner />
          ) : (
            <DataTable
              rows={indicatorRows}
              onRowClick={setIndicatorDetail}
              emptyMessage={hasFilters ? 'No deleted indicators match your filters.' : 'No deleted indicators.'}
              columns={[
                { key: 'activityCode', header: 'Code', render: (i) => <strong>{i.activityCode}</strong> },
                { key: 'activityTitle', header: 'Activity Title', className: 'cell-wrap' },
                { key: 'objectOfExpenses', header: 'Object', className: 'cell-wrap', render: (i) => objectLabel(i.objectOfExpenses) },
                { key: 'annualBudget', header: 'Annual Budget', align: 'right', render: (i) => formatAmount(i.annualBudget) },
                ...deletedCols,
              ]}
            />
          )
        ) : tab === 'users' ? (
          lu ? (
            <Spinner />
          ) : (
            <DataTable
              rows={userRows}
              rowKey="uid"
              emptyMessage={hasFilters ? 'No deleted users match your filters.' : 'No deleted users found.'}
              columns={[
                { key: 'displayName', header: 'Name' },
                { key: 'email', header: 'Email' },
                { key: 'role', header: 'Role', render: (u) => ROLE_LABELS[u.role] ?? u.role },
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
            emptyMessage={hasFilters ? 'No deleted obligations match your filters.' : 'No deleted obligations.'}
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
