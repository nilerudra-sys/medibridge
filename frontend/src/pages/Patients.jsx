import { useEffect, useState } from 'react'
import PatientForm from '../components/PatientForm'
import { getPatients, createPatient, updatePatient, getPatient } from '../api/client'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPatient, setEditPatient] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [detailPatient, setDetailPatient] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchPatients = async (q = '') => {
    setLoading(true)
    try {
      const res = await getPatients(q)
      setPatients(res.data)
    } catch {
      showToast('Failed to load patients', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const handleSearch = (e) => {
    const q = e.target.value
    setSearch(q)
    fetchPatients(q)
  }

  const handleRegister = async (form) => {
    setSubmitting(true)
    try {
      await createPatient(form)
      showToast('Patient registered successfully! Change log entry created.')
      setShowForm(false)
      fetchPatients(search)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Registration failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (form) => {
    setSubmitting(true)
    try {
      await updatePatient(editPatient.patient_id, form)
      showToast('Patient updated successfully! FHIR resource will regenerate.')
      setEditPatient(null)
      fetchPatients(search)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Update failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openDetail = async (pid) => {
    try {
      const res = await getPatient(pid)
      setDetailPatient(res.data)
    } catch {
      showToast('Could not load patient details', 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Management</h2>
          <p className="text-sm text-gray-500 mt-1">Register and manage clinic patients</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditPatient(null) }}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Register Patient
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Register Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Register New Patient</h3>
            <PatientForm
              onSubmit={handleRegister}
              onCancel={() => setShowForm(false)}
              isLoading={submitting}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editPatient && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Edit Patient — {editPatient.patient_id}
            </h3>
            <p className="text-xs text-gray-400 mb-4">Updating will regenerate the FHIR resource.</p>
            <PatientForm
              initial={editPatient}
              onSubmit={handleUpdate}
              onCancel={() => setEditPatient(null)}
              isLoading={submitting}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPatient && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Patient Details</h3>
              <button onClick={() => setDetailPatient(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <dl className="space-y-2 text-sm">
              {Object.entries({
                'Patient ID': detailPatient.patient_id,
                'Full Name': detailPatient.full_name,
                'Date of Birth': detailPatient.dob,
                'Gender': detailPatient.gender,
                'Phone': detailPatient.phone || '—',
                'City': detailPatient.city || '—',
                'State': detailPatient.state || '—',
                'Registered': new Date(detailPatient.created_at).toLocaleString(),
                'Last Updated': new Date(detailPatient.updated_at).toLocaleString(),
              }).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500 font-medium">{k}</dt>
                  <dd className="text-gray-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search by name or patient ID…"
            value={search}
            onChange={handleSearch}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Patient ID', 'Full Name', 'DOB', 'Gender', 'City', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  {search ? 'No patients found for your search.' : 'No patients yet. Register the first one!'}
                </td></tr>
              ) : patients.map(p => (
                <tr key={p.patient_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-teal-700 font-medium">{p.patient_id}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{p.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.dob}</td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{p.gender}</td>
                  <td className="px-5 py-3 text-gray-500">{p.city || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openDetail(p.patient_id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setEditPatient(p)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
