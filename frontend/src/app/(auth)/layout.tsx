export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] text-white">
      {children}
    </div>
  )
}
