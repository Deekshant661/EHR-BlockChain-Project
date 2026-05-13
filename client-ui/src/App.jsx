import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import InsuranceDashboard from './pages/InsuranceDashboard';
import HospitalAdminDashboard from './pages/HospitalAdminDashboard';
import InsuranceAdminDashboard from './pages/InsuranceAdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Patient */}
          <Route path="/patient/dashboard" element={
            <ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>
          } />

          {/* Doctor */}
          <Route path="/doctor/dashboard" element={
            <ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>
          } />

          {/* Insurance Agent */}
          <Route path="/insurance/dashboard" element={
            <ProtectedRoute allowedRoles={['insuranceAgent']}><InsuranceDashboard /></ProtectedRoute>
          } />

          {/* Hospital Admin */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['hospitalAdmin']}><HospitalAdminDashboard /></ProtectedRoute>
          } />

          {/* Insurance Admin */}
          <Route path="/insurance-admin/dashboard" element={
            <ProtectedRoute allowedRoles={['insuranceAdmin']}><InsuranceAdminDashboard /></ProtectedRoute>
          } />

          {/* 404 → Landing */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
