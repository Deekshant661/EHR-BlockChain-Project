import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ehrAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import FileUpload from '../components/FileUpload';
import FileTable from '../components/FileTable';

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl mb-4">{icon}</div>
      <p className="text-sm font-medium text-white/40 mb-1">{title}</p>
      {subtitle && <p className="text-xs text-white/20">{subtitle}</p>}
    </div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('records');
  const [records, setRecords] = useState([]);
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [grantForm, setGrantForm] = useState({ doctorId: '' });
  const [revokeForm, setRevokeForm] = useState({ doctorId: '' });
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [claimForm, setClaimForm] = useState({ policyId: '', recordId: '', claimAmount: '', description: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [fileRefresh, setFileRefresh] = useState(0);

  const patientUuid = user?.uuid;

  const fetchRecords = async () => {
    setLoading(true);
    try { const res = await ehrAPI.getAllRecordsByPatientId({ patientId: patientUuid }); setRecords(Array.isArray(res.data.data) ? res.data.data : []); }
    catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load records' }); }
    finally { setLoading(false); }
  };

  const fetchClaims = async () => {
    try { const res = await ehrAPI.getAllClaimsByPatient({ patientId: patientUuid }); setClaims(Array.isArray(res.data.data) ? res.data.data : []); }
    catch { setClaims([]); }
  };

  const fetchPolicies = async () => {
    try { const res = await ehrAPI.getPoliciesByPatient({ patientId: patientUuid }); setPolicies(Array.isArray(res.data.data) ? res.data.data : []); }
    catch { setPolicies([]); }
  };

  useEffect(() => { if (patientUuid) { fetchRecords(); fetchClaims(); fetchPolicies(); } }, [patientUuid]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantForm.doctorId) return;
    setGrantLoading(true);
    try {
      await ehrAPI.grantAccess({ patientId: patientUuid, doctorIdToGrant: grantForm.doctorId });
      setToast({ type: 'success', message: `Access granted to ${grantForm.doctorId}` });
      setGrantForm({ doctorId: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Grant failed' }); }
    finally { setGrantLoading(false); }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeForm.doctorId) return;
    setRevokeLoading(true);
    try {
      await ehrAPI.revokeAccess({ patientId: patientUuid, doctorIdToRevoke: revokeForm.doctorId });
      setToast({ type: 'success', message: `Access revoked from ${revokeForm.doctorId}` });
      setRevokeForm({ doctorId: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Revoke failed' }); }
    finally { setRevokeLoading(false); }
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    setClaimLoading(true);
    try {
      await ehrAPI.createClaim({ patientId: patientUuid, ...claimForm });
      setToast({ type: 'success', message: 'Claim submitted successfully' });
      setClaimForm({ policyId: '', recordId: '', claimAmount: '', description: '' });
      fetchClaims();
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Claim creation failed' }); }
    finally { setClaimLoading(false); }
  };

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Profile */}
      <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-blue-500/20">{(user?.name || 'U')[0]}</div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{user?.name}</h2>
          <p className="text-xs text-white/35">{user?.email}</p>
          <p className="text-[10px] text-primary-400 font-mono mt-0.5">ID: {patientUuid}</p>
        </div>
      </div>

      {/* Records */}
      {section === 'records' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">My Medical Records</h3>
            <button onClick={fetchRecords} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
              {loading ? <><span className="spinner spinner-sm" /> Loading...</> : 'Refresh'}
            </button>
          </div>
          {loading ? <LoadingSpinner text="Loading records..." /> : records.length === 0 ? (
            <EmptyState icon="📋" title="No medical records found" subtitle="Records added by your doctor will appear here" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Record ID</th><th className="table-header">Diagnosis</th><th className="table-header">Prescription</th><th className="table-header">Doctor</th><th className="table-header">Date</th></tr></thead>
                <tbody>{records.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                    <td className="table-cell font-mono text-xs text-primary-400">{r.recordId || r.id || '-'}</td>
                    <td className="table-cell">{r.diagnosis || '-'}</td>
                    <td className="table-cell text-white/50">{r.prescription || '-'}</td>
                    <td className="table-cell font-mono text-xs text-white/40">{r.doctorId || '-'}</td>
                    <td className="table-cell text-white/30 text-xs">{r.createdAt || r.timestamp || '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      {section === 'upload' && (
        <div className="max-w-2xl">
          <h3 className="section-title">Upload Medical Documents</h3>
          <div className="card"><FileUpload patientUUID={patientUuid} patientEditable={false} onUploadSuccess={() => { setToast({ type: 'success', message: 'File encrypted & uploaded to IPFS!' }); setFileRefresh((n) => n + 1); }} /></div>
        </div>
      )}

      {/* My Files */}
      {section === 'myFiles' && (<div><h3 className="section-title">My Medical Files</h3><FileTable patientUUID={patientUuid} refreshTrigger={fileRefresh} /></div>)}

      {/* Access Control */}
      {section === 'access' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">Grant Doctor Access</h3>
            <form onSubmit={handleGrant} className="space-y-3">
              <div><label className="label">Doctor Blockchain UUID</label><input className="input-field" placeholder="Enter doctor's blockchain UUID" value={grantForm.doctorId} onChange={(e) => setGrantForm({ doctorId: e.target.value })} /></div>
              <button type="submit" disabled={grantLoading} className="btn-success w-full flex items-center justify-center gap-2">
                {grantLoading ? <><span className="spinner spinner-sm" /> Granting...</> : 'Grant Access'}
              </button>
            </form>
          </div>
          <div className="card">
            <h3 className="section-title">Revoke Doctor Access</h3>
            <form onSubmit={handleRevoke} className="space-y-3">
              <div><label className="label">Doctor Blockchain UUID</label><input className="input-field" placeholder="Enter doctor's blockchain UUID" value={revokeForm.doctorId} onChange={(e) => setRevokeForm({ doctorId: e.target.value })} /></div>
              <button type="submit" disabled={revokeLoading} className="btn-danger w-full flex items-center justify-center gap-2">
                {revokeLoading ? <><span className="spinner spinner-sm" /> Revoking...</> : 'Revoke Access'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Insurance */}
      {section === 'insurance' && (
        <div className="space-y-6">
          <div><h3 className="section-title">My Insurance Policies</h3>
            {policies.length === 0 ? <EmptyState icon="🛡️" title="No policies found" subtitle="Ask your insurance agent to issue a policy" /> : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="table-header">Policy ID</th><th className="table-header">Type</th><th className="table-header">Coverage</th><th className="table-header">Valid From</th><th className="table-header">Valid To</th></tr></thead>
                  <tbody>{policies.map((p, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="table-cell font-mono text-xs text-primary-400">{p.policyId || '-'}</td>
                      <td className="table-cell">{p.policyType || '-'}</td>
                      <td className="table-cell text-emerald-400 font-medium">{p.coverageAmount || '-'}</td>
                      <td className="table-cell text-white/30 text-xs">{p.validFrom || '-'}</td>
                      <td className="table-cell text-white/30 text-xs">{p.validTo || '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="section-title">File Insurance Claim</h3>
            <form onSubmit={handleCreateClaim} className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Policy ID</label><input className="input-field" value={claimForm.policyId} onChange={(e) => setClaimForm({ ...claimForm, policyId: e.target.value })} placeholder="Policy ID" /></div>
              <div><label className="label">Record ID</label><input className="input-field" value={claimForm.recordId} onChange={(e) => setClaimForm({ ...claimForm, recordId: e.target.value })} placeholder="Medical Record ID" /></div>
              <div><label className="label">Claim Amount</label><input className="input-field" value={claimForm.claimAmount} onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })} placeholder="Amount" /></div>
              <div><label className="label">Description</label><input className="input-field" value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} placeholder="Reason for claim" /></div>
              <div className="md:col-span-2">
                <button type="submit" disabled={claimLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {claimLoading ? <><span className="spinner spinner-sm" /> Submitting...</> : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>

          <div><h3 className="section-title">My Claims</h3>
            {claims.length === 0 ? <EmptyState icon="📄" title="No claims found" subtitle="File a claim above to see it here" /> : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="table-header">Claim ID</th><th className="table-header">Amount</th><th className="table-header">Status</th><th className="table-header">Description</th></tr></thead>
                  <tbody>{claims.map((c, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="table-cell font-mono text-xs text-primary-400">{c.claimId || '-'}</td>
                      <td className="table-cell text-emerald-400 font-medium">{c.claimAmount || '-'}</td>
                      <td className="table-cell"><span className={c.status === 'approved' ? 'badge-green' : c.status === 'rejected' ? 'badge-red' : 'badge-yellow'}>{c.status || 'pending'}</span></td>
                      <td className="table-cell text-white/40">{c.description || '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
