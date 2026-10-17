import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { getDashboardStats, getPatients, getSyncEvents } from '../api/client'

const STATUS_BADGE = {
  done:       'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [patients, setPatients] = useState([])
  const [syncEvents, setSyncEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = async () => {
    try {
      setError(null)
      const [s, p, ev] = await Promise.all([
        getDashboardStats(),
        getPatients(),
        getSyncEvents(),
      ])
      setStats(s.data)
      setPatients(p.data)
      setSyncEvents(ev.data)
    } catch (e) {
      setError('Failed to load dashboard data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Map latest sync event status per patient
  const syncStatusByPatient = {}
  syncEvents.forEach(ev => {
    if (!syncStatusByPatient[ev.patient_id]) {
      syncStatusByPatient[ev.patient_id] = ev.status
    }
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Loading dashboard…
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of MediBridge activity</p>
        </div>
        <button
          onClick={fetchAll}
          className="text-sm text-teal-600 hover:text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={stats?.total_patients ?? '—'}
          icon="👥"
          color="teal"
        />
        <StatCard
          title="Successfully Converted"
          value={stats?.successfully_converted ?? '—'}
          icon="✅"
          color="green"
          subtitle="FHIR R4 valid"
        />
        <StatCard
          title="Pending Conversion"
          value={stats?.pending_conversion ?? '—'}
          icon="⏳"
          color="yellow"
        />
        <StatCard
          title="Failed Validation"
          value={stats?.failed_validation ?? '—'}
          icon="❌"
          color="red"
        />
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Recent Patient Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Patient ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Last Updated</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Sync Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No patients registered yet. Go to{' '}
                    <button
                      onClick={() => navigate('/patients')}
                      className="text-teal-600 underline"
                    >
                      Patient Management
                    </button>{' '}
                    to register one.
                  </td>
                </tr>
              ) : (
                patients.slice(0, 10).map(p => {
                  const status = syncStatusByPatient[p.patient_id]
                  return (
                    <tr key={p.patient_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-teal-700">{p.patient_id}</td>
                      <td className="px-6 py-3 font-medium text-gray-800">{p.full_name}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(p.updated_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        {status ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>
                            {status}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => navigate(`/fhir?patient=${p.patient_id}`)}
                          className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                        >
                          View FHIR →
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
