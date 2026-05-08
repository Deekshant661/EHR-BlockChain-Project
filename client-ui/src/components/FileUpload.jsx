import { useState, useRef } from 'react';
import { fileAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg';
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * Reusable encrypted file upload component.
 *
 * Props:
 *   - patientUUID: string (required) – which patient the file belongs to
 *   - patientEditable: boolean – whether the patientUUID field is editable (doctor mode)
 *   - onUploadSuccess: (data) => void – callback after successful upload
 */
export default function FileUpload({ patientUUID: initialUUID = '', patientEditable = false, onUploadSuccess }) {
  const [patientUUID, setPatientUUID] = useState(initialUUID);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Client-side MIME validation
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedMimes.includes(selected.type)) {
      setToast({ type: 'error', message: `Unsupported file type: ${selected.type}. Allowed: PDF, PNG, JPG.` });
      e.target.value = '';
      return;
    }

    if (selected.size > MAX_SIZE_BYTES) {
      setToast({ type: 'error', message: `File too large (${(selected.size / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_SIZE_MB}MB.` });
      e.target.value = '';
      return;
    }

    setFile(selected);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!file) { setToast({ type: 'error', message: 'Please select a file first.' }); return; }
    if (!patientUUID) { setToast({ type: 'error', message: 'Patient UUID is required.' }); return; }

    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientUUID', patientUUID);

      const res = await fileAPI.upload(formData);
      const data = res.data.data;
      setUploadResult(data);
      setToast({ type: 'success', message: `File encrypted & uploaded! CID: ${data.ipfsCid.slice(0, 16)}...` });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.(data);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Upload failed. Please try again.' });
    } finally { setUploading(false); }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Patient UUID field (editable for doctors, read-only for patients) */}
      {patientEditable && (
        <div>
          <label className="label">Patient Blockchain UUID *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Enter patient's blockchain UUID"
            value={patientUUID}
            onChange={(e) => setPatientUUID(e.target.value)}
          />
        </div>
      )}

      {/* File Picker */}
      <div>
        <label className="label">Medical Document *</label>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="block w-full text-sm text-white/60 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-600/20 file:text-primary-300 hover:file:bg-primary-600/30 file:cursor-pointer file:transition-all cursor-pointer bg-surface-800 border border-white/10 rounded-xl"
          />
        </div>
        <p className="text-xs text-white/30 mt-1.5">Accepted: PDF, PNG, JPG/JPEG — Max {MAX_SIZE_MB}MB</p>
      </div>

      {/* Selected File Info */}
      {file && (
        <div className="bg-surface-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">
            {file.type === 'application/pdf' ? '📄' : '🖼️'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{file.name}</p>
            <p className="text-xs text-white/40">{formatFileSize(file.size)} · {file.type}</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Encrypting & Uploading...</span>
          </>
        ) : (
          <>
            <span>🔒</span>
            <span>Encrypt & Upload to IPFS</span>
          </>
        )}
      </button>

      {/* Upload Result */}
      {uploadResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-400">✓ Upload Successful</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span className="text-white/40">File ID:</span>
            <span className="text-white font-mono">{uploadResult.fileId}</span>
            <span className="text-white/40">IPFS CID:</span>
            <span className="text-primary-400 font-mono break-all">{uploadResult.ipfsCid}</span>
            <span className="text-white/40">Encryption:</span>
            <span className="text-amber-400 font-mono">{uploadResult.encryptionAlgorithm}</span>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
        <p className="text-xs text-white/30 leading-relaxed">
          🔒 Your file is encrypted with <strong className="text-amber-400">AES-256-GCM</strong> before leaving this device's server.
          Only encrypted data reaches IPFS. Plaintext files are never stored or transmitted.
        </p>
      </div>
    </div>
  );
}
