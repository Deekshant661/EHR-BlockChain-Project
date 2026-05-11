import { useState, useEffect } from 'react';
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

export default function InsuranceAdminDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [liveActivity, setLiveActivity] = useState([]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, healthRes] = await Promise.all([
          adminAPI.getInsuranceAnalytics(),
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
    const id = setInterval(poll, 12000);
    return () => clearInterval(id);
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

  const m = analytics?.metrics || {};
  const policyTypes = analytics?.policyTypeBreakdown || [];
  const topClaimants = analytics?.topClaimants || [];
  const claimTimeline = analytics?.claimTimeline || [];
  const recentDecisions = analytics?.recentDecisions || [];
  const maxClaimant = Math.max(...topClaimants.map(c => c.count), 1);
  const maxTimeline = Math.max(...claimTimeline.map(t => t.count), 1);
  const maxPolicy = Math.max(...policyTypes.map(p => p.count), 1);
  const approvalRate = m.approvalRate || 0;
  const r = 44, cx = 50, cy = 50, stroke = 8;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (approvalRate / 100) * circumference;

  if (error && !analytics) {
    return (
      <DashboardLayout activeSection={section} onSectionChange={setSection}>
        <div className="card border-red-500/30 text-center py-12">
          <p className="text-red-400 text-lg font-semibold mb-2">⚠️ Analytics Load Failed</p>
          <p className="text-white/40 text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection}>
      {section === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metrics Row */}
          {loading ? (
            <div className="grid md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <MetricSkeleton key={i} />)}</div>
          ) : (
            <div className="grid md:grid-cols-5 gap-4">
              {[
                { icon: '🛡️', val: m.totalPolicies, label: 'Policies', color: 'text-blue-400', glow: 'shadow-blue-500/10' },
                { icon: '📄', val: m.totalClaims, label: 'Total Claims', color: 'text-white', glow: 'shadow-purple-500/10' },
                { icon: '✅', val: m.approved, label: 'Approved', color: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
                { icon: '❌', val: m.rejected, label: 'Rejected', color: 'text-red-400', glow: 'shadow-red-500/10' },
                { icon: '⏳', val: m.pending, label: 'Pending', color: 'text-amber-400', glow: 'shadow-amber-500/10' },
              ].map((c, i) => (
                <div key={i} className={`metric-card group hover:scale-[1.02] hover:bg-white/[0.08] transition-all duration-300 shadow-lg ${c.glow}`}>
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{c.icon}</span>
                  <span className={`text-3xl font-bold ${c.color}`}><AnimatedCount value={c.val || 0} /></span>
                  <span className="text-sm text-white/40">{c.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* System Health */}
          {health && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(59,130,246,0.03) 100%)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title mb-0">System Health</h3>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-emerald-400/70">Live</span></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.values(health).map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div className={`w-2.5 h-2.5 rounded-full ${healthDot(h.status)} ${h.status === 'healthy' ? 'animate-pulse' : ''}`} />
                    <div><p className="text-xs text-white/60">{h.label}</p><p className={`text-xs font-semibold capitalize ${healthColor(h.status)}`}>{h.status}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Rate + Coverage + Claims Status */}
          {!loading && (
            <div className="grid md:grid-cols-3 gap-5">
              {/* Approval Rate Donut */}
              <div className="card flex flex-col items-center justify-center py-6" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(34,197,94,0.05) 100%)' }}>
                <h3 className="section-title self-start">Approval Rate</h3>
                <div className="relative mt-3">
                  <svg width="130" height="130" viewBox="0 0 100 100">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#insGrad)" strokeWidth={stroke}
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    <defs><linearGradient id="insGrad"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#22c55e" /></linearGradient></defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white"><AnimatedCount value={approvalRate} />%</span>
                    <span className="text-xs text-white/40">approved</span>
                  </div>
                </div>
              </div>

              {/* Total Coverage */}
              <div className="card flex flex-col justify-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.04) 0%, rgba(59,130,246,0.04) 100%)' }}>
                <h3 className="section-title">Total Coverage</h3>
                <span className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mt-3">
                  ₹{(m.totalCoverage || 0).toLocaleString('en-IN')}
                </span>
                <p className="text-sm text-white/40 mt-1">across {m.totalPolicies || 0} active policies</p>
                <p className="text-xs text-white/25 mt-0.5">{m.auditLogCount || 0} audit events tracked</p>
              </div>

              {/* Claims Status Bars */}
              <div className="card">
                <h3 className="section-title">Claims Status</h3>
                <div className="space-y-3 mt-3">
                  {[
                    { label: 'Approved', val: m.approved || 0, total: m.totalClaims || 1, color: 'bg-emerald-500' },
                    { label: 'Rejected', val: m.rejected || 0, total: m.totalClaims || 1, color: 'bg-red-500' },
                    { label: 'Pending', val: m.pending || 0, total: m.totalClaims || 1, color: 'bg-amber-500' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-white/60">{s.label}</span><span className="text-white/40 font-medium">{s.val} ({Math.round((s.val / s.total) * 100)}%)</span></div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max((s.val / s.total) * 100, 2)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Policy Breakdown + Claims Timeline */}
          {!loading && (
            <div className="grid md:grid-cols-2 gap-5">
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(139,92,246,0.04) 100%)' }}>
                <h3 className="section-title">Policy Type Breakdown</h3>
                <div className="space-y-2.5 mt-3">
                  {policyTypes.length === 0 ? (
                    <p className="text-sm text-white/20 py-4 text-center">No policy data available</p>
                  ) : policyTypes.map((pt, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-white/60 font-medium">{pt.type}</span><span className="text-blue-300 font-semibold">{pt.count}</span></div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(pt.count / maxPolicy) * 100}%`, background: ['linear-gradient(90deg, #3b82f6, #60a5fa)', 'linear-gradient(90deg, #8b5cf6, #a78bfa)', 'linear-gradient(90deg, #f59e0b, #fbbf24)', 'linear-gradient(90deg, #ef4444, #f87171)', 'linear-gradient(90deg, #10b981, #34d399)'][i % 5] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(59,130,246,0.04) 100%)' }}>
                <h3 className="section-title">Claims Activity Timeline</h3>
                <div className="flex items-end gap-3 h-44 mt-3 px-2">
                  {claimTimeline.length === 0 ? (
                    <p className="text-sm text-white/20 w-full text-center self-center">No timeline data available</p>
                  ) : claimTimeline.map((mo, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-xs text-blue-300 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{mo.count}</span>
                      <div className="w-full rounded-t-xl transition-all duration-700 hover:brightness-125 shadow-lg shadow-blue-500/10" style={{ height: `${Math.max((mo.count / maxTimeline) * 100, 8)}%`, background: 'linear-gradient(180deg, #3b82f6 0%, #6366f1 50%, #4f46e5 100%)', minHeight: '8px' }} />
                      <span className="text-xs text-white/40 font-medium">{mo.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Claimants + Recent Decisions */}
          {!loading && (
            <div className="grid md:grid-cols-2 gap-5">
              <div className="card">
                <h3 className="section-title">Top Claimants</h3>
                <div className="space-y-2.5 mt-3">
                  {topClaimants.length === 0 ? (
                    <p className="text-sm text-white/20 py-4 text-center">No claimant data available</p>
                  ) : topClaimants.map((cl, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-blue-400 w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1"><span className="text-white/70 font-medium">{cl.name}</span><span className="text-blue-300 font-semibold">{cl.count} claims</span></div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cl.count / maxClaimant) * 100}%`, background: i < 3 ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : '#6366f1' }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="section-title">Recent Decisions</h3>
                <div className="space-y-1.5 mt-3 max-h-[280px] overflow-y-auto">
                  {recentDecisions.length === 0 ? (
                    <p className="text-sm text-white/20 py-4 text-center">No claim decisions yet</p>
                  ) : recentDecisions.map((dec, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${dec.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{dec.status}</span>
                          <span className="text-xs text-white/50 truncate">{dec.patientName}</span>
                        </div>
                        {dec.reason && <p className="text-xs text-white/30 mt-0.5 truncate">{dec.reason}</p>}
                      </div>
                      {dec.amount && <span className="text-xs font-semibold text-blue-300 flex-shrink-0 ml-2">₹{Number(dec.amount).toLocaleString('en-IN')}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">Operational Activity Feed</h3>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-white/30">Auto-refresh 12s</span></div>
            </div>
            <div className="space-y-1 mt-3 max-h-[320px] overflow-y-auto pr-1">
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
      )}

      {section === 'claims' && <ClaimsSection />}

      {section === 'ledger' && <LedgerSection />}
    </DashboardLayout>
  );
}

/* ─── Claims Audit Section ──────────────────────────────────────────────────── */
function ClaimsSection() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getLedgerData().then(res => {
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setClaims(data.filter(e => e._type === 'claim'));
    }).catch(err => {
      console.error('Claims fetch failed:', err);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fadeIn">
      <h3 className="section-title">Claims Audit {claims.length > 0 && `(${claims.length} claims)`}</h3>
      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Shimmer key={i} h="40px" />)}</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="table-header">Claim ID</th><th className="table-header">Patient</th><th className="table-header">Amount</th><th className="table-header">Status</th><th className="table-header">Description</th></tr></thead>
            <tbody>{claims.map((entry, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="table-cell font-mono text-xs text-primary-400 max-w-[140px] truncate">{entry.claimId || '-'}</td>
                  <td className="table-cell text-xs text-white/50 max-w-[120px] truncate">{entry.patientId || '-'}</td>
                  <td className="table-cell text-blue-300 font-medium">₹{Number(entry.claimAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="table-cell"><span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${(entry.status || '').toUpperCase() === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : (entry.status || '').toUpperCase() === 'REJECTED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{entry.status || 'PENDING'}</span></td>
                  <td className="table-cell text-xs text-white/30 max-w-xs truncate">{entry.description || entry.statusReason || '-'}</td>
                </tr>
            ))}{claims.length === 0 && <tr><td colSpan="5" className="table-cell text-center text-white/30">No claims found on ledger</td></tr>}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Ledger Viewer Section ─────────────────────────────────────────────────── */
function LedgerSection() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getLedgerData();
      setLedger(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Ledger fetch failed:', err);
    } finally { setLoading(false); }
  };

  // Filter to insurance-relevant entries using _type
  const filtered = ledger.filter(e => ['insuranceAgent', 'policy', 'claim'].includes(e._type));

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title mb-0">Insurance Ledger {filtered.length > 0 && `(${filtered.length} entries)`}</h3>
        <button onClick={fetchLedger} disabled={loading} className="btn-secondary text-sm">{loading ? '⏳ Loading...' : '⛓️ Load Ledger'}</button>
      </div>
      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Shimmer key={i} h="40px" />)}</div> : (
        ledger.length === 0 ? (
          <div className="card text-center py-12"><p className="text-white/30">Click "Load Ledger" to fetch blockchain data</p><p className="text-xs text-white/15 mt-1">Data is fetched securely via hospital system account</p></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header">Type</th><th className="table-header">ID</th><th className="table-header">Status</th><th className="table-header">Data</th></tr></thead>
              <tbody>{filtered.slice(0, 50).map((entry, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="table-cell"><span className="badge-purple">{entry._type || 'unknown'}</span></td>
                    <td className="table-cell font-mono text-xs text-primary-400 max-w-[140px] truncate">{entry.claimId || entry.policyId || entry.agentId || '-'}</td>
                    <td className="table-cell"><span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${(entry.status || '').toUpperCase() === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : (entry.status || '').toUpperCase() === 'REJECTED' ? 'bg-red-500/20 text-red-300' : (entry.status || '').toUpperCase() === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{entry.status || 'active'}</span></td>
                    <td className="table-cell"><pre className="text-xs text-white/40 max-w-md overflow-x-auto whitespace-pre-wrap">{JSON.stringify(entry, null, 1)}</pre></td>
                  </tr>
              ))}</tbody>
            </table>
            {filtered.length > 50 && <p className="text-xs text-white/30 mt-2 px-3">Showing first 50 of {filtered.length} insurance entries</p>}
          </div>
        )
      )}
    </div>
  );
}

