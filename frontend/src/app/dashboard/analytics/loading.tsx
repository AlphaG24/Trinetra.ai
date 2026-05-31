export default function AnalyticsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-48 bg-white/5 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
      </div>
      <div className="h-80 bg-white/5 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 h-64 bg-white/5 rounded-2xl" />
        <div className="lg:col-span-3 h-64 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}
