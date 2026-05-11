import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import SanchayLogo from '../components/SanchayLogo';

const NAV_LINKS = ['Home', 'Features', 'About', 'Contact'];

const PILLS = [
  { icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>, text: 'Blockchain Secured' },
  { icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, text: 'Patient Controlled' },
  { icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, text: 'End-to-End Encrypted' },
  { icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, text: 'Audit & Traceable' },
];

const FEATURES = [
  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>, title: 'Blockchain-Secured', desc: 'All medical records are immutably stored on Hyperledger Fabric distributed ledger, ensuring tamper-proof integrity.' },
  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: 'Patient-Controlled Access', desc: 'Patients can grant or revoke access to their records via smart contracts, ensuring full ownership and privacy.' },
  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, title: 'Insurance Integration', desc: 'End-to-end insurance policy issuance, claims filing, and approval workflows executed securely on-chain.' },
  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, title: 'Multi-Org Architecture', desc: 'Hospitals (Org1) and insurance providers (Org2) operate on separate Fabric peers for data isolation and governance.' },
  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>, title: 'JWT + Fabric Identity', desc: 'Application-layer JWT authentication combined with X.509 Fabric CA identities for robust security.' },
  { icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, title: 'Audit Trail', desc: 'Every transaction, access, and update is recorded on-chain, ensuring full traceability and compliance.' },
];

/* ── Glowing Hero Visual (left column) ───────────────────────── */
function HeroVisual() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[380px] h-[380px] rounded-full bg-purple-600/10 blur-[80px]" />
      </div>
      {/* Platform layers */}
      <div className="relative">
        {/* Bottom platform */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[280px] h-[60px] rounded-[50%] bg-gradient-to-t from-purple-900/40 to-transparent blur-sm" />
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[220px] h-[40px] rounded-[50%] bg-gradient-to-t from-purple-600/20 to-transparent" />
        {/* Main shield */}
        <div className="relative drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
          <SanchayLogo size={200} clickable={false} />
        </div>
        {/* Floating elements */}
        <div className="absolute -top-4 -right-6 w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm flex items-center justify-center animate-float">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="absolute -bottom-2 -left-8 w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm flex items-center justify-center animate-float" style={{ animationDelay: '2s' }}>
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg>
        </div>
        <div className="absolute top-1/3 -left-10 w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/15 backdrop-blur-sm flex items-center justify-center animate-float" style={{ animationDelay: '4s' }}>
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, getDashboardRoute, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState('Home');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  useEffect(() => setMounted(true), []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavClick = (link) => {
    setActiveNav(link);
    if (link === 'Home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (link === 'Features') scrollTo('features');
    else if (link === 'About') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (link === 'Contact') scrollTo('contact');
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'GU';

  return (
    <div className="min-h-screen bg-[#0b0c10] overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_70%)]" />
      </div>

      {/* ─── Navbar ──────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0b0c10]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2.5">
            <SanchayLogo size={34} clickable={false} />
            <span className="text-[15px] font-bold text-white leading-tight tracking-tight">Sanchay</span>
          </div>

          {/* Center: Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <button key={link} onClick={() => handleNavClick(link)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeNav === link ? 'bg-purple-500/15 text-purple-300' : 'text-white/50 hover:text-white/80'}`}>
                {link}
              </button>
            ))}
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to={getDashboardRoute()} className="btn-primary text-sm px-5" id="nav-dashboard">Dashboard</Link>
                <div className="relative" ref={profileRef}>
                  <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 pl-3 border-l border-white/[0.06] hover:opacity-90 transition-opacity">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
                    <div className="hidden lg:block text-right">
                      <p className="text-xs text-white/60 leading-tight">Welcome</p>
                      <p className="text-xs font-medium text-white/90 leading-tight">{user?.name || 'User'}</p>
                    </div>
                    <svg className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#151622] border border-white/[0.08] shadow-2xl shadow-black/50 p-2 animate-fadeIn z-50">
                      <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                        <p className="text-sm font-medium text-white">{user?.name}</p>
                        <p className="text-xs text-white/40 truncate">{user?.email}</p>
                        <p className="text-[10px] text-purple-400 font-mono mt-1 truncate">{user?.uuid}</p>
                      </div>
                      <Link to={getDashboardRoute()} onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.05] rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6" /></svg>
                        Dashboard
                      </Link>
                      <button onClick={() => { logout(); navigate('/'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-secondary text-sm" id="nav-login">Sign In</Link>
                <Link to="/signup" className="btn-primary text-sm" id="nav-signup">Get Started</Link>
                <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
                  <div className="h-8 w-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-white/40 leading-tight">Welcome</p>
                    <p className="text-xs font-medium text-white/50 leading-tight">Guest User</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-6">
        <div className={`max-w-7xl mx-auto grid md:grid-cols-2 items-center gap-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Left: Visual */}
          <div className="hidden md:flex justify-center">
            <HeroVisual />
          </div>

          {/* Right: Content */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse2" />
              <span className="text-[11px] font-medium text-purple-300 tracking-wide">Powered by Hyperledger Fabric</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] mb-2 tracking-tight">
              <span className="text-white">Unbreakable Health Records</span>
            </h1>
            <p className="text-2xl md:text-3xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Powered by Sanchay</span>
            </p>

            <p className="text-[15px] text-gray-400 mb-4 leading-relaxed max-w-xl">
              Secure. Transparent. Decentralized.
            </p>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xl">
              An enterprise-grade Electronic Health Record platform built on Hyperledger Fabric.
              Featuring <span className="text-gray-300 font-medium">AES-256-GCM encryption</span>,{' '}
              <span className="text-gray-300 font-medium">IPFS decentralized storage</span>,{' '}
              <span className="text-gray-300 font-medium">zero-trust patient access</span>, and{' '}
              <span className="text-gray-300 font-medium">automated insurance workflows</span>.
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 mb-8">
              {isAuthenticated ? (
                <Link to={getDashboardRoute()} className="btn-primary text-sm px-8 py-3 flex items-center gap-2" id="hero-dashboard">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-primary text-sm px-8 py-3 flex items-center gap-2" id="hero-signup">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    Create Account
                  </Link>
                  <Link to="/login" className="btn-secondary text-sm px-8 py-3 flex items-center gap-2" id="hero-login">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2">
              {PILLS.map((pill, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] text-[11px] text-white/50 font-medium hover:border-purple-500/20 hover:text-white/70 transition-all duration-300">
                  <span className="text-purple-400">{pill.icon}</span>
                  {pill.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section className="relative py-24 px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">
              <span className="text-white">Architecture & </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Features</span>
            </h2>
            <p className="text-white/30 max-w-lg mx-auto text-sm">Built with enterprise-grade security and decentralized trust</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className={`group p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] hover:border-purple-500/25 hover:bg-white/[0.05] hover:scale-[1.02] transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${300 + i * 80}ms` }}>
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/15 group-hover:border-purple-500/20 transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-2 tracking-tight">{f.title}</h3>
                <p className="text-[13px] text-white/35 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ─────────────────────────────────────────── */}
      <section className="relative py-20 px-6" id="contact">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">
              <span className="text-white">Get in </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Touch</span>
            </h2>
            <p className="text-white/30 text-sm">Have questions? Reach out to the team behind Sanchay</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] hover:border-purple-500/25 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white">DT</div>
                <div>
                  <p className="text-sm font-bold text-white">Deekshant Tilwani</p>
                  <p className="text-xs text-white/40">Co-Developer</p>
                </div>
              </div>
              <a href="mailto:deekshant661@gmail.com" className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                deekshant661@gmail.com
              </a>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] hover:border-purple-500/25 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-white">PR</div>
                <div>
                  <p className="text-sm font-bold text-white">Prateek Ray</p>
                  <p className="text-xs text-white/40">Co-Developer</p>
                </div>
              </div>
              <a href="mailto:prateekray28@gmail.com" className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                prateekray28@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-white/30 mb-1">
            © 2026 <span className="text-purple-400 font-medium">Sanchay</span>. All rights reserved.
          </p>
          <p className="text-xs text-white/15">
            Built with Hyperledger Fabric & React
          </p>
        </div>
      </footer>
    </div>
  );
}
