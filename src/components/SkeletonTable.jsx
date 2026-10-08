export default function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="h-3 bg-slate-200 rounded flex-1" style={{ maxWidth: i === 0 ? '40px' : i === 1 ? '160px' : '100px' }}></div>
        ))}
      </div>
      {/* Row skeletons */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 px-4 py-4 border-b border-slate-100">
          {[...Array(cols)].map((_, colIdx) => (
            <div key={colIdx} className="h-3 bg-slate-100 rounded flex-1" 
              style={{ 
                maxWidth: colIdx === 0 ? '40px' : colIdx === 1 ? '160px' : '100px',
                opacity: 1 - (rowIdx * 0.1)
              }}>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
