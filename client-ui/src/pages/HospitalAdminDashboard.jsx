import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';

const relativeTime = (ts) => {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 0) return 'just now';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
};

function AnimatedCount({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) { setDisplay(0); return; }
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const id = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

const Shimmer = ({ w = '100%', h = '20px', className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} style={{ width: w, height: h }} />
);
const MetricSkeleton = () => (
  <div className="metric-card"><Shimmer h="16px" w="24px" /><Shimmer h="32px" w="48px" className="mt-2" /><Shimmer h="12px" w="72px" className="mt-1" /></div>
);

const healthColor = (s) => s === 'healthy' ? 'text-emerald-400' : s === 'degraded' ? 'text-amber-400' : 'text-red-400';
const healthDot = (s) => s === 'healthy' ? 'bg-emerald-400' : s === 'degraded' ? 'bg-amber-400' : 'bg-red-400';

export default function HospitalAdminDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [liveActivity, setLiveActivity] = useState([]);
  const pollRef = useRef(null);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, healthRes] = await Promise.all([
          adminAPI.getHospitalAnalytics(),
          adminAPI.getSystemHealth(),
        ]);
        setAnalytics(analyticsRes.data.data);
        setHealth(healthRes.data.data);
        setLiveActivity(analyticsRes.data.data?.recentActivity || []);
      } catch (err) {
        console.error('Analytics load failed:', err);
        setError(err.response?.data?.message || err.message);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // Live activity polling every 12s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await adminAPI.getLiveActivity(15);
        if (res.data?.data) setLiveActivity(res.data.data);
      } catch { /* silent */ }
    };
    pollRef.current = setInterval(poll, 12000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Tab-focus refresh
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) {
        adminAPI.getLiveActivity(15).then(r => {
          if (r.data?.data) setLiveActivity(r.data.data);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Ledger fetch via system account bypass
  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await adminAPI.getLedgerData();
      setLedger(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Ledger fetch failed:', err);
    } finally { setLedgerLoading(false); }
  };

  const m = analytics?.metrics || {};
  const doctorLeaderboard = analytics?.doctorLeaderboard || [];
  const monthlyActivity = analytics?.monthlyActivity || [];
  const docTypes = analytics?.docTypeDistribution || [];
  const maxDoc = Math.max(...doctorLeaderboard.map(d => d.count), 1);
  const maxMonth = Math.max(...monthlyActivity.map(mo => mo.count), 1);

  if (error && !analytics) {
    return (
      <DashboardLayout activeSection={section} onSectionChange={setSection}>
        <div className="glass rounded-2xl border-red-500/20 text-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/10 flex items-center justify-center text-2xl mx-auto mb-4">⚠️</div>
          <p className="text-red-400 text-lg font-semibold mb-2">Analytics Load Failed</p>
          <p className="text-white/30 text-sm mb-6 max-w-md mx-auto">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {section === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Row 1: Core Metrics */}
          {loading ? (
            <div className="grid md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <MetricSkeleton key={i} />)}</div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: '👥', val: m.totalPatients, label: 'Total Patients', glow: 'shadow-blue-500/10' },
                { icon: '🩺', val: m.totalDoctors, label: 'Total Doctors', glow: 'shadow-purple-500/10' },
                { icon: '📋', val: m.totalRecords, label: 'Medical Records', glow: 'shadow-emerald-500/10' },
                { icon: '📁', val: m.totalFiles, label: 'Encrypted Files', glow: 'shadow-amber-500/10' },
              ].map((c, i) => (
                <div key={i} className={`metric-card group hover:scale-[1.01] hover:bg-white/[0.06] transition-all duration-300 ${c.glow}`}>
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{c.icon}</span>
                  <span className="text-3xl font-extrabold text-white tracking-tight"><AnimatedCount value={c.val || 0} /></span>
                  <span className="text-xs text-white/35 font-medium">{c.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Row 2: Insurance Metrics */}
          {!loading && (
            <div className="grid md:grid-cols-5 gap-4">
              {[
                { icon: '🛡️', val: m.totalPolicies, label: 'Policies', color: 'text-blue-400' },
                { icon: '📄', val: m.totalClaims, label: 'Claims', color: 'text-white' },
                { icon: '✅', val: m.approvedClaims, label: 'Approved', color: 'text-emerald-400' },
                { icon: '❌', val: m.rejectedClaims, label: 'Rejected', color: 'text-red-400' },
                { icon: '⏳', val: m.pendingClaims, label: 'Pending', color: 'text-amber-400' },
              ].map((c, i) => (
                <div key={i} className="metric-card group hover:scale-[1.01] hover:bg-white/[0.06] transition-all duration-300">
                  <span className="text-2xl">{c.icon}</span>
                  <span className={`text-3xl font-extrabold tracking-tight ${c.color}`}><AnimatedCount value={c.val || 0} /></span>
                  <span className="text-xs text-white/35 font-medium">{c.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* System Health */}
          {health && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.03) 100%)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title mb-0">System Health</h3>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-emerald-400/70">Live</span></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.values(health).map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300">
                    <div className={`w-2.5 h-2.5 rounded-full ${healthDot(h.status)} ${h.status === 'healthy' ? 'animate-pulse' : ''}`} />
                    <div><p className="text-xs text-white/60">{h.label}</p><p className={`text-xs font-semibold capitalize ${healthColor(h.status)}`}>{h.status}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Doctor Leaderboard */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(99,102,241,0.04) 100%)' }}>
              <h3 className="section-title">Doctor Activity Leaderboard</h3>
              {loading ? <div className="space-y-3">{[1,2,3,4,5].map(i => <Shimmer key={i} h="12px" />)}</div> : (
                <div className="space-y-2.5 mt-3">
                  {doctorLeaderboard.length === 0 ? (
                    <p className="text-sm text-white/20 py-4 text-center">No doctor records found in ledger</p>
                  ) : doctorLeaderboard.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <span className="text-xs font-mono text-primary-400 w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1"><span className="text-white/70 font-medium">{doc.name}</span><span className="text-primary-300 font-semibold">{doc.count} records</span></div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(doc.count / maxDoc) * 100}%`, background: i === 0 ? 'linear-gradient(90deg, #a855f7, #ec4899)' : i === 1 ? 'linear-gradient(90deg, #8b5cf6, #6366f1)' : 'linear-gradient(90deg, #6366f1, #4f46e5)' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Activity */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(59,130,246,0.04) 100%)' }}>
              <h3 className="section-title">Monthly Activity</h3>
              {loading ? <Shimmer h="140px" className="mt-3" /> : (
                <div className="flex items-end gap-3 h-44 mt-3 px-2">
                  {monthlyActivity.length === 0 ? (
                    <p className="text-sm text-white/20 w-full text-center self-center">No timestamped entries in ledger</p>
                  ) : monthlyActivity.map((mo, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-xs text-primary-300 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{mo.count}</span>
                      <div className="w-full rounded-t-xl transition-all duration-700 hover:brightness-125 shadow-lg shadow-primary-500/10" style={{ height: `${Math.max((mo.count / maxMonth) * 100, 8)}%`, background: 'linear-gradient(180deg, #a855f7 0%, #6366f1 50%, #4f46e5 100%)', minHeight: '8px' }} />
                      <span className="text-xs text-white/40 font-medium">{mo.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Claims Distribution Bar */}
          {(m.totalClaims > 0) && (
            <div className="card">
              <h3 className="section-title">Claims Distribution</h3>
              <div className="flex h-7 rounded-full overflow-hidden mt-3 bg-white/5">
                {m.approvedClaims > 0 && <div className="bg-emerald-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-700" style={{ width: `${(m.approvedClaims / m.totalClaims) * 100}%` }}>{Math.round((m.approvedClaims / m.totalClaims) * 100)}%</div>}
                {m.rejectedClaims > 0 && <div className="bg-red-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-700" style={{ width: `${(m.rejectedClaims / m.totalClaims) * 100}%` }}>{Math.round((m.rejectedClaims / m.totalClaims) * 100)}%</div>}
                {m.pendingClaims > 0 && <div className="bg-amber-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-700" style={{ width: `${(m.pendingClaims / m.totalClaims) * 100}%` }}>{Math.round((m.pendingClaims / m.totalClaims) * 100)}%</div>}
              </div>
              <div className="flex gap-5 mt-2 text-xs text-white/50">
                <span><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500 mr-1.5" />Approved ({m.approvedClaims})</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded bg-red-500 mr-1.5" />Rejected ({m.rejectedClaims})</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber-500 mr-1.5" />Pending ({m.pendingClaims})</span>
              </div>
            </div>
          )}

          {/* Doc Type Distribution */}
          {docTypes.length > 0 && (
            <div className="card">
              <h3 className="section-title">Ledger Document Types</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                {docTypes.slice(0, 12).map((dt, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <span className="text-xs text-white/50 font-mono">{dt.type}</span>
                    <span className="text-xs font-bold text-primary-300">{dt.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational Summary + Live Activity */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card">
              <h3 className="section-title">Operational Summary</h3>
              <div className="space-y-2 mt-3">
                {[
                  { label: 'Insurance Agents', value: m.insuranceAgents || 0, icon: '🏢', color: 'text-purple-400' },
                  { label: 'Consent Grants', value: m.totalConsents || 0, icon: '✋', color: 'text-green-400' },
                  { label: 'Revocations', value: m.totalRevocations || 0, icon: '🚫', color: 'text-red-400' },
                  { label: 'Ledger Entries', value: m.ledgerEntries || 0, icon: '⛓️', color: 'text-primary-400' },
                  { label: 'Audit Events', value: m.auditLogCount || 0, icon: '📝', color: 'text-amber-400' },
                  { label: 'Total Users', value: m.totalUsers || 0, icon: '👤', color: 'text-blue-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-200">
                    <div className="flex items-center gap-2.5"><span>{item.icon}</span><span className="text-sm text-white/60">{item.label}</span></div>
                    <span className={`text-sm font-bold ${item.color}`}><AnimatedCount value={item.value} /></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title mb-0">Recent Activity</h3>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-white/30">Auto-refresh 12s</span></div>
              </div>
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                {liveActivity.length === 0 ? (
                  <div className="text-center py-8"><p className="text-sm text-white/20">{loading ? 'Loading activity...' : 'No recent activity events'}</p></div>
                ) : liveActivity.map((event, i) => (
                  <div key={event.id || i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <span className="text-sm flex-shrink-0 mt-0.5">{event.severityIcon || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 leading-snug">{event.description}</p>
                      <p className="text-xs text-white/25 mt-0.5">{relativeTime(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(m.syntheticCount > 0) && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 inline-flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 font-medium">Demo</span>
              <span>{m.syntheticCount} synthetic users seeded for demonstration</span>
            </div>
          )}
        </div>
      )}

      {section === 'patients' && <PatientsSection />}

      {section === 'ledger' && (
        <LedgerSection ledger={ledger} loading={ledgerLoading} onFetch={fetchLedger} />
      )}
    </DashboardLayout>
  );
}

function PatientsSection() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Use the ledger via admin API to get patients
    adminAPI.getLedgerData().then(res => {
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setPatients(data.filter(e => e._type === 'patient'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div>
      <h3 className="section-title">Patient Directory {patients.length > 0 && `(${patients.length})`}</h3>
      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Shimmer key={i} h="40px" />)}</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="table-header">Patient ID</th><th className="table-header">Name</th><th className="table-header">City</th><th className="table-header">Status</th></tr></thead>
            <tbody>{patients.map((entry, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                  <td className="table-cell font-mono text-xs text-primary-400">{(entry.patientId || '-').slice(0, 16)}...</td>
                  <td className="table-cell font-medium">{entry.name || '-'}</td>
                  <td className="table-cell text-white/35">{entry.city || '-'}</td>
                  <td className="table-cell"><span className="badge-green">Active</span></td>
                </tr>
            ))}{patients.length === 0 && <tr><td colSpan="4" className="table-cell text-center text-white/25">No patients found</td></tr>}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LedgerSection({ ledger, loading, onFetch }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title mb-0">Full Ledger {ledger.length > 0 && `(${ledger.length} entries)`}</h3>
        <button onClick={onFetch} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">{loading ? <><span className="spinner spinner-sm" /> Loading...</> : '⛓️ Load Ledger'}</button>
      </div>
      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Shimmer key={i} h="40px" />)}</div> : (
        ledger.length === 0 ? (
          <div className="glass rounded-2xl text-center py-16"><div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl mx-auto mb-4">⛓️</div><p className="text-sm text-white/30">Click "Load Ledger" to fetch blockchain data</p><p className="text-xs text-white/15 mt-1">Data is fetched via hospital system account</p></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header">Type</th><th className="table-header">ID</th><th className="table-header">Status</th><th className="table-header">Data</th></tr></thead>
              <tbody>{ledger.slice(0, 100).map((entry, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                  <td className="table-cell"><span className="badge-purple">{entry._type || 'unknown'}</span></td>
                  <td className="table-cell font-mono text-xs text-primary-400 max-w-[140px] truncate">{entry.patientId || entry.doctorId || entry.claimId || entry.policyId || entry.agentId || '-'}</td>
                  <td className="table-cell"><span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${(entry.status || '').toUpperCase() === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : (entry.status || '').toUpperCase() === 'REJECTED' ? 'bg-red-500/20 text-red-300' : (entry.status || '').toUpperCase() === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{entry.status || 'N/A'}</span></td>
                  <td className="table-cell"><pre className="text-xs text-white/40 max-w-lg overflow-x-auto whitespace-pre-wrap">{JSON.stringify(entry, null, 1)}</pre></td>
                </tr>
              ))}</tbody>
            </table>
            {ledger.length > 100 && <p className="text-xs text-white/30 mt-2 px-3">Showing first 100 of {ledger.length} entries</p>}
          </div>
        )
      )}
    </div>
  );
}
