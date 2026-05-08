import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

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
      const profileData = {};
      if (form.role === 'doctor') { profileData.hospitalName = form.hospitalName || 'General Hospital'; profileData.city = form.city; }
      if (form.role === 'patient') { profileData.city = form.city; }
      if (form.role === 'insuranceAgent') { profileData.insuranceCompany = form.hospitalName || 'Default Insurance Co'; profileData.city = form.city; }
      profileData.name = form.name;

      const result = await signup({ name: form.name, email: form.email, password: form.password, role: form.role, profileData });

      // Signup now returns requiresVerification — redirect to OTP page
      if (result.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 py-12">
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center text-xl font-bold">E</div>
            <span className="text-xl font-bold text-white">EHR Blockchain</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-white/40">Join the blockchain health network</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input-field" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input-field" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
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

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {loading ? <LoadingSpinner size="sm" /> : 'Create Account & Enroll on Blockchain'}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
