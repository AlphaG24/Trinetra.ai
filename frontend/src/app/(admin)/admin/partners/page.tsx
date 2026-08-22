import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Handshake, Plus, ExternalLink, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'super_admin'].includes(profile?.role || '')) redirect('/dashboard')

  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center gap-3">
            <Handshake className="w-8 h-8 text-violet-400" />
            Partners & Affiliates
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage agency partners, referral commissions, and white-label integrators.
          </p>
        </div>

        <button className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add New Partner
        </button>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6">
        {(!partners || partners.length === 0) ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No partner organizations registered yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {partners.map((partner: any) => (
              <div key={partner.id} className="py-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{partner.company_name || partner.name}</div>
                  <div className="text-zinc-400 font-mono">{partner.email}</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {partner.status || 'active'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
