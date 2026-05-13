import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Toast from '../components/Toast';
import { SanchayBrand } from '../components/SanchayLogo';

export default function ForgotPasswordPage() {
  const { isAuthenticated, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardRoute(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardRoute]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setToast({ type: 'error', message: 'Please enter your email address.' }); return; }
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      setCooldown(60);
      setToast({ type: 'success', message: 'If an account exists, a reset code has been sent.' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally { setLoading(false); }
  };

  const handleContinue = () => {
    navigate(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen bg-surface-950 bg-grid-pattern flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/8 rounded-full blur-[100px] pointer-events-none" />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-8">
            <SanchayBrand size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Forgot Password</h1>
          <p className="text-white/35 text-sm">
            {sent
              ? <>We sent a reset code to <span className="text-primary-400 font-medium">{email}</span></>
              : 'Enter your email to receive a password reset code'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={sent}
              id="forgot-email"
            />
          </div>

          {!sent ? (
            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              id="forgot-submit"
            >
              {loading
                ? <><span className="spinner spinner-sm" /> Sending...</>
                : '📧 Send Reset Code'
              }
            </button>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleContinue}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                id="forgot-continue"
              >
                ✓ Enter Reset Code
              </button>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed py-2"
              >
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : loading ? 'Sending...' : 'Resend Reset Code'
                }
              </button>
            </div>
          )}

          {sent && (
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-white/25 leading-relaxed">
                🔒 The reset code expires in <strong className="text-amber-400">10 minutes</strong>. Check your spam/junk folder if you don't see the email.
              </p>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-white/35 mt-6">
          Remember your password? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
