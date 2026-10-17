import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// --- Patients ---
export const getPatients = (search = '') =>
  api.get('/patients', { params: search ? { search } : {} })

export const getPatient = (id) => api.get(`/patients/${id}`)

export const createPatient = (data) => api.post('/patients', data)

export const updatePatient = (id, data) => api.put(`/patients/${id}`, data)

// --- FHIR ---
export const getFhirPatient = (id) => api.get(`/fhir/Patient/${id}`)

export const listFhirPatients = () => api.get('/fhir/Patient')

// --- Sync ---
export const getSyncEvents = (patient_id = null) =>
  api.get('/sync/events', { params: patient_id ? { patient_id } : {} })

// --- Dashboard ---
export const getDashboardStats = () => api.get('/dashboard/stats')

export default api
