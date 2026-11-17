/**
 * columns: [{ key, header, render?(row), align?: 'right'|'center', className? }]
 */
export default function DataTable({ columns, rows, rowKey = 'id', emptyMessage = 'No records found.', onRowClick, rowClassName, footer }) {
  const keyOf = (row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey]);
  const cellClass = (c) => [c.align && `ta-${c.align}`, c.className].filter(Boolean).join(' ') || undefined;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cellClass(c)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyOf(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[onRowClick && 'row-clickable', rowClassName?.(row)].filter(Boolean).join(' ') || undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cellClass(c)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && rows.length > 0 && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}

/** Stops row-click propagation for action buttons inside clickable rows. */
export function RowActions({ children }) {
  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
