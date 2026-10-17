import { useEffect, useState } from 'react'
import { getSyncEvents } from '../api/client'

const STATUS_STYLE = {
  done:       'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
}

const VALIDATION_STYLE = {
  valid:   'text-green-600',
  invalid: 'text-red-600',
  skipped: 'text-gray-400',
}

export default function SyncMonitor() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedError, setExpandedError] = useState(null)

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getSyncEvents()
      setEvents(res.data)
    } catch {
      setError('Failed to load sync events. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sync Monitor</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time change detection log from PostgreSQL triggers → background worker.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="text-sm text-teal-600 hover:text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Change Log Events ({events.length})</h3>
          <span className="text-xs text-gray-400">
            Source: change_log table — written by PostgreSQL triggers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Event ID', 'Patient ID', 'Operation', 'Timestamp', 'Status', 'Validation', 'Error'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    No change events yet. Register a patient to see the first trigger.
                  </td>
                </tr>
              ) : events.map(ev => (
                <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-500 text-xs">#{ev.id}</td>
                  <td className="px-5 py-3 font-mono text-teal-700 font-medium">{ev.patient_id}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold
                      ${ev.operation === 'CREATE' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ev.operation}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(ev.event_ts).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[ev.status] || 'bg-gray-100 text-gray-600'}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {ev.validation_status ? (
                      <span className={`text-xs font-medium ${VALIDATION_STYLE[ev.validation_status] || 'text-gray-500'}`}>
                        {ev.validation_status}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {ev.error_details ? (
                      <button
                        onClick={() => setExpandedError(expandedError === ev.id ? null : ev.id)}
                        className="text-red-500 text-xs underline hover:text-red-700"
                      >
                        View error
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                    {expandedError === ev.id && (
                      <div className="mt-1 text-xs bg-red-50 border border-red-100 rounded p-2 text-red-600 max-w-xs break-words">
                        {ev.error_details}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">How this works:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-600 text-xs">
          <li>Patient INSERT or UPDATE fires a PostgreSQL trigger</li>
          <li>Trigger writes a <code>pending</code> entry to <code>change_log</code></li>
          <li>Background worker polls every 3s, picks up <code>pending</code> events (<code>SELECT FOR UPDATE SKIP LOCKED</code>)</li>
          <li>Worker maps the patient to FHIR R4, validates with fhir.resources, stores in <code>fhir_resources</code></li>
          <li>Event status updates to <code>done</code> or <code>failed</code></li>
        </ol>
      </div>
    </div>
  )
}
