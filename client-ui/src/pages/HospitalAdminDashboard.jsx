import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ehrAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function HospitalAdminDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');
  const [patients, setPatients] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await ehrAPI.getAllPatients({});
      setPatients(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load patients' }); }
    finally { setLoading(false); }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await ehrAPI.fetchLedger({});
      setLedger(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load ledger' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPatients(); fetchLedger(); }, []);

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Overview */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="metric-card">
              <span className="text-2xl">👥</span>
              <span className="text-3xl font-bold text-white">{patients.length}</span>
              <span className="text-sm text-white/40">Total Patients</span>
            </div>
            <div className="metric-card">
              <span className="text-2xl">⛓️</span>
              <span className="text-3xl font-bold text-white">{ledger.length}</span>
              <span className="text-sm text-white/40">Ledger Entries</span>
            </div>
            <div className="metric-card">
              <span className="text-2xl">🟢</span>
              <span className="text-3xl font-bold text-emerald-400">Active</span>
              <span className="text-sm text-white/40">Network Status</span>
            </div>
          </div>

          {/* Recent Ledger Activity */}
          <div>
            <h3 className="section-title">Recent Blockchain Activity</h3>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Key</th><th className="table-header">Type</th><th className="table-header">Data Preview</th></tr></thead>
                <tbody>
                  {ledger.slice(0, 10).map((entry, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs text-primary-400">{entry.Key || entry.key || '-'}</td>
                      <td className="table-cell"><span className="badge-purple">{entry.Record?.docType || entry.record?.docType || 'asset'}</span></td>
                      <td className="table-cell text-xs text-white/40 max-w-xs truncate">{JSON.stringify(entry.Record || entry.record || entry).slice(0, 80)}...</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan="3" className="table-cell text-center text-white/30">No ledger data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Patients Directory */}
      {section === 'patients' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Patient Directory</h3>
            <button onClick={fetchPatients} className="btn-secondary text-sm">Refresh</button>
          </div>
          {loading ? <LoadingSpinner text="Loading..." /> : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Patient ID</th><th className="table-header">Name</th><th className="table-header">City</th><th className="table-header">Status</th></tr></thead>
                <tbody>
                  {patients.map((p, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs text-primary-400">{p.patientId || '-'}</td>
                      <td className="table-cell">{p.name || '-'}</td>
                      <td className="table-cell text-white/40">{p.city || '-'}</td>
                      <td className="table-cell"><span className="badge-green">Active</span></td>
                    </tr>
                  ))}
                  {patients.length === 0 && <tr><td colSpan="4" className="table-cell text-center text-white/30">No patients</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ledger */}
      {section === 'ledger' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Full Ledger ({ledger.length} entries)</h3>
            <button onClick={fetchLedger} className="btn-secondary text-sm">Refresh</button>
          </div>
          {loading ? <LoadingSpinner text="Loading ledger..." /> : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Key</th><th className="table-header">Type</th><th className="table-header">Full Data</th></tr></thead>
                <tbody>
                  {ledger.map((entry, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs text-primary-400">{entry.Key || entry.key || '-'}</td>
                      <td className="table-cell"><span className="badge-purple">{entry.Record?.docType || entry.record?.docType || '-'}</span></td>
                      <td className="table-cell"><pre className="text-xs text-white/40 max-w-lg overflow-x-auto">{JSON.stringify(entry.Record || entry.record || entry, null, 1)}</pre></td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan="3" className="table-cell text-center text-white/30">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
