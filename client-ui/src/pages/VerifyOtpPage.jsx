import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtpPage() {
  const { verifyEmail, isAuthenticated, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const intervalRef = useRef(null);

  // Redirect if already authenticated
  if (isAuthenticated) { navigate(getDashboardRoute(), { replace: true }); return null; }

  // Redirect if no email provided
  if (!email) { navigate('/signup', { replace: true }); return null; }

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setToast({ type: 'error', message: 'Please enter a valid 6-digit code.' });
      return;
    }

    setLoading(true);
    try {
      const user = await verifyEmail({ email, otp });
      setToast({ type: 'success', message: 'Email verified successfully!' });
      // Short delay so user sees success toast
      setTimeout(() => {
        const routes = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', insuranceAgent: '/insurance/dashboard', hospitalAdmin: '/admin/dashboard', insuranceAdmin: '/insurance-admin/dashboard' };
        navigate(routes[user.role] || '/');
      }, 800);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Verification failed. Please try again.' });
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await authAPI.resendOtp({ email });
      setToast({ type: 'success', message: 'A new verification code has been sent.' });
      setCooldown(RESEND_COOLDOWN);
      setOtp('');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to resend code.' });
    } finally { setResending(false); }
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center text-xl font-bold">E</div>
            <span className="text-xl font-bold text-white">EHR Blockchain</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-white/40">
            We sent a 6-digit code to <span className="text-primary-400 font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="card space-y-5">
          {/* OTP Input */}
          <div>
            <label className="label">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              className="input-field text-center text-2xl font-mono tracking-[0.5em] py-4"
              placeholder="000000"
              value={otp}
              onChange={handleOtpChange}
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-white/30 mt-2 text-center">Enter the 6-digit code from your email</p>
          </div>

          {/* Verify Button */}
          <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : '✓ Verify Email'}
          </button>

          {/* Resend Section */}
          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-sm text-white/40 mb-2">Didn't receive the code?</p>
            {cooldown > 0 ? (
              <p className="text-sm text-white/30">
                Resend available in <span className="text-primary-400 font-mono font-bold">{cooldown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Verification Code'}
              </button>
            )}
          </div>

          {/* Info */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-white/30 leading-relaxed">
              🔒 The verification code expires in <strong className="text-amber-400">10 minutes</strong>. 
              Check your spam/junk folder if you don't see the email.
            </p>
          </div>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Wrong email? <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">Sign up again</Link>
        </p>
      </div>
    </div>
  );
}
