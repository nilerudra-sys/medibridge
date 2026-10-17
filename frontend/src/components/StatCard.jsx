export default function StatCard({ title, value, icon, color = 'teal', subtitle }) {
  const colorMap = {
    teal:   'bg-teal-50 border-teal-200 text-teal-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    green:  'bg-green-50 border-green-200 text-green-700',
  }

  const valueColor = {
    teal:   'text-teal-800',
    blue:   'text-blue-800',
    yellow: 'text-yellow-800',
    red:    'text-red-800',
    green:  'text-green-800',
  }

  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${valueColor[color]}`}>
            {value ?? '—'}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl opacity-70">{icon}</span>
      </div>
    </div>
  )
}
