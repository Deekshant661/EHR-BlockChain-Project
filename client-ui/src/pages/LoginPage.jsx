import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { SanchayBrand } from '../components/SanchayLogo';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const { login, getDashboardRoute, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardRoute(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardRoute]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });
      if (result.requiresVerification) { navigate(`/verify-email?email=${encodeURIComponent(form.email)}`); return; }
      navigate(getDashboardRoute(), { replace: true });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requiresVerification) { navigate(`/verify-email?email=${encodeURIComponent(form.email)}`); return; }
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-950 bg-grid-pattern flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/8 rounded-full blur-[100px] pointer-events-none" />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-8">
            <SanchayBrand size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
          <p className="text-white/35 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" id="login-email" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Forgot password?</Link>
            </div>
            <input type="password" className="input-field" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" id="login-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3" id="login-submit">
            {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-white/35 mt-6">
          Don't have an account? <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
