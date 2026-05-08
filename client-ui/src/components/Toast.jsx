import { useState, useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose, duration = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); onClose?.(); }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const colors = {
    error: 'bg-red-500/20 border-red-500/40 text-red-200',
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
    info: 'bg-blue-500/20 border-blue-500/40 text-blue-200',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md px-5 py-3 rounded-xl border backdrop-blur-sm ${colors[type]} animate-[slideIn_0.3s_ease]`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={() => { setVisible(false); onClose?.(); }} className="text-white/50 hover:text-white text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
