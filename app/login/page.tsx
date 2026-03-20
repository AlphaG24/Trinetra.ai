"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ArrowRight, Lock, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!isLogin && password !== confirmPassword) {
            setError("Access Keys do not match.");
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/dashboard");
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setSuccessMessage("Protocol Initiated. Verify your Identity String (email) to proceed.");
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google') => {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
        if (error) setError(error.message);
    };

    return (
        <div className="min-h-screen w-full bg-trinetra-bg flex items-center justify-center p-6 relative overflow-hidden">

            {/* --- PURPLE SPOTLIGHT --- */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-trinetra-accent/20 rounded-full blur-[150px] pointer-events-none" />

            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-[480px] bg-trinetra-card/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl"
            >
                {/* Header Logo */}
                <div className="flex justify-center mb-8">
                    <NextImage
                        src="/trident.png"
                        alt="Trinetra Logo"
                        width={120}
                        height={120}
                        className="h-24 w-auto drop-shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse-slow"
                        priority
                    />
                </div>

                {/* --- TABS (Access vs Register) --- */}
                <div className="flex border-b border-white/10 mb-8 relative">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); }}
                        className={cn(
                            "flex-1 pb-3 text-sm font-medium transition-colors relative",
                            isLogin ? "text-white" : "text-trinetra-muted hover:text-white/80"
                        )}
                    >
                        Login
                        {isLogin && (
                            <motion.div
                                layoutId="tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-trinetra-accent shadow-[0_0_10px_#8b5cf6]"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); }}
                        className={cn(
                            "flex-1 pb-3 text-sm font-medium transition-colors relative",
                            !isLogin ? "text-white" : "text-trinetra-muted hover:text-white/80"
                        )}
                    >
                        Sign Up
                        {!isLogin && (
                            <motion.div
                                layoutId="tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-trinetra-accent shadow-[0_0_10px_#8b5cf6]"
                            />
                        )}
                    </button>
                </div>


                {/* ALERTS */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm overflow-hidden"
                        >
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                    {successMessage && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3 text-green-400 text-sm overflow-hidden"
                        >
                            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                            <span>{successMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* FORM */}
                <form onSubmit={handleAuth} className="space-y-6">

                    {/* Identity String */}
                    <div className="group relative">
                        <label className="text-xs font-mono text-trinetra-muted uppercase tracking-widest mb-1 block">
                            Email
                        </label>
                        <div className="relative flex items-center">
                            <User size={16} className="absolute left-0 text-trinetra-muted group-focus-within:text-trinetra-accent transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-transparent border-b border-trinetra-muted/30 py-2 pl-6 text-white text-sm focus:outline-none focus:border-trinetra-accent transition-colors placeholder:text-trinetra-muted/20"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Access Key */}
                    <div className="group relative">
                        <label className="text-xs font-mono text-trinetra-muted uppercase tracking-widest mb-1 block">
                            Password
                        </label>
                        <div className="relative flex items-center">
                            <Lock size={16} className="absolute left-0 text-trinetra-muted group-focus-within:text-trinetra-accent transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-transparent border-b border-trinetra-muted/30 py-2 pl-6 text-white text-sm focus:outline-none focus:border-trinetra-accent transition-colors placeholder:text-trinetra-muted/20"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {/* Confirm Access Key (Register Mode) */}
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="group relative pt-4"> {/* Added padding top for spacing */}
                                    <label className="text-xs font-mono text-trinetra-muted uppercase tracking-widest mb-1 block">
                                        Confirm Password
                                    </label>
                                    <div className="relative flex items-center">
                                        <Lock size={16} className="absolute left-0 text-trinetra-muted group-focus-within:text-trinetra-accent transition-colors" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-transparent border-b border-trinetra-muted/30 py-2 pl-6 text-white text-sm focus:outline-none focus:border-trinetra-accent transition-colors placeholder:text-trinetra-muted/20"
                                            placeholder="••••••••"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>


                    {/* Utility Row */}
                    <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" className="w-3 h-3 rounded border-trinetra-muted bg-transparent text-trinetra-accent focus:ring-trinetra-accent/50 checked:bg-trinetra-accent transition-colors" />
                            <span className="text-trinetra-muted group-hover:text-white transition-colors">Remember me</span>
                        </label>
                        <Link href="/auth/recovery" className="text-trinetra-accent hover:text-white transition-colors hover:underline decoration-dotted">
                            Forgot Password?
                        </Link>
                    </div>


                    {/* Primary Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-trinetra-accent text-white font-medium rounded-lg hover:bg-trinetra-glow hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                {isLogin ? "Sign In" : "Sign Up"}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    </button>

                </form>


                {/* Divider */}
                <div className="my-8 flex items-center gap-4">
                    <div className="h-px flex-1 bg-trinetra-muted/20" />
                    <span className="text-xs uppercase text-trinetra-muted font-mono tracking-widest">
                        Or continue with
                    </span>
                    <div className="h-px flex-1 bg-trinetra-muted/20" />
                </div>


                {/* Google Button */}
                <button
                    onClick={() => handleSocialLogin('google')}
                    className="w-full py-3 rounded-lg bg-white hover:bg-white/90 transition-colors flex items-center justify-center gap-3 text-black font-medium shadow-lg"
                >
                    {/* Google SVG Icon */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>


                {/* Footer Legal */}
                <div className="mt-8 text-center text-[10px] text-trinetra-muted/40 font-mono leading-relaxed">
                    By accessing the Neural Network, you agree to the <Link href="/legal" className="text-trinetra-muted hover:text-white underline">Terms of Alliance</Link> and <Link href="/privacy" className="text-trinetra-muted hover:text-white underline">Privacy Edict</Link>.
                </div>

            </motion.div>
        </div>
    );
}
