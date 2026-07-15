import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Centralized Admin role validation
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    return (
        <div className='min-h-screen bg-black text-white'>
            {/* No Sidebar, just full screen power */}
            <header className='p-4 border-b border-red-900/30 flex justify-between items-center bg-red-950/10 backdrop-blur-sm sticky top-0 z-50'>
                <h1 className='text-red-600 font-bold tracking-[0.5em] text-sm'>TRINETRA // GOD MODE</h1>
                <a href='/dashboard' className='text-gray-500 hover:text-white text-xs font-mono transition-colors border border-transparent hover:border-white/10 px-3 py-1 rounded'>Exit to Dashboard -&gt;</a>
            </header>
            <main className='p-6'>
                {children}
            </main>
        </div>
    );
}
