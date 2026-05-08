import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '🔗', title: 'Blockchain-Secured', desc: 'Every medical record is immutably stored on Hyperledger Fabric distributed ledger.' },
  { icon: '🔐', title: 'Patient-Controlled Access', desc: 'Patients grant and revoke doctor access to their records via smart contracts.' },
  { icon: '🛡️', title: 'Insurance Integration', desc: 'End-to-end insurance policy issuance, claims filing, and approval on-chain.' },
  { icon: '🏥', title: 'Multi-Org Architecture', desc: 'Hospitals (Org1) and insurance providers (Org2) operate on separate Fabric peers.' },
  { icon: '🔑', title: 'JWT + Fabric Identity', desc: 'Application-layer JWT auth layered on top of X.509 Fabric CA identities.' },
  { icon: '📊', title: 'Audit Trail', desc: 'Full transaction history and asset provenance queryable from the blockchain.' },
];

export default function LandingPage() {
  const { isAuthenticated, getDashboardRoute } = useAuth();

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-surface-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary-600 rounded-xl flex items-center justify-center text-lg font-bold">E</div>
            <span className="text-lg font-bold text-white">EHR Blockchain</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={getDashboardRoute()} className="btn-primary text-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">Login</Link>
                <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="badge-purple text-sm px-4 py-1.5">Powered by Hyperledger Fabric</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Secure Health Records
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">On the Blockchain</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            A production-grade Electronic Health Record system built on Hyperledger Fabric. 
            Patient-controlled access, immutable audit trails, and integrated insurance workflows.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary text-base px-8 py-3">Create Account</Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Architecture & Features</h2>
          <p className="text-white/40 text-center mb-12 max-w-xl mx-auto">Built with enterprise-grade security and decentralized trust</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-white/30">
          EHR Blockchain System — Hyperledger Fabric + Node.js + React
        </div>
      </footer>
    </div>
  );
}
