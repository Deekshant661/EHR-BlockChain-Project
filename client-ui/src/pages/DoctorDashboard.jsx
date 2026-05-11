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

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [myRecords, setMyRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [addForm, setAddForm] = useState({ patientId: '', diagnosis: '', prescription: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [historyRecordId, setHistoryRecordId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [fileRefresh, setFileRefresh] = useState(0);
  const [fileSearchUUID, setFileSearchUUID] = useState('');

  const doctorUuid = user?.uuid;

  const fetchAllPatients = async () => {
    setLoading(true);
    try { const res = await ehrAPI.getAllPatients({}); setPatients(Array.isArray(res.data.data) ? res.data.data : []); }
    catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load patients' }); }
    finally { setLoading(false); }
  };

  const fetchPatientRecords = async (patientId) => {
    setLoading(true);
    try { const res = await ehrAPI.getAllRecordsByPatientId({ patientId }); setRecords(Array.isArray(res.data.data) ? res.data.data : []); }
    catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load records. You may not have access.' }); setRecords([]); }
    finally { setLoading(false); }
  };

  const fetchMyRecords = async () => {
    setLoading(true);
    try { const res = await ehrAPI.getRecordsByDoctor({ doctorId: doctorUuid }); setMyRecords(Array.isArray(res.data.data) ? res.data.data : []); }
    catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load your records' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAllPatients(); }, []);

  const handleSearchPatient = async (e) => {
    e.preventDefault();
    if (!patientSearch) return;
    setSearchLoading(true);
    try {
      const res = await ehrAPI.getPatientById({ patientId: patientSearch });
      setSelectedPatient(res.data.data);
      fetchPatientRecords(patientSearch);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Patient not found' }); setSelectedPatient(null); }
    finally { setSearchLoading(false); }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!addForm.patientId || !addForm.diagnosis) { setToast({ type: 'error', message: 'Patient ID and diagnosis required' }); return; }
    setAddLoading(true);
    try {
      await ehrAPI.addRecord({ patientId: addForm.patientId, diagnosis: addForm.diagnosis, prescription: addForm.prescription });
      setToast({ type: 'success', message: 'Medical record added successfully' });
      setAddForm({ patientId: '', diagnosis: '', prescription: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to add record. Ensure you have access.' }); }
    finally { setAddLoading(false); }
  };

  const handleQueryHistory = async (e) => {
    e.preventDefault();
    if (!historyRecordId) return;
    setHistoryLoading(true);
    try { const res = await ehrAPI.queryHistoryOfAsset({ recordId: historyRecordId }); setHistory(Array.isArray(res.data.data) ? res.data.data : []); }
    catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to query history' }); }
    finally { setHistoryLoading(false); }
  };

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Profile */}
      <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-emerald-500/20">{(user?.name || 'D')[0]}</div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{user?.name}</h2>
          <p className="text-xs text-white/35">{user?.email}</p>
          <p className="text-[10px] text-primary-400 font-mono mt-0.5">Doctor UUID: {doctorUuid}</p>
        </div>
      </div>

      {/* Patients */}
      {section === 'patients' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">Search Patient by Blockchain UUID</h3>
            <form onSubmit={handleSearchPatient} className="flex gap-3">
              <input className="input-field flex-1" placeholder="Enter patient blockchain UUID..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
              <button type="submit" disabled={searchLoading} className="btn-primary flex items-center gap-2">
                {searchLoading ? <><span className="spinner spinner-sm" /></> : 'Search'}
              </button>
            </form>
          </div>

          {selectedPatient && (
            <div className="card">
              <h3 className="section-title">Patient Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-white/35">Name:</span> <span className="text-white ml-2">{selectedPatient.name || '-'}</span></div>
                <div><span className="text-white/35">City:</span> <span className="text-white ml-2">{selectedPatient.city || '-'}</span></div>
                <div className="col-span-2"><span className="text-white/35">Patient ID:</span> <span className="text-primary-400 font-mono ml-2 text-xs">{selectedPatient.patientId || patientSearch}</span></div>
              </div>
              <h4 className="text-sm font-semibold text-white/50 mb-2">Records ({records.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="table-header">Record ID</th><th className="table-header">Diagnosis</th><th className="table-header">Prescription</th></tr></thead>
                  <tbody>
                    {records.map((r, i) => (<tr key={i} className="hover:bg-white/[0.03]"><td className="table-cell font-mono text-xs text-primary-400">{r.recordId || '-'}</td><td className="table-cell">{r.diagnosis || '-'}</td><td className="table-cell text-white/50">{r.prescription || '-'}</td></tr>))}
                    {records.length === 0 && <tr><td colSpan="3" className="table-cell text-center text-white/25">No records or no access</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">All Patients</h3>
              <button onClick={fetchAllPatients} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
                {loading ? <><span className="spinner spinner-sm" /> Loading...</> : 'Refresh'}
              </button>
            </div>
            {loading ? <LoadingSpinner text="Loading patients..." /> : patients.length === 0 ? (
              <EmptyState icon="👥" title="No patients found" />
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="table-header">Patient ID</th><th className="table-header">Name</th><th className="table-header">City</th></tr></thead>
                  <tbody>{patients.map((p, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] cursor-pointer transition-colors" onClick={() => { setPatientSearch(p.patientId); setSelectedPatient(p); fetchPatientRecords(p.patientId); }}>
                      <td className="table-cell font-mono text-xs text-primary-400">{p.patientId || '-'}</td>
                      <td className="table-cell">{p.name || '-'}</td>
                      <td className="table-cell text-white/35">{p.city || '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Files */}
      {section === 'upload' && (<div className="max-w-2xl"><h3 className="section-title">Upload Medical Documents for Patient</h3><div className="card"><FileUpload patientUUID="" patientEditable={true} onUploadSuccess={() => { setToast({ type: 'success', message: 'File encrypted & uploaded to IPFS!' }); setFileRefresh((n) => n + 1); }} /></div></div>)}

      {/* Patient Files */}
      {section === 'patientFiles' && (
        <div><h3 className="section-title">Patient Medical Files</h3>
          <div className="card mb-4"><form onSubmit={(e) => e.preventDefault()} className="flex gap-3"><input className="input-field flex-1" placeholder="Enter patient blockchain UUID to view files..." value={fileSearchUUID} onChange={(e) => setFileSearchUUID(e.target.value)} /></form></div>
          <FileTable patientUUID={fileSearchUUID} refreshTrigger={fileRefresh} />
        </div>
      )}

      {/* Add Record */}
      {section === 'addRecord' && (
        <div className="card max-w-2xl">
          <h3 className="section-title">Add Medical Record</h3>
          <form onSubmit={handleAddRecord} className="space-y-4">
            <div><label className="label">Patient Blockchain UUID *</label><input className="input-field" placeholder="Enter patient UUID" value={addForm.patientId} onChange={(e) => setAddForm({ ...addForm, patientId: e.target.value })} /></div>
            <div><label className="label">Diagnosis *</label><textarea className="input-field min-h-[80px]" placeholder="Diagnosis details..." value={addForm.diagnosis} onChange={(e) => setAddForm({ ...addForm, diagnosis: e.target.value })} /></div>
            <div><label className="label">Prescription</label><textarea className="input-field min-h-[80px]" placeholder="Prescribed medications..." value={addForm.prescription} onChange={(e) => setAddForm({ ...addForm, prescription: e.target.value })} /></div>
            <button type="submit" disabled={addLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {addLoading ? <><span className="spinner spinner-sm" /> Submitting...</> : 'Submit Record to Blockchain'}
            </button>
          </form>
        </div>
      )}

      {/* My Records */}
      {section === 'myRecords' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Records Created by Me</h3>
            <button onClick={fetchMyRecords} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
              {loading ? <><span className="spinner spinner-sm" /></> : 'Load Records'}
            </button>
          </div>
          {loading ? <LoadingSpinner /> : myRecords.length === 0 ? (
            <EmptyState icon="📋" title="No records found" subtitle='Click "Load Records" to fetch your authored records' />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Record ID</th><th className="table-header">Patient</th><th className="table-header">Diagnosis</th><th className="table-header">Prescription</th></tr></thead>
                <tbody>{myRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.03]"><td className="table-cell font-mono text-xs text-primary-400">{r.recordId || '-'}</td><td className="table-cell font-mono text-xs text-white/40">{r.patientId || '-'}</td><td className="table-cell">{r.diagnosis || '-'}</td><td className="table-cell text-white/50">{r.prescription || '-'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {section === 'history' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">Query Record History</h3>
            <form onSubmit={handleQueryHistory} className="flex gap-3">
              <input className="input-field flex-1" placeholder="Enter record ID..." value={historyRecordId} onChange={(e) => setHistoryRecordId(e.target.value)} />
              <button type="submit" disabled={historyLoading} className="btn-primary flex items-center gap-2">
                {historyLoading ? <><span className="spinner spinner-sm" /></> : 'Query'}
              </button>
            </form>
          </div>
          {history.length > 0 && (
            <div className="card overflow-x-auto">
              <h4 className="section-title">Audit Trail</h4>
              <table className="w-full">
                <thead><tr><th className="table-header">Tx ID</th><th className="table-header">Timestamp</th><th className="table-header">Action</th></tr></thead>
                <tbody>{history.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.03]"><td className="table-cell font-mono text-xs text-primary-400">{h.txId?.slice(0, 16) || '-'}...</td><td className="table-cell text-white/35 text-xs">{h.timestamp || '-'}</td><td className="table-cell"><span className={h.isDelete ? 'badge-red' : 'badge-blue'}>{h.isDelete ? 'DELETE' : 'UPDATE'}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
