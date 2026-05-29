"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import { createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterBox({ compact = false }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!emailPattern.test(value)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");
    
    try {
      const { error } = await supabase.from("partner_waitlist").insert({
        name: name.trim(),
        email: value,
        source: "blog",
        created_at: new Date().toISOString(),
      });

      if (error) {
        // Fallback or secondary API if supabase fails or is configured differently. Just mapping from previous logic.
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: value, source: "blog" }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || "Unable to subscribe right now.");
        }
      }

      setStatus("success");
      setMessage("You're successfully subscribed! 🎉 Check your inbox soon.");
      setEmail("");
      setName("");
      toast.success("You're subscribed! 🎉");
    } catch (err) {
      toast.error(err?.message || "Unable to subscribe right now.");
      setStatus("error");
      setMessage(err?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className="relative mt-24 mb-16 mx-auto w-full max-w-[1200px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0015] p-[2px]"
    >
      <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none">
        <div className="absolute -left-[10%] -top-[50%] h-[300px] w-[300px] rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="absolute -right-[10%] -bottom-[50%] h-[300px] w-[300px] rounded-full bg-cyan-600/20 blur-[100px]" />
      </div>
      
      <div className="relative h-full w-full rounded-[30px] bg-[rgba(10,0,8,0.7)] backdrop-blur-[20px] p-8 md:p-14 lg:p-16 flex flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
          <Mail size={14} className="text-violet-400" /> Wait... don't miss out!
        </div>
        
        <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight text-white mb-4">
          Get the <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">latest AI insights</span><br/>delivered to your inbox weekly.
        </h2>
        
        <p className="text-[16px] text-gray-400 mb-10 max-w-[500px]">
          Join 10,000+ business leaders reading the Trinetra newsletter for cutting-edge automation strategies.
        </p>
        
        <form onSubmit={handleSubscribe} className="flex w-full max-w-[600px] flex-col gap-4 sm:flex-row">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'loading'}
            placeholder="First Name"
            className="h-14 flex-[1] min-w-0 rounded-2xl border border-white/10 bg-white/5 px-5 text-[15px] text-white placeholder:text-gray-500 outline-none transition-all hover:border-violet-500/30 focus:border-violet-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] disabled:opacity-50"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            placeholder="Email Address"
            className="h-14 flex-[1.5] min-w-0 rounded-2xl border border-white/10 bg-white/5 px-5 text-[15px] text-white placeholder:text-gray-500 outline-none transition-all hover:border-violet-500/30 focus:border-violet-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] disabled:opacity-50"
          />
          
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group relative flex h-14 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-8 text-[15px] font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] disabled:pointer-events-none disabled:opacity-70 sm:w-auto"
          >
            {status === 'loading' ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : status === 'success' ? (
              <>Subscribed! <CheckCircle size={18} /></>
            ) : status === 'error' ? (
              "Try Again"
            ) : (
              <>Subscribe <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>
            )}
            <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        </form>
        
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-xl px-4 py-2 text-sm font-medium ${
              status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
              status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''
            }`}
          >
            {message}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
