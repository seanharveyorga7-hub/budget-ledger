import { useMemo } from 'react';
import Modal from '../Modal';
import AuditTrail from '../AuditTrail';
import { Badge } from '../ui';
import { adjustedBudget, availableBalance, utilizationRate } from '../../utils/balance';
import { formatAmount, formatCentavos, formatPercent } from '../../utils/currency';
import { MONTHS, monthIndexFromISO } from '../../utils/monthly';
import { objectLabel } from '../../utils/constants';

export default function IndicatorDetailModal({ indicator, entries, onClose }) {
  const obligatedByMonth = useMemo(() => {
    const totals = Array(12).fill(0);
    if (!indicator) return totals;
    entries
      .filter((e) => e.activityCode === indicator.activityCode)
      .forEach((e) => {
        totals[monthIndexFromISO(e.date)] += e.amount;
      });
    return totals;
  }, [indicator, entries]);

  if (!indicator) return null;

  return (
    <Modal open title={`${indicator.activityCode} · ${indicator.activityTitle}`} onClose={onClose} size="lg">
      <div className="stack">
        <div className="detail-grid">
          <Detail label="Object of Expenses" value={objectLabel(indicator.objectOfExpenses)} />
          <Detail label="Annual Budget" value={formatCentavos(indicator.annualBudget)} />
          <Detail label="Realignment" value={formatCentavos(indicator.realignment)} />
          <Detail label="Adjusted Budget" value={formatCentavos(adjustedBudget(indicator))} />
          <Detail label="Total Obligations" value={formatCentavos(indicator.totalObligations)} />
          <Detail label="Available Balance" value={<strong>{formatCentavos(availableBalance(indicator))}</strong>} />
          <Detail label="Utilization" value={formatPercent(utilizationRate(indicator))} />
          <Detail label="Status" value={indicator.isDeleted ? <Badge tone="danger">Deleted</Badge> : <Badge tone="success">Active</Badge>} />
        </div>

        <div className="table-wrap">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Month</th>
                <th className="ta-right">Allocation</th>
                <th className="ta-right">Obligated</th>
                <th className="ta-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((m, i) => {
                const variance = indicator.monthlyAllocation[i] - obligatedByMonth[i];
                return (
                  <tr key={m}>
                    <td>{m}</td>
                    <td className="ta-right">{formatAmount(indicator.monthlyAllocation[i])}</td>
                    <td className="ta-right">{formatAmount(obligatedByMonth[i])}</td>
                    <td className={`ta-right ${variance < 0 ? 'text-danger' : ''}`}>{formatAmount(variance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">Obligated amounts count active ledger entries by transaction month (all years).</p>

        <AuditTrail record={indicator} />
      </div>
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}
