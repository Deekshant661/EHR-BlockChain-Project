import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ehrAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function InsuranceDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [policyPatientId, setPolicyPatientId] = useState('');
  const [approveForm, setApproveForm] = useState({ patientId: '', claimId: '', decision: 'approved', reason: '' });
  const [issueForm, setIssueForm] = useState({ patientId: '', coverageAmount: '', policyType: '', validFrom: '', validTo: '' });

  const fetchClaims = async (e) => {
    e?.preventDefault();
    if (!patientIdInput) { setToast({ type: 'error', message: 'Enter patient blockchain UUID' }); return; }
    setLoading(true);
    try {
      const res = await ehrAPI.getAllClaimsByPatient({ patientId: patientIdInput });
      setClaims(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load claims' }); setClaims([]); }
    finally { setLoading(false); }
  };

  const fetchPolicies = async (e) => {
    e?.preventDefault();
    if (!policyPatientId) { setToast({ type: 'error', message: 'Enter patient blockchain UUID' }); return; }
    setLoading(true);
    try {
      const res = await ehrAPI.getPoliciesByPatient({ patientId: policyPatientId });
      setPolicies(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load policies' }); setPolicies([]); }
    finally { setLoading(false); }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approveForm.patientId || !approveForm.claimId) { setToast({ type: 'error', message: 'Patient ID and Claim ID required' }); return; }
    try {
      await ehrAPI.approveClaim(approveForm);
      setToast({ type: 'success', message: `Claim ${approveForm.decision} successfully` });
      setApproveForm({ patientId: '', claimId: '', decision: 'approved', reason: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to process claim' }); }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.patientId || !issueForm.coverageAmount || !issueForm.policyType) { setToast({ type: 'error', message: 'Fill required fields' }); return; }
    try {
      await ehrAPI.issueInsurance(issueForm);
      setToast({ type: 'success', message: 'Insurance policy issued successfully' });
      setIssueForm({ patientId: '', coverageAmount: '', policyType: '', validFrom: '', validTo: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to issue policy' }); }
  };

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Profile */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-primary-600/30 rounded-2xl flex items-center justify-center text-2xl">🛡️</div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-sm text-white/40">{user?.email}</p>
            <p className="text-xs text-primary-400 font-mono mt-1">Agent UUID: {user?.uuid}</p>
          </div>
        </div>
      </div>

      {/* Claims Section */}
      {section === 'claims' && (
        <div className="space-y-6">
          {/* Search Claims */}
          <div className="card">
            <h3 className="section-title">Lookup Patient Claims</h3>
            <form onSubmit={fetchClaims} className="flex gap-3">
              <input className="input-field flex-1" placeholder="Patient blockchain UUID..." value={patientIdInput} onChange={(e) => setPatientIdInput(e.target.value)} />
              <button type="submit" className="btn-primary">Fetch Claims</button>
            </form>
          </div>

          {/* Claims Table */}
          {claims.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Claim ID</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Policy ID</th>
                </tr></thead>
                <tbody>
                  {claims.map((c, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs">{c.claimId || '-'}</td>
                      <td className="table-cell text-emerald-400">{c.claimAmount || '-'}</td>
                      <td className="table-cell"><span className={c.status === 'approved' ? 'badge-green' : c.status === 'rejected' ? 'badge-red' : 'badge-yellow'}>{c.status || 'pending'}</span></td>
                      <td className="table-cell">{c.description || '-'}</td>
                      <td className="table-cell font-mono text-xs">{c.policyId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Approve/Reject */}
          <div className="card">
            <h3 className="section-title">Process Claim</h3>
            <form onSubmit={handleApprove} className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Patient Blockchain UUID *</label><input className="input-field" value={approveForm.patientId} onChange={(e) => setApproveForm({ ...approveForm, patientId: e.target.value })} placeholder="Patient UUID" /></div>
              <div><label className="label">Claim ID *</label><input className="input-field" value={approveForm.claimId} onChange={(e) => setApproveForm({ ...approveForm, claimId: e.target.value })} placeholder="Claim ID" /></div>
              <div>
                <label className="label">Decision *</label>
                <select className="input-field" value={approveForm.decision} onChange={(e) => setApproveForm({ ...approveForm, decision: e.target.value })}>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              <div><label className="label">Reason</label><input className="input-field" value={approveForm.reason} onChange={(e) => setApproveForm({ ...approveForm, reason: e.target.value })} placeholder="Decision reason" /></div>
              <div className="md:col-span-2"><button type="submit" className="btn-primary w-full">Submit Decision</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Policy Section */}
      {section === 'issue' && (
        <div className="card max-w-2xl">
          <h3 className="section-title">Issue Insurance Policy</h3>
          <form onSubmit={handleIssue} className="space-y-4">
            <div><label className="label">Patient Blockchain UUID *</label><input className="input-field" value={issueForm.patientId} onChange={(e) => setIssueForm({ ...issueForm, patientId: e.target.value })} placeholder="Patient UUID" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Coverage Amount *</label><input className="input-field" value={issueForm.coverageAmount} onChange={(e) => setIssueForm({ ...issueForm, coverageAmount: e.target.value })} placeholder="e.g. 500000" /></div>
              <div><label className="label">Policy Type *</label><input className="input-field" value={issueForm.policyType} onChange={(e) => setIssueForm({ ...issueForm, policyType: e.target.value })} placeholder="e.g. health, dental" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Valid From</label><input type="date" className="input-field" value={issueForm.validFrom} onChange={(e) => setIssueForm({ ...issueForm, validFrom: e.target.value })} /></div>
              <div><label className="label">Valid To</label><input type="date" className="input-field" value={issueForm.validTo} onChange={(e) => setIssueForm({ ...issueForm, validTo: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn-primary w-full">Issue Policy on Blockchain</button>
          </form>
        </div>
      )}

      {/* Policies Section */}
      {section === 'policies' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">Lookup Patient Policies</h3>
            <form onSubmit={fetchPolicies} className="flex gap-3">
              <input className="input-field flex-1" placeholder="Patient blockchain UUID..." value={policyPatientId} onChange={(e) => setPolicyPatientId(e.target.value)} />
              <button type="submit" className="btn-primary">Fetch Policies</button>
            </form>
          </div>
          {policies.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Policy ID</th><th className="table-header">Type</th><th className="table-header">Coverage</th><th className="table-header">Valid From</th><th className="table-header">Valid To</th></tr></thead>
                <tbody>
                  {policies.map((p, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs">{p.policyId || '-'}</td>
                      <td className="table-cell">{p.policyType || '-'}</td>
                      <td className="table-cell text-emerald-400">{p.coverageAmount || '-'}</td>
                      <td className="table-cell text-white/40">{p.validFrom || '-'}</td>
                      <td className="table-cell text-white/40">{p.validTo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
