import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = 'force-dynamic';

export default async function AdminPartnersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/partners/login")
  }

  // Admin Check
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['ketan@trinetra.ai', 'ketan0singh@gmail.com'] // Fallbacks for safety during dev
  const isAdmin = ADMIN_EMAILS.includes(session.user.email || "")

  // Check if they are in admins table if not using email list
  const { data: adminCheck } = await supabase
    .from('partners') // Or some other admin table
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!isAdmin && !adminCheck) {
    redirect("/partners/dashboard")
  }

  // Fetch all partners
  const { data: partners, error: partnersError } = await supabase
    .from("partners")
    .select("*, partner_referrals(*)")
    .order("created_at", { ascending: false })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateStr))
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[var(--bg-primary)] partner-theme">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,15,0.8)] backdrop-blur-md border-b border-[var(--border)] px-[24px] py-[16px] flex justify-between items-center">
        <div className="flex items-center gap-[12px]">
          <span className="font-display font-bold text-[18px] text-white">Admin / Partners</span>
        </div>
        <Link href="/partners/dashboard" className="text-[14px] text-[var(--text-muted)] hover:text-white">
          Back to Dashboard
        </Link>
      </header>

      <main className="max-w-[1400px] mx-auto w-full px-[20px] pt-[40px] flex flex-col gap-[40px] pb-[100px]">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display font-bold text-[32px] text-white">Partner Management</h1>
            <p className="text-[var(--text-muted)] mt-2">View and manage all partners and commissions.</p>
          </div>
        </div>

        {partnersError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md">
            Error loading partners: {partnersError.message}
          </div>
        ) : (
          <div className="partner-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]">
                    <th className="partner-label p-[16px] pl-[24px]">PARTNER</th>
                    <th className="partner-label p-[16px]">EMAIL</th>
                    <th className="partner-label p-[16px]">CODE</th>
                    <th className="partner-label p-[16px]">STATUS</th>
                    <th className="partner-label p-[16px] text-right">COMMISSION RATE</th>
                    <th className="partner-label p-[16px] text-right">TOTAL REFERRALS</th>
                    <th className="partner-label p-[16px] pr-[24px] text-right">JOINED</th>
                  </tr>
                </thead>
                <tbody>
                  {partners?.map((p) => (
                    <tr key={p.id} className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                      <td className="p-[16px] pl-[24px]">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{p.full_name}</span>
                          {p.company_name && <span className="text-[13px] text-[var(--text-muted)]">{p.company_name}</span>}
                        </div>
                      </td>
                      <td className="p-[16px]">
                        <span className="text-[14px] text-[var(--text-muted)]">{p.email}</span>
                      </td>
                      <td className="p-[16px]">
                        <span className="font-mono text-[14px] text-[var(--accent-yellow)]">{p.referral_code}</span>
                      </td>
                      <td className="p-[16px]">
                        <span className={`partner-badge partner-badge-${p.status.toLowerCase()}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-[16px] text-right">
                        <span className="text-white font-medium">{p.commission_rate}%</span>
                      </td>
                      <td className="p-[16px] text-right">
                        <span className="text-[var(--text-muted)]">{p.partner_referrals?.length || 0}</span>
                      </td>
                      <td className="p-[16px] pr-[24px] text-right">
                        <span className="text-[14px] text-[var(--text-muted)]">{formatDate(p.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                  {(!partners || partners.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-[32px] text-center text-[var(--text-muted)]">
                        No partners found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
