import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Toast from '../components/Toast';
import { SanchayBrand } from '../components/SanchayLogo';

const RESEND_COOLDOWN = 60;

export default function ResetPasswordPage() {
  const { isAuthenticated, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardRoute(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardRoute]);

  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((prev) => { if (prev <= 1) { clearInterval(intervalRef.current); return 0; } return prev - 1; });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [cooldown]);

  const handleOtpChange = (e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordError = confirmPassword && !passwordsMatch ? 'Passwords do not match' : '';
  const passwordTooShort = newPassword && newPassword.length < 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setToast({ type: 'error', message: 'Please enter a valid 6-digit reset code.' }); return; }
    if (!newPassword || newPassword.length < 8) { setToast({ type: 'error', message: 'Password must be at least 8 characters.' }); return; }
    if (newPassword !== confirmPassword) { setToast({ type: 'error', message: 'Passwords do not match.' }); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword });
      setSuccess(true);
      setToast({ type: 'success', message: 'Password reset successfully!' });
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Reset failed. Please try again.' });
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await authAPI.forgotPassword({ email });
      setToast({ type: 'success', message: 'A new reset code has been sent.' });
      setCooldown(RESEND_COOLDOWN);
      setOtp('');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to resend code.' });
    } finally { setResending(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-950 bg-grid-pattern flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="mb-8"><SanchayBrand size={40} /></div>
          <div className="card py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-white/40 text-sm mb-6">Your password has been updated successfully.</p>
            <p className="text-white/25 text-xs">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 bg-grid-pattern flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/8 rounded-full blur-[100px] pointer-events-none" />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-8"><SanchayBrand size={40} /></div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Reset Password</h1>
          <p className="text-white/35 text-sm">
            Enter the code sent to <span className="text-primary-400 font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* OTP Input */}
          <div>
            <label className="label">Reset Code</label>
            <input
              type="text"
              inputMode="numeric"
              className="input-field text-center text-2xl font-mono tracking-[0.5em] py-4"
              placeholder="000000"
              value={otp}
              onChange={handleOtpChange}
              maxLength={6}
              autoFocus
              id="reset-otp"
            />
            <p className="text-xs text-white/25 mt-2 text-center">Enter the 6-digit code from your email</p>
          </div>

          {/* New Password */}
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className={`input-field ${passwordTooShort ? 'border-amber-500/50' : ''}`}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              id="reset-password"
            />
            {passwordTooShort && (
              <p className="text-xs text-amber-400/70 mt-1">Password must be at least 8 characters</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              className={`input-field ${passwordError ? 'border-red-500/50' : confirmPassword && passwordsMatch ? 'border-emerald-500/50' : ''}`}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              id="reset-confirm-password"
            />
            {passwordError && (
              <p className="text-xs text-red-400/70 mt-1">{passwordError}</p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="text-xs text-emerald-400/70 mt-1">✓ Passwords match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || otp.length !== 6 || !passwordsMatch || passwordTooShort}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            id="reset-submit"
          >
            {loading
              ? <><span className="spinner spinner-sm" /> Resetting...</>
              : '🔐 Reset Password'
            }
          </button>

          {/* Resend */}
          <div className="text-center pt-2 border-t border-white/[0.04]">
            <p className="text-sm text-white/35 mb-2">Didn't receive the code?</p>
            {cooldown > 0 ? (
              <p className="text-sm text-white/25">Resend available in <span className="text-primary-400 font-mono font-bold">{cooldown}s</span></p>
            ) : (
              <button type="button" onClick={handleResend} disabled={resending} className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors disabled:opacity-50">
                {resending ? <><span className="spinner spinner-sm mr-1" /> Sending...</> : 'Resend Reset Code'}
              </button>
            )}
          </div>

          <div className="glass rounded-xl p-3">
            <p className="text-xs text-white/25 leading-relaxed">
              🔒 The reset code expires in <strong className="text-amber-400">10 minutes</strong>. Check your spam/junk folder if you don't see the email.
            </p>
          </div>
        </form>

        <p className="text-center text-sm text-white/35 mt-6">
          Wrong email? <Link to="/forgot-password" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Try again</Link>
        </p>
      </div>
    </div>
  );
}
