import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className="fixed top-6 right-6 z-[100] animate-slideIn max-w-sm">
      <div className={`glass rounded-xl px-4 py-3 border ${colors[type]} flex items-center gap-3 shadow-2xl shadow-black/30`}>
        <span className="text-base font-bold">{icons[type]}</span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none">×</button>
      </div>
    </div>
  );
}
