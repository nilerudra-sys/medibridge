import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/patients', label: 'Patients', icon: '👤' },
  { to: '/fhir', label: 'FHIR Explorer', icon: '🔬' },
  { to: '/sync', label: 'Sync Monitor', icon: '🔄' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen shadow-sm flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏥</span>
          <div>
            <h1 className="text-lg font-bold text-teal-700 leading-tight">MediBridge</h1>
            <p className="text-xs text-gray-400">SQL → FHIR R4</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-teal-50 text-teal-700 border border-teal-100'
                 : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
               }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          Validation:{' '}
          <span className="font-medium text-gray-500">fhir.resources R4</span>
          <br />
          <span className="italic">Not HAPI FHIR Validator</span>
        </p>
      </div>
    </aside>
  )
}
