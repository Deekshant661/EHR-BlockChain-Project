import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ehrAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import FileUpload from '../components/FileUpload';
import FileTable from '../components/FileTable';

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
  const [claimForm, setClaimForm] = useState({ policyId: '', recordId: '', claimAmount: '', description: '' });
  const [fileRefresh, setFileRefresh] = useState(0);

  const patientUuid = user?.uuid;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await ehrAPI.getAllRecordsByPatientId({ patientId: patientUuid });
      setRecords(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load records' }); }
    finally { setLoading(false); }
  };

  const fetchClaims = async () => {
    try {
      const res = await ehrAPI.getAllClaimsByPatient({ patientId: patientUuid });
      setClaims(Array.isArray(res.data.data) ? res.data.data : []);
    } catch { setClaims([]); }
  };

  const fetchPolicies = async () => {
    try {
      const res = await ehrAPI.getPoliciesByPatient({ patientId: patientUuid });
      setPolicies(Array.isArray(res.data.data) ? res.data.data : []);
    } catch { setPolicies([]); }
  };

  useEffect(() => { if (patientUuid) { fetchRecords(); fetchClaims(); fetchPolicies(); } }, [patientUuid]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantForm.doctorId) return;
    try {
      await ehrAPI.grantAccess({ patientId: patientUuid, doctorIdToGrant: grantForm.doctorId });
      setToast({ type: 'success', message: `Access granted to ${grantForm.doctorId}` });
      setGrantForm({ doctorId: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Grant failed' }); }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeForm.doctorId) return;
    try {
      await ehrAPI.revokeAccess({ patientId: patientUuid, doctorIdToRevoke: revokeForm.doctorId });
      setToast({ type: 'success', message: `Access revoked from ${revokeForm.doctorId}` });
      setRevokeForm({ doctorId: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Revoke failed' }); }
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    try {
      await ehrAPI.createClaim({ patientId: patientUuid, ...claimForm });
      setToast({ type: 'success', message: 'Claim submitted successfully' });
      setClaimForm({ policyId: '', recordId: '', claimAmount: '', description: '' });
      fetchClaims();
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Claim creation failed' }); }
  };

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Profile Card */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-primary-600/30 rounded-2xl flex items-center justify-center text-2xl">👤</div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-sm text-white/40">{user?.email}</p>
            <p className="text-xs text-primary-400 font-mono mt-1">Blockchain ID: {patientUuid}</p>
          </div>
        </div>
      </div>

      {/* Records Section */}
      {section === 'records' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">My Medical Records</h3>
            <button onClick={fetchRecords} className="btn-secondary text-sm">Refresh</button>
          </div>
          {loading ? <LoadingSpinner text="Loading records..." /> : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Record ID</th>
                  <th className="table-header">Diagnosis</th>
                  <th className="table-header">Prescription</th>
                  <th className="table-header">Doctor</th>
                  <th className="table-header">Date</th>
                </tr></thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr><td colSpan="5" className="table-cell text-center text-white/30">No records found</td></tr>
                  ) : records.map((r, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs">{r.recordId || r.id || '-'}</td>
                      <td className="table-cell">{r.diagnosis || '-'}</td>
                      <td className="table-cell">{r.prescription || '-'}</td>
                      <td className="table-cell font-mono text-xs">{r.doctorId || '-'}</td>
                      <td className="table-cell text-white/40">{r.createdAt || r.timestamp || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Files Section */}
      {section === 'upload' && (
        <div className="max-w-2xl">
          <h3 className="section-title">Upload Medical Documents</h3>
          <div className="card">
            <FileUpload
              patientUUID={patientUuid}
              patientEditable={false}
              onUploadSuccess={() => { setToast({ type: 'success', message: 'File encrypted & uploaded to IPFS!' }); setFileRefresh((n) => n + 1); }}
            />
          </div>
        </div>
      )}

      {/* My Files Section */}
      {section === 'myFiles' && (
        <div>
          <h3 className="section-title">My Medical Files</h3>
          <FileTable patientUUID={patientUuid} refreshTrigger={fileRefresh} />
        </div>
      )}

      {/* Access Control Section */}
      {section === 'access' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">Grant Doctor Access</h3>
            <form onSubmit={handleGrant} className="space-y-3">
              <div>
                <label className="label">Doctor Blockchain UUID</label>
                <input className="input-field" placeholder="Enter doctor's blockchain UUID" value={grantForm.doctorId} onChange={(e) => setGrantForm({ doctorId: e.target.value })} />
              </div>
              <button type="submit" className="btn-success w-full">Grant Access</button>
            </form>
          </div>
          <div className="card">
            <h3 className="section-title">Revoke Doctor Access</h3>
            <form onSubmit={handleRevoke} className="space-y-3">
              <div>
                <label className="label">Doctor Blockchain UUID</label>
                <input className="input-field" placeholder="Enter doctor's blockchain UUID" value={revokeForm.doctorId} onChange={(e) => setRevokeForm({ doctorId: e.target.value })} />
              </div>
              <button type="submit" className="btn-danger w-full">Revoke Access</button>
            </form>
          </div>
        </div>
      )}

      {/* Insurance Section */}
      {section === 'insurance' && (
        <div className="space-y-6">
          {/* Policies */}
          <div>
            <h3 className="section-title">My Insurance Policies</h3>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Policy ID</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Coverage</th>
                  <th className="table-header">Valid From</th>
                  <th className="table-header">Valid To</th>
                </tr></thead>
                <tbody>
                  {policies.length === 0 ? (
                    <tr><td colSpan="5" className="table-cell text-center text-white/30">No policies found</td></tr>
                  ) : policies.map((p, i) => (
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
          </div>

          {/* Create Claim */}
          <div className="card">
            <h3 className="section-title">File Insurance Claim</h3>
            <form onSubmit={handleCreateClaim} className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Policy ID</label><input className="input-field" value={claimForm.policyId} onChange={(e) => setClaimForm({ ...claimForm, policyId: e.target.value })} placeholder="Policy ID" /></div>
              <div><label className="label">Record ID</label><input className="input-field" value={claimForm.recordId} onChange={(e) => setClaimForm({ ...claimForm, recordId: e.target.value })} placeholder="Medical Record ID" /></div>
              <div><label className="label">Claim Amount</label><input className="input-field" value={claimForm.claimAmount} onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })} placeholder="Amount" /></div>
              <div><label className="label">Description</label><input className="input-field" value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} placeholder="Reason for claim" /></div>
              <div className="md:col-span-2"><button type="submit" className="btn-primary w-full">Submit Claim</button></div>
            </form>
          </div>

          {/* Claims Table */}
          <div>
            <h3 className="section-title">My Claims</h3>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Claim ID</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Description</th>
                </tr></thead>
                <tbody>
                  {claims.length === 0 ? (
                    <tr><td colSpan="4" className="table-cell text-center text-white/30">No claims found</td></tr>
                  ) : claims.map((c, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs">{c.claimId || '-'}</td>
                      <td className="table-cell text-emerald-400">{c.claimAmount || '-'}</td>
                      <td className="table-cell"><span className={c.status === 'approved' ? 'badge-green' : c.status === 'rejected' ? 'badge-red' : 'badge-yellow'}>{c.status || 'pending'}</span></td>
                      <td className="table-cell">{c.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
