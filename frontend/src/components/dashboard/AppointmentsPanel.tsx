'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Phone, MapPin, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/client'
import Link from 'next/link'
import { format } from 'date-fns'

interface Appointment {
  id: string
  contact_name: string
  contact_phone: string
  agent_id: string
  scheduled_at: string
  status: 'scheduled' | 'completed' | 'cancelled'
  meeting_type: string
  agents?: {
    name: string
  }
}

export function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAppointments() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data } = await supabase
          .from('appointments')
          .select('*, agents(name)')
          .eq('user_id', user.id)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5)

        if (data) {
          setAppointments(data)
        }
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [])

  return (
    <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          Upcoming Appointments
        </h2>
        <Link 
          href="/dashboard/appointments" 
          className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-white/5 border border-white/5 rounded-xl border-dashed">
            <Calendar className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/60 font-medium mb-1">No upcoming appointments</p>
            <p className="text-white/40 text-sm">Appointments booked by your agents will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div 
                key={apt.id} 
                className="bg-white/5 border-l-4 border-amber-500 rounded-lg p-4 transition-all hover:bg-white/10"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-white">
                    {format(new Date(apt.scheduled_at), 'MMM d, yyyy • h:mm a')} (IST)
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                    {apt.status}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex items-center gap-2 text-sm text-white/90">
                    <User className="w-3.5 h-3.5 text-white/50" />
                    {apt.contact_name || 'Unknown Contact'}
                  </div>
                  {apt.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Phone className="w-3.5 h-3.5 text-white/50" />
                      {apt.contact_phone}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-white/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    Booked via {apt.agents?.name || 'AI Agent'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-3 py-1 rounded bg-white/5 text-white hover:bg-white/10 transition-colors">
                      Reschedule
                    </button>
                    <button className="text-xs px-3 py-1 rounded bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors">
                      Join
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
