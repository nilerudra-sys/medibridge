import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPatients, getPatient, getFhirPatient } from '../api/client'

const VALIDATION_BADGE = {
  valid:   'bg-green-100 text-green-700 border-green-200',
  invalid: 'bg-red-100 text-red-700 border-red-200',
  skipped: 'bg-gray-100 text-gray-600 border-gray-200',
}

function JsonDisplay({ data }) {
  const [copied, setCopied] = useState(false)
  const text = JSON.stringify(data, null, 2)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute top-2 right-2 text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-600 z-10"
      >
        {copied ? '✓ Copied!' : '📋 Copy JSON'}
      </button>
      <pre className="fhir-json bg-gray-950 text-green-400 rounded-lg p-4 overflow-auto text-xs leading-relaxed max-h-[520px]">
        {text}
      </pre>
    </div>
  )
}

export default function FHIRExplorer() {
  const [searchParams] = useSearchParams()
  const initPatient = searchParams.get('patient')

  const [patients, setPatients] = useState([])
  const [selectedId, setSelectedId] = useState(initPatient || '')
  const [sqlRecord, setSqlRecord] = useState(null)
  const [fhirResource, setFhirResource] = useState(null)
  const [fhirMeta, setFhirMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPatients().then(r => setPatients(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedId) loadPatientData(selectedId)
  }, [selectedId])

  const loadPatientData = async (pid) => {
    setLoading(true)
    setError(null)
    setFhirResource(null)
    setSqlRecord(null)
    setFhirMeta(null)
    try {
      const [sqlRes, fhirRes] = await Promise.allSettled([
        getPatient(pid),
        getFhirPatient(pid),
      ])

      if (sqlRes.status === 'fulfilled') {
        setSqlRecord(sqlRes.value.data)
      } else {
        setError('Could not load patient SQL record.')
      }

      if (fhirRes.status === 'fulfilled') {
        const data = fhirRes.value.data
        const validation = data._medibridge_validation
        // Remove internal meta key before display
        const { _medibridge_validation, ...resource } = data
        setFhirResource(resource)
        setFhirMeta({ validation_outcome: validation, resource_id: pid })
      } else {
        const status = fhirRes.reason?.response?.status
        if (status === 404) {
          setFhirResource(null)
          setError('FHIR resource not yet generated. The background worker may still be processing this patient (check Sync Monitor).')
        } else {
          setError('Failed to load FHIR resource.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">FHIR Explorer</h2>
        <p className="text-sm text-gray-500 mt-1">
          Compare SQL patient record with the generated HL7 FHIR R4 Patient resource.{' '}
          <span className="font-medium text-amber-600">
            Validation: fhir.resources R4 structural schema — not HAPI FHIR Validator.
          </span>
        </p>
      </div>

      {/* Patient Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Patient:</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="">— choose a patient —</option>
          {patients.map(p => (
            <option key={p.patient_id} value={p.patient_id}>
              {p.patient_id} — {p.full_name}
            </option>
          ))}
        </select>
        {selectedId && (
          <button
            onClick={() => loadPatientData(selectedId)}
            className="text-sm border border-teal-200 text-teal-700 px-3 py-2 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-10">Loading patient data…</div>
      )}

      {!loading && selectedId && (sqlRecord || fhirResource) && (
        <>
          {/* FHIR Meta */}
          {fhirMeta && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Resource ID: <span className="font-mono font-medium text-teal-700">{fhirMeta.resource_id}</span></span>
              <span className={`px-2 py-0.5 rounded border text-xs font-medium ${VALIDATION_BADGE[fhirMeta.validation_outcome] || 'bg-gray-100'}`}>
                {fhirMeta.validation_outcome === 'valid' ? '✓ Valid' : '✗ Invalid'}
                {' '}(fhir.resources R4)
              </span>
            </div>
          )}

          {/* Two-panel layout */}
          <div className="grid grid-cols-2 gap-5">
            {/* Left: SQL Record */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h3 className="text-sm font-semibold text-gray-700">🗄️ SQL Patient Record</h3>
              </div>
              <div className="p-4">
                {sqlRecord ? (
                  <dl className="space-y-2 text-sm">
                    {[
                      ['Patient ID', sqlRecord.patient_id],
                      ['Full Name', sqlRecord.full_name],
                      ['Date of Birth', sqlRecord.dob],
                      ['Gender', sqlRecord.gender],
                      ['Phone', sqlRecord.phone || '—'],
                      ['City', sqlRecord.city || '—'],
                      ['State', sqlRecord.state || '—'],
                      ['Created At', new Date(sqlRecord.created_at).toLocaleString()],
                      ['Updated At', new Date(sqlRecord.updated_at).toLocaleString()],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                        <dt className="text-gray-500 font-medium">{k}</dt>
                        <dd className="text-gray-800 font-mono text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-gray-400 text-sm">SQL record not available.</p>
                )}
              </div>
            </div>

            {/* Right: FHIR JSON */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h3 className="text-sm font-semibold text-gray-700">🔬 Generated FHIR R4 Patient Resource</h3>
              </div>
              <div className="p-4">
                {fhirResource ? (
                  <JsonDisplay data={fhirResource} />
                ) : (
                  <div className="text-gray-400 text-sm bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-2xl mb-2">⏳</p>
                    <p>FHIR resource not yet generated.</p>
                    <p className="text-xs mt-1">Check the Sync Monitor for processing status.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && !selectedId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🔬</p>
          <p className="text-base font-medium">Select a patient above to explore their FHIR R4 resource.</p>
        </div>
      )}
    </div>
  )
}
