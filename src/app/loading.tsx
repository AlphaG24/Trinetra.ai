export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080010]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#8B5CF6] opacity-20"></div>
          <div className="absolute inset-2 animate-spin rounded-full border-b-2 border-l-2 border-[#D7C4F7]"></div>
          <img
            src="/trident.png"
            alt="Loading..."
            className="h-14 w-14 animate-pulse object-contain"
            style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))" }}
          />
        </div>
        <div className="flex animate-pulse items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#8B5CF6]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#D7C4F7]" style={{ animationDelay: "0.2s" }}></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#8B5CF6]" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  );
}
