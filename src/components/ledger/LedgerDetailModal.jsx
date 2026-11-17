import Modal from '../Modal';
import AuditTrail from '../AuditTrail';
import { Badge } from '../ui';
import { formatCentavos } from '../../utils/currency';
import { formatISODate } from '../../utils/dates';

export default function LedgerDetailModal({ entry, onClose }) {
  if (!entry) return null;
  return (
    <Modal open title="Obligation Details" onClose={onClose}>
      <div className="stack">
        <div className="detail-grid">
          <Item label="Activity Code" value={entry.activityCode} />
          <Item label="Object of Expenditure" value={<Badge tone="accent">{entry.objectOfExpenditure}</Badge>} />
          <Item label="Activity Title" value={entry.activityTitle} wide />
          <Item label="Amount" value={<strong>{formatCentavos(entry.amount)}</strong>} />
          <Item label="Transaction Date" value={formatISODate(entry.date)} />
          <Item label="Particulars" value={entry.particulars || '—'} wide />
          <Item label="Status" value={entry.isDeleted ? <Badge tone="danger">Deleted</Badge> : <Badge tone="success">Active</Badge>} />
        </div>
        <AuditTrail record={entry} />
      </div>
    </Modal>
  );
}

function Item({ label, value, wide }) {
  return (
    <div className={`detail ${wide ? 'detail-wide' : ''}`}>
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}
