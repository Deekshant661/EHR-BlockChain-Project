import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SanchayLogo from '../components/SanchayLogo';

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  insuranceAgent: 'Insurance Agent',
  hospitalAdmin: 'Hospital Admin',
  insuranceAdmin: 'Insurance Admin',
};

const ROLE_COLORS = {
  patient: 'from-blue-500 to-cyan-400',
  doctor: 'from-emerald-500 to-teal-400',
  insuranceAgent: 'from-amber-500 to-orange-400',
  hospitalAdmin: 'from-primary-500 to-primary-400',
  insuranceAdmin: 'from-rose-500 to-pink-400',
};

const NAV_ITEMS = {
  patient: [
    { label: 'My Records', icon: 'ClipboardList', section: 'records' },
    { label: 'Upload Files', icon: 'Upload', section: 'upload' },
    { label: 'My Files', icon: 'FolderOpen', section: 'myFiles' },
    { label: 'Access Control', icon: 'Shield', section: 'access' },
    { label: 'Insurance', icon: 'Heart', section: 'insurance' },
  ],
  doctor: [
    { label: 'Patients', icon: 'Users', section: 'patients' },
    { label: 'Add Record', icon: 'FilePlus', section: 'addRecord' },
    { label: 'Upload Files', icon: 'Upload', section: 'upload' },
    { label: 'Patient Files', icon: 'FolderOpen', section: 'patientFiles' },
    { label: 'My Records', icon: 'ClipboardList', section: 'myRecords' },
    { label: 'History', icon: 'History', section: 'history' },
  ],
  insuranceAgent: [
    { label: 'Claims', icon: 'FileText', section: 'claims' },
    { label: 'Issue Policy', icon: 'FilePlus', section: 'issue' },
    { label: 'Policies', icon: 'Shield', section: 'policies' },
  ],
  hospitalAdmin: [
    { label: 'Overview', icon: 'BarChart3', section: 'overview' },
    { label: 'Patients', icon: 'Users', section: 'patients' },
    { label: 'Ledger', icon: 'Link', section: 'ledger' },
  ],
  insuranceAdmin: [
    { label: 'Overview', icon: 'BarChart3', section: 'overview' },
    { label: 'Claims Audit', icon: 'FileText', section: 'claims' },
    { label: 'Ledger', icon: 'Link', section: 'ledger' },
  ],
};

// Simple SVG icons (avoids Lucide dependency issue if not installed yet)
const ICONS = {
  ClipboardList: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Upload: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  FolderOpen: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>,
  Shield: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Heart: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  Users: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  FilePlus: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  FileText: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  History: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  BarChart3: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Link: () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  ChevronDown: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  LogOut: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Menu: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>,
};

function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const gradient = ROLE_COLORS[user?.role] || 'from-primary-500 to-primary-400';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-all duration-200" id="profile-dropdown-toggle">
        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>{initials}</div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white/90 leading-tight">{user?.name}</p>
          <p className="text-[11px] text-white/40">{ROLE_LABELS[user?.role]}</p>
        </div>
        <ICONS.ChevronDown />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl p-2 shadow-2xl shadow-black/40 z-50 animate-fadeIn">
          <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
            <p className="text-[10px] text-primary-400 font-mono mt-1 truncate">{user?.uuid}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all" id="logout-button">
            <ICONS.LogOut />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children, activeSection, onSectionChange }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navItems = NAV_ITEMS[user?.role] || [];

  return (
    <div className="min-h-screen bg-surface-950 flex bg-grid-pattern">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-[68px]'} bg-surface-900/60 backdrop-blur-xl border-r border-white/[0.04] flex flex-col transition-all duration-300 fixed h-full z-30`}>
        {/* Logo */}
        <div className="h-16 px-4 border-b border-white/[0.04] flex items-center gap-2.5">
          <SanchayLogo size={32} clickable={true} />
          {sidebarOpen && <span className="text-sm font-bold text-white tracking-tight">Sanchay</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon] || (() => null);
            const active = activeSection === item.section;
            return (
              <button
                key={item.section}
                onClick={() => onSectionChange?.(item.section)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                  active
                    ? 'bg-primary-600/15 text-primary-300 border border-primary-500/15 shadow-sm shadow-primary-500/5'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80 border border-transparent'
                }`}
                id={`nav-${item.section}`}
              >
                <span className={`flex-shrink-0 transition-colors ${active ? 'text-primary-400' : 'text-white/40 group-hover:text-white/60'}`}>
                  <Icon />
                </span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="h-10 flex items-center justify-center text-white/20 hover:text-white/50 border-t border-white/[0.04] transition-colors" id="sidebar-toggle">
          <svg className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </aside>

      {/* Main */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-60' : 'ml-[68px]'} transition-all duration-300 flex flex-col min-h-screen`}>
        {/* Top Bar */}
        <header className="h-16 bg-surface-900/40 backdrop-blur-xl border-b border-white/[0.04] flex items-center justify-between px-6 sticky top-0 z-20">
          <h1 className="text-base font-bold text-white/90 tracking-tight">{ROLE_LABELS[user?.role]} Dashboard</h1>
          <ProfileDropdown />
        </header>

        {/* Content */}
        <div className="p-6 flex-1 page-enter">
          {children}
        </div>

        {/* Footer */}
        <footer className="h-10 flex items-center justify-center border-t border-white/[0.04]">
          <p className="text-[11px] text-white/20">© 2026 Sanchay</p>
        </footer>
      </main>
    </div>
  );
}
