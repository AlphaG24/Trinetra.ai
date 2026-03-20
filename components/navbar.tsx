import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 md:px-12 pointer-events-none">
            <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo-transparent.png" alt="Trinetra" width={150} height={60} className="h-24 w-auto object-contain brightness-0 invert" />
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                    <Link href="#" className="hover:text-zinc-100 transition-colors">Platform</Link>
                    <Link href="/about" className="hover:text-zinc-100 transition-colors">Manifesto</Link>
                    <Link href="/pricing" className="hover:text-zinc-100 transition-colors">Pricing</Link>
                    <Link href="/docs" className="hover:text-zinc-100 transition-colors">Documentation</Link>
                    <Link href="/contact" className="hover:text-zinc-100 transition-colors">Enterprise</Link>
                </div>

                <Link
                    href="/login"
                    className="px-5 py-2.5 bg-zinc-100 text-black text-sm font-semibold rounded-full hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                >
                    Enter Console
                </Link>
            </div>
        </nav>
    );
}
