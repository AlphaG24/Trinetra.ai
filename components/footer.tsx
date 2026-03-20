import Image from "next/image";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-zinc-950 border-t border-zinc-900 pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-12 mb-24">

                {/* Column 1: Brand */}
                <div className="col-span-2 md:col-span-1 space-y-4">
                    <Link href="/" className="block">
                        <Image src="/logo-transparent.png" alt="Trinetra" width={150} height={60} className="h-24 w-auto object-contain brightness-0 invert" />
                    </Link>
                    <p className="text-xs text-zinc-500 leading-relaxed font-mono">
                        Constructed by <br /> Ketan Singh Rathour.
                    </p>
                </div>

                {/* Column 2: Product */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
                    <ul className="space-y-3 text-sm text-zinc-500">
                        <li><Link href="#" className="hover:text-emerald-500 transition-colors">Auditor</Link></li>
                        <li><Link href="#" className="hover:text-emerald-500 transition-colors">Nexus</Link></li>
                        <li><Link href="#" className="hover:text-emerald-500 transition-colors">Vault</Link></li>
                        <li><Link href="/pricing" className="hover:text-emerald-500 transition-colors">Pricing</Link></li>
                    </ul>
                </div>

                {/* Column 3: Resources */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resources</h4>
                    <ul className="space-y-3 text-sm text-zinc-500">
                        <li><Link href="/docs" className="hover:text-emerald-500 transition-colors">Documentation</Link></li>
                        <li><Link href="/docs#api-reference" className="hover:text-emerald-500 transition-colors">API Reference</Link></li>
                    </ul>
                </div>

                {/* Column 4: Legal */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal</h4>
                    <ul className="space-y-3 text-sm text-zinc-500">
                        <li><Link href="/legal/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/legal/terms" className="hover:text-emerald-500 transition-colors">Terms of Service</Link></li>
                    </ul>
                </div>

                {/* Column 5: Status */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Status</h4>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-900 w-fit">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wide">System Stable</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600 font-mono text-center md:text-left">
                <p>&copy; 2024 Trinetra Systems. All rights reserved.</p>
                <div className="flex gap-8">
                    <span>Protocol v1.0.4</span>
                    <span>Region: ap-south-1</span>
                </div>
            </div>
        </footer>
    );
}
