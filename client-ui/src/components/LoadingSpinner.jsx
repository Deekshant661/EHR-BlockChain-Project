export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeMap = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeMap[size]} border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin`} />
      {text && <p className="text-sm text-white/50">{text}</p>}
    </div>
  );
}
