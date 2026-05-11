export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'spinner-sm', md: 'spinner', lg: 'w-8 h-8 border-[3px]' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`spinner ${sizes[size] || sizes.md}`} />
      {text && <p className="text-sm text-white/35 animate-pulse">{text}</p>}
    </div>
  );
}
