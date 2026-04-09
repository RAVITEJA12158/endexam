export default function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.min(Math.max(value, 0), 120)
  const color =
    pct >= 100 ? 'var(--danger)' :
    pct >= 80  ? 'var(--warn)'   :
                 'var(--accent)'

  return (
    <div className={`relative h-2 rounded-full overflow-hidden ${className}`} style={{ background: 'var(--bg-elevated)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
      {pct > 20 && (
        <span
          className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold"
          style={{ color: '#fff', mixBlendMode: 'difference' }}
        >
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}