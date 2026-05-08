import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 35000,
});

// ─── Request Interceptor: Attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ehr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ehr_token');
      localStorage.removeItem('ehr_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
};

// ─── EHR API ─────────────────────────────────────────────────────────────────
export const ehrAPI = {
  // Medical Records
  addRecord: (data) => api.post('/ehr/addRecord', data),
  getAllRecordsByPatientId: (data) => api.post('/ehr/getAllRecordsByPatientId', data),
  getRecordById: (data) => api.post('/ehr/getRecordById', data),
  getRecordsByDoctor: (data) => api.post('/ehr/getRecordsByDoctor', data),
  queryHistoryOfAsset: (data) => api.post('/ehr/queryHistoryOfAsset', data),

  // Patient Management
  getPatientById: (data) => api.post('/ehr/getPatientById', data),
  getAllPatients: (data) => api.post('/ehr/getAllPatients', data),

  // Access Control
  grantAccess: (data) => api.post('/ehr/grantAccess', data),
  revokeAccess: (data) => api.post('/ehr/revokeAccess', data),

  // Insurance
  issueInsurance: (data) => api.post('/ehr/issueInsurance', data),
  getPoliciesByPatient: (data) => api.post('/ehr/getPoliciesByPatient', data),

  // Claims
  createClaim: (data) => api.post('/ehr/createClaim', data),
  getClaimInfo: (data) => api.post('/ehr/getClaimInfo', data),
  getAllClaimsByPatient: (data) => api.post('/ehr/getAllClaimsByPatient', data),
  approveClaim: (data) => api.post('/ehr/approveClaim', data),

  // Ledger
  fetchLedger: (data) => api.post('/ehr/fetchLedger', data),
};

// ─── File Upload API ─────────────────────────────────────────────────────────
export const fileAPI = {
  upload: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 min timeout for large uploads
  }),
  getByPatient: (data) => api.post('/files/getByPatient', data),
};

export default api;
