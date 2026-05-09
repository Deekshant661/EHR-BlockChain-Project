import { useState, useEffect, useCallback } from 'react';
import { fileAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

/**
 * Reusable file listing table with download buttons.
 *
 * Props:
 *   - patientUUID: string (required) – fetch files for this patient
 *   - refreshTrigger: number – increment to trigger a refetch
 */
export default function FileTable({ patientUUID, refreshTrigger = 0 }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null); // fileId currently downloading
  const [toast, setToast] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!patientUUID) return;
    setLoading(true);
    try {
      const res = await fileAPI.getByPatient({ patientUUID });
      setFiles(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load files.' });
      setFiles([]);
    } finally { setLoading(false); }
  }, [patientUUID]);

  // Fetch on mount and when refreshTrigger changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  const handleDownload = async (file) => {
    setDownloading(file.id);
    try {
      const res = await fileAPI.download(file.id);
      // Create blob URL and trigger browser download
      const blob = new Blob([res.data], { type: file.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: `Downloaded: ${file.originalFileName}` });
    } catch (err) {
      // Blob error responses need special parsing
      let message = 'Download failed.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          message = json.message || message;
        } catch { /* ignore parse errors */ }
      } else {
        message = err.response?.data?.message || message;
      }
      setToast({ type: 'error', message });
    } finally { setDownloading(null); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  const getMimeIcon = (mime) => {
    if (mime === 'application/pdf') return '📄';
    if (mime?.startsWith('image/')) return '🖼️';
    return '📎';
  };

  if (!patientUUID) {
    return (
      <div className="card text-center py-8">
        <p className="text-white/30 text-sm">Enter a Patient UUID to view files.</p>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-white/40">{files.length} file{files.length !== 1 ? 's' : ''} found</p>
        <button onClick={fetchFiles} className="btn-secondary text-sm" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? <LoadingSpinner text="Loading files..." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Type</th>
                <th className="table-header">File Name</th>
                <th className="table-header">Size</th>
                <th className="table-header">Uploaded By</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-cell text-center text-white/30 py-8">
                    No uploaded files found
                  </td>
                </tr>
              ) : files.map((f) => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="table-cell text-center text-lg">{getMimeIcon(f.mimeType)}</td>
                  <td className="table-cell">
                    <p className="text-sm text-white font-medium truncate max-w-[200px]">{f.originalFileName}</p>
                    <p className="text-xs text-white/30 font-mono">{f.mimeType}</p>
                  </td>
                  <td className="table-cell text-white/60 text-sm">{formatFileSize(f.fileSize)}</td>
                  <td className="table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.uploaderRole === 'doctor' ? 'bg-blue-500/10 text-blue-400' : 'bg-primary-500/10 text-primary-400'
                    }`}>
                      {f.uploaderRole}
                    </span>
                  </td>
                  <td className="table-cell text-white/40 text-xs">{formatDate(f.uploadTimestamp)}</td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => handleDownload(f)}
                      disabled={downloading === f.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {downloading === f.id ? (
                        <><LoadingSpinner size="sm" /> Decrypting...</>
                      ) : (
                        <>⬇ Download</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Security notice */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/5 mt-4">
        <p className="text-xs text-white/30 leading-relaxed">
          🔓 Files are decrypted server-side using <strong className="text-amber-400">AES-256-GCM</strong> and streamed securely.
          Encrypted data never leaves the server as plaintext until your download begins.
        </p>
      </div>
    </div>
  );
}
