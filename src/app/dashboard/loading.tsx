export default function DashboardLoading() {
  return (
    <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    </div>
  )
}
