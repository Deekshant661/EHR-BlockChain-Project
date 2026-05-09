import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ehrAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import FileUpload from '../components/FileUpload';
import FileTable from '../components/FileTable';

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
  const [historyRecordId, setHistoryRecordId] = useState('');
  const [fileRefresh, setFileRefresh] = useState(0);
  const [fileSearchUUID, setFileSearchUUID] = useState('');

  const doctorUuid = user?.uuid;

  const fetchAllPatients = async () => {
    setLoading(true);
    try {
      const res = await ehrAPI.getAllPatients({});
      setPatients(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load patients' }); }
    finally { setLoading(false); }
  };

  const fetchPatientRecords = async (patientId) => {
    setLoading(true);
    try {
      const res = await ehrAPI.getAllRecordsByPatientId({ patientId });
      setRecords(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load records. You may not have access.' }); setRecords([]); }
    finally { setLoading(false); }
  };

  const fetchMyRecords = async () => {
    setLoading(true);
    try {
      const res = await ehrAPI.getRecordsByDoctor({ doctorId: doctorUuid });
      setMyRecords(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load your records' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAllPatients(); }, []);

  const handleSearchPatient = async (e) => {
    e.preventDefault();
    if (!patientSearch) return;
    try {
      const res = await ehrAPI.getPatientById({ patientId: patientSearch });
      setSelectedPatient(res.data.data);
      fetchPatientRecords(patientSearch);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Patient not found' }); setSelectedPatient(null); }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!addForm.patientId || !addForm.diagnosis) { setToast({ type: 'error', message: 'Patient ID and diagnosis required' }); return; }
    try {
      await ehrAPI.addRecord({ patientId: addForm.patientId, diagnosis: addForm.diagnosis, prescription: addForm.prescription });
      setToast({ type: 'success', message: 'Medical record added successfully' });
      setAddForm({ patientId: '', diagnosis: '', prescription: '' });
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to add record. Ensure you have access.' }); }
  };

  const handleQueryHistory = async (e) => {
    e.preventDefault();
    if (!historyRecordId) return;
    setLoading(true);
    try {
      const res = await ehrAPI.queryHistoryOfAsset({ recordId: historyRecordId });
      setHistory(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) { setToast({ type: 'error', message: err.response?.data?.message || 'Failed to query history' }); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Profile */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-primary-600/30 rounded-2xl flex items-center justify-center text-2xl">🩺</div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-sm text-white/40">{user?.email}</p>
            <p className="text-xs text-primary-400 font-mono mt-1">Doctor UUID: {doctorUuid}</p>
          </div>
        </div>
      </div>

      {/* Patients Section */}
      {section === 'patients' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="card">
            <h3 className="section-title">Search Patient by Blockchain UUID</h3>
            <form onSubmit={handleSearchPatient} className="flex gap-3">
              <input className="input-field flex-1" placeholder="Enter patient blockchain UUID..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
              <button type="submit" className="btn-primary">Search</button>
            </form>
          </div>

          {/* Selected Patient */}
          {selectedPatient && (
            <div className="card">
              <h3 className="section-title">Patient Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-white/40">Name:</span> <span className="text-white ml-2">{selectedPatient.name || '-'}</span></div>
                <div><span className="text-white/40">City:</span> <span className="text-white ml-2">{selectedPatient.city || '-'}</span></div>
                <div className="col-span-2"><span className="text-white/40">Patient ID:</span> <span className="text-primary-400 font-mono ml-2">{selectedPatient.patientId || patientSearch}</span></div>
              </div>
              <h4 className="text-sm font-semibold text-white/60 mb-2">Records ({records.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="table-header">Record ID</th><th className="table-header">Diagnosis</th><th className="table-header">Prescription</th></tr></thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="table-cell font-mono text-xs">{r.recordId || '-'}</td>
                        <td className="table-cell">{r.diagnosis || '-'}</td>
                        <td className="table-cell">{r.prescription || '-'}</td>
                      </tr>
                    ))}
                    {records.length === 0 && <tr><td colSpan="3" className="table-cell text-center text-white/30">No records or no access</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Patients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">All Patients</h3>
              <button onClick={fetchAllPatients} className="btn-secondary text-sm">Refresh</button>
            </div>
            {loading ? <LoadingSpinner text="Loading patients..." /> : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="table-header">Patient ID</th><th className="table-header">Name</th><th className="table-header">City</th></tr></thead>
                  <tbody>
                    {patients.length === 0 ? <tr><td colSpan="3" className="table-cell text-center text-white/30">No patients</td></tr> : patients.map((p, i) => (
                      <tr key={i} className="hover:bg-white/5 cursor-pointer" onClick={() => { setPatientSearch(p.patientId); setSelectedPatient(p); fetchPatientRecords(p.patientId); }}>
                        <td className="table-cell font-mono text-xs text-primary-400">{p.patientId || '-'}</td>
                        <td className="table-cell">{p.name || '-'}</td>
                        <td className="table-cell text-white/40">{p.city || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Files Section */}
      {section === 'upload' && (
        <div className="max-w-2xl">
          <h3 className="section-title">Upload Medical Documents for Patient</h3>
          <div className="card">
            <FileUpload
              patientUUID=""
              patientEditable={true}
              onUploadSuccess={() => { setToast({ type: 'success', message: 'File encrypted & uploaded to IPFS!' }); setFileRefresh((n) => n + 1); }}
            />
          </div>
        </div>
      )}

      {/* Patient Files Section */}
      {section === 'patientFiles' && (
        <div>
          <h3 className="section-title">Patient Medical Files</h3>
          <div className="card mb-4">
            <form onSubmit={(e) => { e.preventDefault(); }} className="flex gap-3">
              <input
                className="input-field flex-1"
                placeholder="Enter patient blockchain UUID to view files..."
                value={fileSearchUUID}
                onChange={(e) => setFileSearchUUID(e.target.value)}
              />
            </form>
          </div>
          <FileTable patientUUID={fileSearchUUID} refreshTrigger={fileRefresh} />
        </div>
      )}

      {/* Add Record Section */}
      {section === 'addRecord' && (
        <div className="card max-w-2xl">
          <h3 className="section-title">Add Medical Record</h3>
          <form onSubmit={handleAddRecord} className="space-y-4">
            <div><label className="label">Patient Blockchain UUID *</label><input className="input-field" placeholder="Enter patient UUID" value={addForm.patientId} onChange={(e) => setAddForm({ ...addForm, patientId: e.target.value })} /></div>
            <div><label className="label">Diagnosis *</label><textarea className="input-field min-h-[80px]" placeholder="Diagnosis details..." value={addForm.diagnosis} onChange={(e) => setAddForm({ ...addForm, diagnosis: e.target.value })} /></div>
            <div><label className="label">Prescription</label><textarea className="input-field min-h-[80px]" placeholder="Prescribed medications..." value={addForm.prescription} onChange={(e) => setAddForm({ ...addForm, prescription: e.target.value })} /></div>
            <button type="submit" className="btn-primary w-full">Submit Record to Blockchain</button>
          </form>
        </div>
      )}

      {/* My Records Section */}
      {section === 'myRecords' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Records Created by Me</h3>
            <button onClick={fetchMyRecords} className="btn-secondary text-sm">Load Records</button>
          </div>
          {loading ? <LoadingSpinner /> : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header">Record ID</th><th className="table-header">Patient</th><th className="table-header">Diagnosis</th><th className="table-header">Prescription</th></tr></thead>
                <tbody>
                  {myRecords.length === 0 ? <tr><td colSpan="4" className="table-cell text-center text-white/30">No records found. Click "Load Records".</td></tr> : myRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs">{r.recordId || '-'}</td>
                      <td className="table-cell font-mono text-xs">{r.patientId || '-'}</td>
                      <td className="table-cell">{r.diagnosis || '-'}</td>
                      <td className="table-cell">{r.prescription || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      {section === 'history' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">Query Record History</h3>
            <form onSubmit={handleQueryHistory} className="flex gap-3">
              <input className="input-field flex-1" placeholder="Enter record ID..." value={historyRecordId} onChange={(e) => setHistoryRecordId(e.target.value)} />
              <button type="submit" className="btn-primary">Query</button>
            </form>
          </div>
          {history.length > 0 && (
            <div className="card overflow-x-auto">
              <h4 className="section-title">Audit Trail</h4>
              <table className="w-full">
                <thead><tr><th className="table-header">Tx ID</th><th className="table-header">Timestamp</th><th className="table-header">Action</th></tr></thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="table-cell font-mono text-xs">{h.txId?.slice(0, 16) || '-'}...</td>
                      <td className="table-cell text-white/40">{h.timestamp || '-'}</td>
                      <td className="table-cell">{h.isDelete ? 'DELETE' : 'UPDATE'}</td>
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
