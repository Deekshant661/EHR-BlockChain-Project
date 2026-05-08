import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ehrAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function InsuranceAdminDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Derived metrics from ledger
  const [metrics, setMetrics] = useState({ totalPolicies: 0, totalClaims: 0, approved: 0, rejected: 0, pending: 0 });

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await ehrAPI.fetchLedger({});
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setLedger(data);

      // Parse metrics from ledger
      let totalPolicies = 0, totalClaims = 0, approved = 0, rejected = 0, pending = 0;
      data.forEach((entry) => {
        const record = entry.Record || entry.record || {};
        if (record.docType === 'insurance' || record.docType === 'policy') totalPolicies++;
        if (record.docType === 'claim') {
          totalClaims++;
          if (record.status === 'approved') approved++;
          else if (record.status === 'rejected') rejected++;
          else pending++;
        }
      });
      setMetrics({ totalPolicies, totalClaims, approved, rejected, pending });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load ledger' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLedger(); }, []);

  const insuranceEntries = ledger.filter((e) => {
    const dt = (e.Record || e.record || {}).docType;
    return dt === 'insurance' || dt === 'policy' || dt === 'claim';
  });

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Overview */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="metric-card">
              <span className="text-2xl">🛡️</span>
              <span className="text-3xl font-bold text-white">{metrics.totalPolicies}</span>
              <span className="text-sm text-white/40">Total Policies</span>
            </div>
            <div className="metric-card">
              <span className="text-2xl">📄</span>
              <span className="text-3xl font-bold text-white">{metrics.totalClaims}</span>
              <span className="text-sm text-white/40">Total Claims</span>
            </div>
            <div className="metric-card">
              <span className="text-2xl">✅</span>
              <span className="text-3xl font-bold text-emerald-400">{metrics.approved}</span>
              <span className="text-sm text-white/40">Approved</span>
            </div>
            <div className="metric-card">
              <span className="text-2xl">❌</span>
              <span className="text-3xl font-bold text-red-400">{metrics.rejected}</span>
              <span className="text-sm text-white/40">Rejected</span>
            </div>
            <div className="metric-card">
              <span className="text-2xl">⏳</span>
              <span className="text-3xl font-bold text-amber-400">{metrics.pending}</span>
              <span className="text-sm text-white/40">Pending</span>
            </div>
          </div>

          {/* Insurance Summary */}
          <div>
            <h3 className="section-title">Insurance & Claims Summary</h3>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Key</th><th className="table-header">Type</th><th className="table-header">Status</th><th className="table-header">Details</th></tr></thead>
                <tbody>
                  {insuranceEntries.slice(0, 20).map((entry, i) => {
                    const record = entry.Record || entry.record || {};
                    return (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="table-cell font-mono text-xs text-primary-400">{entry.Key || entry.key || '-'}</td>
                        <td className="table-cell"><span className="badge-purple">{record.docType || '-'}</span></td>
                        <td className="table-cell">
                          {record.status && <span className={record.status === 'approved' ? 'badge-green' : record.status === 'rejected' ? 'badge-red' : 'badge-yellow'}>{record.status}</span>}
                        </td>
                        <td className="table-cell text-xs text-white/40 max-w-xs truncate">{record.policyType || record.claimAmount || record.coverageAmount || '-'}</td>
                      </tr>
                    );
                  })}
                  {insuranceEntries.length === 0 && <tr><td colSpan="4" className="table-cell text-center text-white/30">No insurance data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Claims Audit */}
      {section === 'claims' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Claims Audit Trail</h3>
            <button onClick={fetchLedger} className="btn-secondary text-sm">Refresh</button>
          </div>
          {loading ? <LoadingSpinner text="Loading..." /> : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Key</th><th className="table-header">Type</th><th className="table-header">Status</th><th className="table-header">Data</th></tr></thead>
                <tbody>
                  {ledger.filter(e => (e.Record || e.record || {}).docType === 'claim').map((entry, i) => {
                    const record = entry.Record || entry.record || {};
                    return (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="table-cell font-mono text-xs text-primary-400">{entry.Key || entry.key || '-'}</td>
                        <td className="table-cell"><span className="badge-blue">claim</span></td>
                        <td className="table-cell"><span className={record.status === 'approved' ? 'badge-green' : record.status === 'rejected' ? 'badge-red' : 'badge-yellow'}>{record.status || 'pending'}</span></td>
                        <td className="table-cell"><pre className="text-xs text-white/40 max-w-lg overflow-x-auto">{JSON.stringify(record, null, 1)}</pre></td>
                      </tr>
                    );
                  })}
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
                <thead><tr><th className="table-header">Key</th><th className="table-header">Type</th><th className="table-header">Data</th></tr></thead>
                <tbody>
                  {ledger.map((entry, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs text-primary-400">{entry.Key || entry.key || '-'}</td>
                      <td className="table-cell"><span className="badge-purple">{(entry.Record || entry.record || {}).docType || '-'}</span></td>
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
