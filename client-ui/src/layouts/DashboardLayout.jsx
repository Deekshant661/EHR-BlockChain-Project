import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  insuranceAgent: 'Insurance Agent',
  hospitalAdmin: 'Hospital Admin',
  insuranceAdmin: 'Insurance Admin',
};

const NAV_ITEMS = {
  patient: [
    { label: 'My Records', icon: '📋', section: 'records' },
    { label: 'Upload Files', icon: '📤', section: 'upload' },
    { label: 'Access Control', icon: '🔐', section: 'access' },
    { label: 'Insurance', icon: '🛡️', section: 'insurance' },
  ],
  doctor: [
    { label: 'Patients', icon: '👥', section: 'patients' },
    { label: 'Add Record', icon: '➕', section: 'addRecord' },
    { label: 'Upload Files', icon: '📤', section: 'upload' },
    { label: 'My Records', icon: '📋', section: 'myRecords' },
    { label: 'History', icon: '🔍', section: 'history' },
  ],
  insuranceAgent: [
    { label: 'Claims', icon: '📄', section: 'claims' },
    { label: 'Issue Policy', icon: '📝', section: 'issue' },
    { label: 'Policies', icon: '🛡️', section: 'policies' },
  ],
  hospitalAdmin: [
    { label: 'Overview', icon: '📊', section: 'overview' },
    { label: 'Patients', icon: '👥', section: 'patients' },
    { label: 'Ledger', icon: '⛓️', section: 'ledger' },
  ],
  insuranceAdmin: [
    { label: 'Overview', icon: '📊', section: 'overview' },
    { label: 'Claims Audit', icon: '📄', section: 'claims' },
    { label: 'Ledger', icon: '⛓️', section: 'ledger' },
  ],
};

export default function DashboardLayout({ children, activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = NAV_ITEMS[user?.role] || [];

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-surface-900 border-r border-white/5 flex flex-col transition-all duration-300 fixed h-full z-30`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <div className="h-9 w-9 bg-primary-600 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">E</div>
          {sidebarOpen && <span className="text-sm font-bold text-white">EHR Blockchain</span>}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.section}
              onClick={() => onSectionChange?.(item.section)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                activeSection === item.section
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/20'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Info + Logout */}
        <div className="p-3 border-t border-white/5">
          {sidebarOpen && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/40">{ROLE_LABELS[user?.role]}</p>
              <p className="text-xs text-primary-400 font-mono mt-0.5 truncate">{user?.uuid?.slice(0, 12)}...</p>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-white/30 hover:text-white/60 border-t border-white/5 text-xs">
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="h-16 bg-surface-900/50 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
          <h1 className="text-lg font-bold text-white">{ROLE_LABELS[user?.role]} Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="badge-purple">{user?.role}</span>
            <span className="text-sm text-white/40">{user?.email}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
