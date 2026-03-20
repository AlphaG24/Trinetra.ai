'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home,
    Users,
    Network,
    CreditCard,
    Key,
    FileText,
    LifeBuoy,
    ShieldAlert,
    LogOut,
    User
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

const navLinks = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'My Agents', href: '/dashboard/agents', icon: Users },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Network },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'API Keys', href: '/dashboard/keys', icon: Key },
    { name: 'Logs', href: '/dashboard/logs', icon: FileText },
    { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || null);
        };
        getUser();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className="w-64 border-r border-white/10 bg-black flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Brand Header */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs tracking-tighter">
                    T
                </div>
                <span className="font-bold tracking-widest text-white text-sm">TRINETRA</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {navLinks.map((link) => {
                    const LinkIcon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group',
                                isActive
                                    ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)] border border-white/5'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                            )}
                        >
                            <LinkIcon size={18} className={clsx("transition-colors", isActive ? "text-white" : "text-zinc-500 group-hover:text-white")} />
                            {link.name}
                        </Link>
                    );
                })}

                {/* Secure Admin Link */}
                {userEmail === 'raghav00424@gmail.com' && (
                    <div className="pt-4 mt-4 border-t border-white/5 mx-2">
                        <Link
                            href="/admin"
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-wider rounded-lg transition-all group',
                                pathname === '/admin'
                                    ? 'bg-red-900/20 text-red-500 border border-red-900/50'
                                    : 'text-zinc-600 hover:text-red-400 hover:bg-red-950/10'
                            )}
                        >
                            <ShieldAlert size={16} className="group-hover:animate-pulse" />
                            OVERWATCH
                        </Link>
                    </div>
                )}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                        <User size={14} className="text-zinc-400" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-medium text-white truncate">
                            {userEmail || 'Loading...'}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                            Pro License
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                >
                    <LogOut size={14} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
