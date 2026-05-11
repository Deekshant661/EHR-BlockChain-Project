import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Toast from '../components/Toast';
import { SanchayBrand } from '../components/SanchayLogo';

const RESEND_COOLDOWN = 60;

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

  if (isAuthenticated) { navigate(getDashboardRoute(), { replace: true }); return null; }
  if (!email) { navigate('/signup', { replace: true }); return null; }

  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((prev) => { if (prev <= 1) { clearInterval(intervalRef.current); return 0; } return prev - 1; });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setToast({ type: 'error', message: 'Please enter a valid 6-digit code.' }); return; }
    setLoading(true);
    try {
      const user = await verifyEmail({ email, otp });
      setToast({ type: 'success', message: 'Email verified successfully!' });
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

  const handleOtpChange = (e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); };

  return (
    <div className="min-h-screen bg-surface-950 bg-grid-pattern flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/8 rounded-full blur-[100px] pointer-events-none" />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-8">
            <SanchayBrand size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Verify Your Email</h1>
          <p className="text-white/35 text-sm">
            We sent a 6-digit code to <span className="text-primary-400 font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="card space-y-5">
          <div>
            <label className="label">Verification Code</label>
            <input type="text" inputMode="numeric" className="input-field text-center text-2xl font-mono tracking-[0.5em] py-4" placeholder="000000" value={otp} onChange={handleOtpChange} maxLength={6} autoFocus id="otp-input" />
            <p className="text-xs text-white/25 mt-2 text-center">Enter the 6-digit code from your email</p>
          </div>

          <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 py-3" id="otp-submit">
            {loading ? <><span className="spinner spinner-sm" /> Verifying...</> : '✓ Verify Email'}
          </button>

          <div className="text-center pt-2 border-t border-white/[0.04]">
            <p className="text-sm text-white/35 mb-2">Didn't receive the code?</p>
            {cooldown > 0 ? (
              <p className="text-sm text-white/25">Resend available in <span className="text-primary-400 font-mono font-bold">{cooldown}s</span></p>
            ) : (
              <button type="button" onClick={handleResend} disabled={resending} className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors disabled:opacity-50">
                {resending ? <><span className="spinner spinner-sm mr-1" /> Sending...</> : 'Resend Verification Code'}
              </button>
            )}
          </div>

          <div className="glass rounded-xl p-3">
            <p className="text-xs text-white/25 leading-relaxed">
              🔒 The verification code expires in <strong className="text-amber-400">10 minutes</strong>. Check your spam/junk folder if you don't see the email.
            </p>
          </div>
        </form>

        <p className="text-center text-sm text-white/35 mt-6">
          Wrong email? <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign up again</Link>
        </p>
      </div>
    </div>
  );
}
