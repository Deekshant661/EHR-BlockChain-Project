import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const ROLE_ROUTES = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  insuranceAgent: '/insurance/dashboard',
  hospitalAdmin: '/admin/dashboard',
  insuranceAdmin: '/insurance-admin/dashboard',
};

// ─── Role Normalization ──────────────────────────────────────────────────────
// The Fabric identity model uses short role names (e.g. 'hospital').
// The frontend UI uses descriptive names (e.g. 'hospitalAdmin').
// This function bridges the two without modifying backend/Fabric data.
const ROLE_MAP = { hospital: 'hospitalAdmin' };
const normalizeRole = (role) => ROLE_MAP[role] || role;

const normalizeUser = (user) => {
  if (!user) return user;
  return { ...user, role: normalizeRole(user.role) };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ehr_token');
    const savedUser = localStorage.getItem('ehr_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(normalizeUser(JSON.parse(savedUser)));
      } catch {
        localStorage.removeItem('ehr_token');
        localStorage.removeItem('ehr_user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Signup — no longer stores JWT. Returns response data
   * which includes requiresVerification flag.
   */
  const signup = async ({ name, email, password, role, profileData }) => {
    const res = await authAPI.signup({ name, email, password, role, profileData });
    // Signup now returns { requiresVerification, email, message } — no token
    return res.data;
  };

  /**
   * Login — stores JWT only if login succeeds (verified user).
   * Returns the response data for the caller to check requiresVerification.
   */
  const login = async ({ email, password }) => {
    const res = await authAPI.login({ email, password });
    const data = res.data;

    // If user is unverified, backend returns 403 which triggers catch in caller.
    // But if it somehow passes through:
    if (data.requiresVerification) {
      return data;
    }

    const { token: newToken, user: newUser } = data.data;
    const normalized = normalizeUser(newUser);
    localStorage.setItem('ehr_token', newToken);
    localStorage.setItem('ehr_user', JSON.stringify(normalized));
    setToken(newToken);
    setUser(normalized);
    return data;
  };

  /**
   * Verify email with OTP — stores JWT on success.
   */
  const verifyEmail = async ({ email, otp }) => {
    const res = await authAPI.verifyEmail({ email, otp });
    const { token: newToken, user: newUser } = res.data.data;
    const normalized = normalizeUser(newUser);
    localStorage.setItem('ehr_token', newToken);
    localStorage.setItem('ehr_user', JSON.stringify(normalized));
    setToken(newToken);
    setUser(normalized);
    return normalized;
  };

  const logout = () => {
    localStorage.removeItem('ehr_token');
    localStorage.removeItem('ehr_user');
    setToken(null);
    setUser(null);
  };

  const getDashboardRoute = () => {
    if (!user) return '/login';
    return ROLE_ROUTES[user.role] || '/login';
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    signup,
    login,
    verifyEmail,
    logout,
    getDashboardRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { ROLE_ROUTES };
