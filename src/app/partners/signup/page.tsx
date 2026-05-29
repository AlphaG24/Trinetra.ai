"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail, Lock, User, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerPartner } from "./actions";

export default function PartnerSignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    company: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await registerPartner(formData);

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/partners/dashboard";
        }, 2000);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#080010] relative overflow-hidden font-sans pt-[100px] px-4 pb-20 items-center justify-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 to-emerald-600 blur-[120px] rounded-full mix-blend-screen" />
      </div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px] z-10 mb-6"
      >
        <Link 
          href="/partners" 
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Partners
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
        className="relative z-10 w-full max-w-[480px]"
      >
        <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-3xl pointer-events-none" />
        <div className="bg-[#0f0a1c]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col"
              >
                <div className="flex flex-col items-center text-center mb-8">
                  <Link href="/" className="mb-6 hover:opacity-80 transition-opacity">
                    <img src="/trident.png" alt="Trinetra Trident" className="h-16 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                  </Link>
                  <h1 className="font-display font-bold text-3xl text-white tracking-tight mb-2">Create Account</h1>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Join Trinetra's network today and start monetizing your referrals instantly.
                  </p>
                </div>

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-2"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="fullName">Full Name</label>
                      <div className="relative group">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                        <input 
                          id="fullName"
                          type="text"
                          required
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="company">Company (Optional)</label>
                      <div className="relative group">
                        <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                        <input 
                          id="company"
                          type="text"
                          placeholder="Agency Inc"
                          value={formData.company}
                          onChange={(e) => setFormData({...formData, company: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="email">Email Address</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                      <input 
                        id="email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="password">Password</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                      <input 
                        id="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="mt-4 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98]"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Partner Account"}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                  <p className="text-zinc-400 text-sm">
                    Already an approved partner?{" "}
                    <Link href="/partners/login" className="text-white hover:underline decoration-amber-400 underline-offset-4 transition-all">
                      Log in
                    </Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 relative">
                  <motion.div 
                    initial={{ pathLength: 0 }} 
                    animate={{ pathLength: 1 }} 
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                </div>
                <h2 className="font-display font-bold text-2xl text-white mb-3">Account Success!</h2>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mb-8">
                  Your partner account has been created successfully. Taking you to the dashboard...
                </p>
                <Loader2 size={24} className="animate-spin text-emerald-500/50" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
