import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIndicators } from '../hooks/useIndicators';
import { useLedger } from '../hooks/useLedger';
import { Alert, Badge, Card, PageHeader, Spinner, StatCard } from '../components/ui';
import DataTable from '../components/DataTable';
import { adjustedBudget, availableBalance, utilizationRate, utilizationTone } from '../utils/balance';
import { formatAmount, formatCentavos, formatPercent } from '../utils/currency';
import { MONTHS, monthIndexFromISO, yearFromISO } from '../utils/monthly';
import { formatISODate } from '../utils/dates';
import { LEGACY_OBJECTS, OBJECT_CODES, objectLabel } from '../utils/constants';
import { friendlyError } from '../utils/errors';

export default function Dashboard() {
  const { all, indicators, loading: li, error: ei } = useIndicators();
  // Deleted indicators whose realignment isn't zero: where the "missing" realigned money sits.
  const strandedIn = useMemo(() => all.filter((i) => i.isDeleted && i.realignment !== 0), [all]);
  const { entries, loading: ll, error: el } = useLedger();

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => yearFromISO(e.date)));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [entries]);
  const [year, setYear] = useState(new Date().getFullYear());

  const totals = useMemo(() => {
    const annual = indicators.reduce((s, i) => s + i.annualBudget, 0);
    const adjusted = indicators.reduce((s, i) => s + adjustedBudget(i), 0);
    const obligations = indicators.reduce((s, i) => s + i.totalObligations, 0);
    return { annual, adjusted, obligations, available: adjusted - obligations, utilization: adjusted ? obligations / adjusted : 0 };
  }, [indicators]);

  const byObject = useMemo(
    () =>
      // New list first, then any old codes (PS/MOOE/CO/FE) still on existing indicators.
      [...OBJECT_CODES, ...Object.keys(LEGACY_OBJECTS)].map((value) => {
        const list = indicators.filter((i) => i.objectOfExpenses === value);
        const adjusted = list.reduce((s, i) => s + adjustedBudget(i), 0);
        const obligations = list.reduce((s, i) => s + i.totalObligations, 0);
        return { id: value, label: objectLabel(value), count: list.length, adjusted, obligations, available: adjusted - obligations, utilization: adjusted ? obligations / adjusted : 0 };
      }).filter((r) => r.count > 0),
    [indicators],
  );

  const monthly = useMemo(() => {
    const alloc = Array(12).fill(0);
    const obligated = Array(12).fill(0);
    indicators.forEach((i) => i.monthlyAllocation.forEach((m, idx) => (alloc[idx] += m)));
    entries.filter((e) => yearFromISO(e.date) === year).forEach((e) => (obligated[monthIndexFromISO(e.date)] += e.amount));
    return MONTHS.map((m, idx) => ({ id: m, month: m, allocation: alloc[idx], obligated: obligated[idx], variance: alloc[idx] - obligated[idx] }));
  }, [indicators, entries, year]);

  const atRisk = useMemo(
    () => indicators.filter((i) => utilizationRate(i) >= 0.8).sort((a, b) => utilizationRate(b) - utilizationRate(a)).slice(0, 8),
    [indicators],
  );

  if (li || ll) return <Spinner label="Loading dashboard…" />;

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="Budget position across all active indicators." />
      <Alert>{(ei || el) && friendlyError(ei || el)}</Alert>

      <div className="stat-grid" data-tour="dashboard-stats">
        <StatCard label="Annual Budget" value={formatCentavos(totals.annual)} hint={`${indicators.length} active indicators`} />
        <StatCard label="Adjusted Budget" value={formatCentavos(totals.adjusted)} hint="Annual budget + realignments" />
        <StatCard label="Total Obligations" value={formatCentavos(totals.obligations)} hint={`${entries.length} active entries`} />
        <StatCard label="Available Balance" value={formatCentavos(totals.available)} hint={`${formatPercent(totals.utilization)} utilized`} tone="accent" />
      </div>

      {/* Realignments always net to zero across ALL indicators; a non-zero net here means
          some transfers involved indicators that were deleted afterwards. */}
      {totals.adjusted !== totals.annual && (
        <Alert tone="info">
          {totals.adjusted > totals.annual
            ? `${formatCentavos(totals.adjusted - totals.annual)} of the realignments on active indicators came from indicators that were later deleted, so the Adjusted Budget is higher than the Annual Budget.`
            : `${formatCentavos(totals.annual - totals.adjusted)} was realigned from active indicators to indicators that were later deleted, so the Adjusted Budget is lower than the Annual Budget.`}{' '}
          {strandedIn.length > 0 && (
            <>
              Deleted indicators still holding realigned funds:{' '}
              {strandedIn.map((i, n) => (
                <span key={i.activityCode}>
                  {n > 0 && ', '}
                  <strong>{i.activityCode}</strong> ({formatCentavos(i.realignment)})
                </span>
              ))}
              .{' '}
            </>
          )}
          Each transfer is listed under <Link to="/indicators" className="link">Budget Indicators → Realignment Log</Link>.
        </Alert>
      )}

      <div className="grid-2 grid-gap-lg">
        <Card title="By Object of Expenses" flush tourId="dashboard-object">
          <DataTable
            rows={byObject}
            emptyMessage="No indicators yet."
            columns={[
              { key: 'id', header: 'Object', className: 'cell-wrap', render: (r) => r.label },
              { key: 'adjusted', header: 'Adjusted', align: 'right', render: (r) => formatAmount(r.adjusted) },
              { key: 'obligations', header: 'Obligated', align: 'right', render: (r) => formatAmount(r.obligations) },
              { key: 'available', header: 'Available', align: 'right', render: (r) => formatAmount(r.available) },
              { key: 'utilization', header: 'Used', align: 'right', render: (r) => <Badge tone={utilizationTone(r.utilization)}>{formatPercent(r.utilization)}</Badge> },
            ]}
          />
        </Card>

        <Card title="Indicators at or above 80% utilization" flush tourId="dashboard-risk" actions={<Link to="/indicators" className="link">View all</Link>}>
          <DataTable
            rows={atRisk}
            emptyMessage="No indicator is above 80% utilization."
            columns={[
              { key: 'activityCode', header: 'Code' },
              { key: 'activityTitle', header: 'Title', className: 'cell-truncate' },
              { key: 'available', header: 'Available', align: 'right', render: (i) => formatAmount(availableBalance(i)) },
              { key: 'u', header: 'Used', align: 'right', render: (i) => <Badge tone={utilizationTone(utilizationRate(i))}>{formatPercent(utilizationRate(i))}</Badge> },
            ]}
          />
        </Card>
      </div>

      <Card
        title="Monthly Allocation vs. Obligations"
        tourId="dashboard-monthly"
        flush
        actions={
          <select className="input input-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      >
        <DataTable
          rows={monthly}
          columns={[
            { key: 'month', header: 'Month' },
            { key: 'allocation', header: 'Allocation', align: 'right', render: (r) => formatAmount(r.allocation) },
            { key: 'obligated', header: `Obligated (${year})`, align: 'right', render: (r) => formatAmount(r.obligated) },
            { key: 'variance', header: 'Variance', align: 'right', render: (r) => <span className={r.variance < 0 ? 'text-danger' : ''}>{formatAmount(r.variance)}</span> },
          ]}
          footer={
            <tr>
              <td>Total</td>
              <td className="ta-right">{formatAmount(monthly.reduce((s, r) => s + r.allocation, 0))}</td>
              <td className="ta-right">{formatAmount(monthly.reduce((s, r) => s + r.obligated, 0))}</td>
              <td className="ta-right">{formatAmount(monthly.reduce((s, r) => s + r.variance, 0))}</td>
            </tr>
          }
        />
      </Card>

      <Card title="Recent Obligations" flush actions={<Link to="/ledger" className="link">Open ledger</Link>}>
        <DataTable
          rows={entries.slice(0, 6)}
          emptyMessage="No obligations recorded yet."
          columns={[
            { key: 'date', header: 'Date', render: (e) => formatISODate(e.date) },
            { key: 'activityCode', header: 'Code' },
            { key: 'activityTitle', header: 'Title', className: 'cell-truncate' },
            { key: 'amount', header: 'Amount', align: 'right', render: (e) => formatAmount(e.amount) },
            { key: 'by', header: 'Encoded by', render: (e) => e.createdBy?.name },
          ]}
        />
      </Card>
    </div>
  );
}
