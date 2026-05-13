export default function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`bg-zinc-900 rounded-xl animate-pulse ${className}`} />;
}
