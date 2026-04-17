import { useState } from 'react';
import './DataTable.css';
import EmptyState from './EmptyState';

export default function DataTable({
  columns, rows, onRowClick,
  page = 1, pageSize = 20, total = 0, onPageChange,
  loading = false,
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  function toggleSort(key) {
    if (sortCol === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="datatable-wrap">
      <div className="datatable-scroll">
        <table className="datatable">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable' : ''}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && sortCol === col.key && (
                    <span className="sort-arrow">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="loading-row">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState message="No records found." />
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={onRowClick ? 'clickable' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="datatable-pagination">
          <span className="pagination-info">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="pagination-controls">
            <button onClick={() => onPageChange?.(page - 1)} disabled={page <= 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={p === page ? 'active' : ''}
                onClick={() => onPageChange?.(p)}
              >{p}</button>
            ))}
            <button onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
