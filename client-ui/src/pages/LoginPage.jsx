import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function LoginPage() {
  const { login, getDashboardRoute, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) { navigate(getDashboardRoute(), { replace: true }); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });

      // If login returns requiresVerification, redirect to OTP page
      if (result.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }

      // Successful login — result.data has the user
      const user = result.data?.user;
      if (user) {
        const routes = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', insuranceAgent: '/insurance/dashboard', hospitalAdmin: '/admin/dashboard', insuranceAdmin: '/insurance-admin/dashboard' };
        navigate(routes[user.role] || '/');
      }
    } catch (err) {
      // Backend returns 403 for unverified users
      if (err.response?.status === 403 && err.response?.data?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center text-xl font-bold">E</div>
            <span className="text-xl font-bold text-white">EHR Blockchain</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/40">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Don't have an account? <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
