import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import FHIRExplorer from './pages/FHIRExplorer'
import SyncMonitor from './pages/SyncMonitor'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/fhir" element={<FHIRExplorer />} />
            <Route path="/sync" element={<SyncMonitor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
