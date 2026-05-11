import { useNavigate } from 'react-router-dom';

/**
 * Sanchay Logo — Shield with integrated "S" and lock keyhole.
 * Designed to convey security + healthcare trust.
 *
 * @param {number} size - width/height in px (default 36)
 * @param {boolean} clickable - if true, clicking navigates to "/"
 * @param {string} className - additional wrapper classes
 */
export default function SanchayLogo({ size = 36, clickable = true, className = '' }) {
  const navigate = useNavigate();

  const logo = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
    >
      {/* Shield body */}
      <path
        d="M24 4L6 12v12c0 11.1 7.68 21.48 18 24 10.32-2.52 18-12.9 18-24V12L24 4z"
        fill="url(#shieldGrad)"
        stroke="url(#shieldStroke)"
        strokeWidth="1.5"
      />

      {/* Inner S letterform — custom path for uniqueness */}
      <path
        d="M28.5 17.5c0-2.5-2-4-4.5-4s-4.5 1.5-4.5 4c0 2 1.2 3 3.2 3.8l2.6 1c2.2 0.9 3.7 2.2 3.7 4.7 0 2.8-2.2 4.5-5 4.5s-5-1.7-5-4.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Lock shackle — small arc at top of shield */}
      <path
        d="M20 11.5v-1a4 4 0 018 0v1"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lock body — small rectangle */}
      <rect
        x="19" y="11" width="10" height="7" rx="1.5"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
      />
      {/* Keyhole dot */}
      <circle cx="24" cy="14" r="1.2" fill="rgba(255,255,255,0.7)" />

      <defs>
        <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="40">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="shieldStroke" x1="6" y1="4" x2="42" y2="40">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (!clickable) return logo;

  return (
    <button
      onClick={() => navigate('/')}
      className="flex-shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200 focus:outline-none"
      aria-label="Go to Sanchay home"
      title="Go to home"
    >
      {logo}
    </button>
  );
}

/**
 * Full brand lockup: Logo + "Sanchay" text
 */
export function SanchayBrand({ size = 36, clickable = true, showText = true, subtitle = '' }) {
  const navigate = useNavigate();

  const content = (
    <span className="inline-flex items-center gap-2.5">
      <SanchayLogo size={size} clickable={false} />
      {showText && (
        <span className="flex flex-col">
          <span className="text-[15px] font-bold text-white tracking-tight leading-tight">Sanchay</span>
          {subtitle && <span className="text-[10px] text-white/30 leading-tight">{subtitle}</span>}
        </span>
      )}
    </span>
  );

  if (!clickable) return content;

  return (
    <button
      onClick={() => navigate('/')}
      className="inline-flex items-center hover:opacity-90 active:scale-[0.97] transition-all duration-200 focus:outline-none"
      aria-label="Go to Sanchay home"
      title="Go to home"
    >
      {content}
    </button>
  );
}
