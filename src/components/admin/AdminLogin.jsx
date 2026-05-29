"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import AdminBrand from "./AdminBrand";

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setStatus("submitting");
    setError("");

    setTimeout(() => {
      const result = onLogin(password);
      if (result.success) {
        setStatus("success");
      } else {
        setError(result.error);
        setStatus("idle");
      }
    }, 600); // simulate network delay for effect
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0008] px-4 font-sans text-white">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 -right-32 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-[80px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] mix-blend-overlay" />
      </div>

      <AnimatePresence>
        {status !== "success" && (
          <motion.div
            key="login-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={
              error
                ? { x: [-6, 6, -6, 6, 0], opacity: 1, scale: 1, y: 0 }
                : { x: 0, opacity: 1, scale: 1, y: 0 }
            }
            exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[420px] rounded-3xl border border-white/10 bg-white/[0.03] p-10 shadow-[0_25px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            {/* Top of login card - logo section */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-violet-900/40 p-4 shadow-[0_20px_40px_rgba(139,92,246,0.2)] mb-6 border border-white/10">
                <img 
                   src="/trident.png"
                   alt="Trinetra AI"
                   className="h-full w-full object-contain"
                />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-widest text-[#FAF7FF] mb-2">
                Trinetra
              </h1>
              <p className="text-xs font-bold tracking-[0.4em] uppercase text-violet-400">
                Secure Admin Access
              </p>
            </div>
            


            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col">
                <label className="mb-2 text-[13px] font-medium text-gray-400">Password</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter admin password"
                    className={`h-12 w-full rounded-xl border bg-white/5 px-4 pr-12 text-[15px] text-white outline-none transition-all focus:border-violet-500 focus:bg-white/10 focus:ring-4 focus:ring-violet-500/20 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10'}`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-1.5 text-[13px] text-red-500">
                    <AlertCircle size={14} /> {error}
                  </motion.div>
                )}
              </div>

              <motion.button
                type="submit"
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                disabled={status === "submitting" || !password}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 text-[15px] font-semibold text-white shadow-lg transition-all hover:shadow-[0_8px_25px_rgba(124,58,237,0.4)] disabled:opacity-50"
              >
                {status === "submitting" ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  "Enter Admin Panel"
                )}
              </motion.button>
            </form>

            <a href="/" className="mt-8 block text-center text-[13px] text-gray-500 transition-colors hover:text-gray-300">
              &larr; Return to Website
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
