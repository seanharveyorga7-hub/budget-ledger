import { formatTimestamp } from '../utils/dates';

/** Shows createdBy / updatedBy / deletedBy for any audited document. */
export default function AuditTrail({ record }) {
  const rows = [
    ['Created', record.createdBy, record.createdAt],
    ['Last updated', record.updatedBy, record.updatedAt],
    record.isDeleted && ['Deleted', record.deletedBy, record.deletedAt],
  ].filter(Boolean);

  return (
    <dl className="audit">
      {rows.map(([label, who, when]) => (
        <div key={label} className="audit-row">
          <dt>{label}</dt>
          <dd>{who ? `${who.name} · ${formatTimestamp(when)}` : '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
