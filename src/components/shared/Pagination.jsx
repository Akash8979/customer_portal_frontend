import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i);
    }
    const result = [];
    if (range[0] > 1) {
      result.push(1);
      if (range[0] > 2) result.push('...');
    }
    result.push(...range);
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) result.push('...');
      result.push(totalPages);
    }
    return result;
  }, [page, totalPages]);

  return (
    <div className="pg-bar">
      <span className="pg-info">
        {total === 0 ? '0 results' : `${from}–${to} of ${total}`}
      </span>

      <div className="pg-controls">
        <button className="pg-btn" disabled={page <= 1} onClick={() => onChange(1)} title="First">
          <ChevronsLeft size={13} />
        </button>
        <button className="pg-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} title="Previous">
          <ChevronLeft size={13} />
        </button>

        {pageNumbers.map((n, i) =>
          n === '...' ? (
            <span key={`d${i}`} className="pg-dots">…</span>
          ) : (
            <button
              key={n}
              className={`pg-btn pg-num ${n === page ? 'pg-num--active' : ''}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          )
        )}

        <button className="pg-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)} title="Next">
          <ChevronRight size={13} />
        </button>
        <button className="pg-btn" disabled={page >= totalPages} onClick={() => onChange(totalPages)} title="Last">
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  );
}
