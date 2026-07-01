function StatCard({ label, value, sub, color = 'blue', icon, loading = false, onClick }) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    gray:   'bg-gray-50 text-gray-700 border-gray-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    teal:   'bg-teal-50 text-teal-700 border-teal-100',
  }

  const cls = colorMap[color] ?? colorMap.blue

  return (
    <div
      className={`rounded-xl border p-5 ${cls} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70 truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded bg-current opacity-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold truncate">{value ?? '—'}</p>
          )}
          {sub && !loading && (
            <p className="mt-1 text-xs opacity-60 truncate">{sub}</p>
          )}
        </div>
        {icon && (
          <span className="flex-shrink-0 text-2xl opacity-60" aria-hidden="true">{icon}</span>
        )}
      </div>
    </div>
  )
}

export default StatCard
