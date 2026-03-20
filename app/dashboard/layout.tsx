import Sidebar from '@/components/dashboard/sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-black text-white overflow-hidden selection:bg-white/20">
            {/* Background Grid Pattern */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10 pointer-events-none" />
            <div className="fixed inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />

            {/* Sidebar (Fixed width 64/16rem = 256px) */}
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 md:pl-64 flex flex-col relative z-0 h-screen overflow-y-auto overflow-x-hidden">
                <div className="flex-1 py-8 px-6 md:px-12 w-full max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
