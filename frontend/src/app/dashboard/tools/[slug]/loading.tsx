export default function ToolLoading() {
  return (
    <div className="w-full h-[calc(100vh-160px)] flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm font-medium animate-pulse">Initializing AI Engine...</p>
      </div>
    </div>
  )
}
