import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { SanchayBrand } from '../components/SanchayLogo';

const ROLES = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'insuranceAgent', label: 'Insurance Agent' },
];

export default function SignupPage() {
  const { signup, isAuthenticated, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', hospitalName: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) { navigate(getDashboardRoute(), { replace: true }); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.role) { setError('Please fill in all required fields.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const profileData = { name: form.name };
      if (form.role === 'doctor') { profileData.hospitalName = form.hospitalName || 'General Hospital'; profileData.city = form.city; }
      if (form.role === 'patient') { profileData.city = form.city; }
      if (form.role === 'insuranceAgent') { profileData.insuranceCompany = form.hospitalName || 'Default Insurance Co'; profileData.city = form.city; }

      const result = await signup({ name: form.name, email: form.email, password: form.password, role: form.role, profileData });
      if (result.requiresVerification) { navigate(`/verify-email?email=${encodeURIComponent(form.email)}`); return; }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-950 bg-grid-pattern flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/8 rounded-full blur-[100px] pointer-events-none" />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-8">
            <SanchayBrand size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create your account</h1>
          <p className="text-white/35 text-sm">Join the blockchain health network</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input-field" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="signup-name" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} id="signup-email" />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input-field" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} id="signup-password" />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} id="signup-role">
              <option value="">Select role...</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {form.role === 'doctor' && (
            <div>
              <label className="label">Hospital Name</label>
              <input type="text" className="input-field" placeholder="Hospital01-ABC" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} />
            </div>
          )}
          {form.role === 'insuranceAgent' && (
            <div>
              <label className="label">Insurance Company</label>
              <input type="text" className="input-field" placeholder="Insurance Co" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} />
            </div>
          )}
          {(form.role === 'patient' || form.role === 'doctor') && (
            <div>
              <label className="label">City</label>
              <input type="text" className="input-field" placeholder="Mumbai" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3" id="signup-submit">
            {loading ? <><span className="spinner spinner-sm" /> Creating Account...</> : 'Create Account & Enroll on Blockchain'}
          </button>
        </form>

        <p className="text-center text-sm text-white/35 mt-6">
          Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
