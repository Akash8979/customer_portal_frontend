import './PageSkeleton.css';

function SkeletonBlock({ width = '100%', height = '16px', radius = '4px' }) {
  return <div className="skeleton-block" style={{ width, height, borderRadius: radius }} />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <SkeletonBlock height="14px" width="60%" />
      <SkeletonBlock height="28px" width="40%" />
      <SkeletonBlock height="12px" width="80%" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-thead">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height="12px" width={`${60 + Math.random() * 30}px`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock key={j} height="13px" width={`${40 + Math.random() * 60}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <SkeletonBlock height="24px" width="200px" />
      <div className="skeleton-kpis">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable />
    </div>
  );
}
