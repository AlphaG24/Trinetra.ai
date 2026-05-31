export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-32 bg-white/5 rounded-xl" />
      <div className="flex gap-3">
        <div className="flex-1 h-12 bg-white/5 rounded-xl" />
        <div className="w-40 h-12 bg-white/5 rounded-xl" />
      </div>
      <div className="h-96 bg-white/5 rounded-2xl" />
    </div>
  )
}
