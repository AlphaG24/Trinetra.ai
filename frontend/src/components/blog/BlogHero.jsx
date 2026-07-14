"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function BlogHero() {
  const [stats, setStats] = useState({ articles: 0, readers: 0 });

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1500;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      setStats({
        articles: Math.floor(progress * 42),
        readers: Math.floor(progress * 12)
      });
      
      if (progress < 1) window.requestAnimationFrame(step);
    };
    
    window.requestAnimationFrame(step);
  }, []);

  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 15 }).map(() => ({
      left: `${Math.random() * 100}%`,
      duration: `${12 + Math.random() * 20}s`,
      delay: `-${Math.random() * 15}s`,
      size: `${2 + Math.random() * 2}px`,
      op: 0.1 + Math.random() * 0.15,
      bg: Math.random() > 0.5 ? '#8b5cf6' : '#ffffff',
    })));
  }, []);

  return (
    <section className="relative w-full overflow-hidden flex items-center justify-center font-sans pt-32 pb-16">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes meshShift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -10px) scale(1.03); }
        }
        .animate-mesh { animation: meshShift 12s ease-in-out infinite; }
        
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: var(--max-op); scale: 1; }
          90% { opacity: var(--max-op); scale: 1; }
          100% { transform: translateY(-20vh) scale(0); opacity: 0; }
        }
        .particle {
          position: absolute;
          border-radius: 50%;
          animation: floatUp var(--duration) linear infinite;
          animation-delay: var(--delay);
          left: var(--left);
          background: var(--bg);
          width: var(--size);
          height: var(--size);
          --max-op: var(--op);
        }
      `}} />

      {/* BACKGROUND LAYERS */}
      <div className="absolute inset-0 bg-[#080010]" />
      
      {/* Mesh Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-mesh absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="animate-mesh absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-[rgba(139,92,246,0.06)] blur-[90px]" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[50%] left-[50%] w-[80%] h-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_85%_60%_at_50%_0%,rgba(124,58,237,0.12)_0%,transparent_70%)]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-100 pointer-events-none mix-blend-overlay shadow-[inset_0_0_80px_80px_#080010]" />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="particle"
            style={{
              "--left": p.left,
              "--duration": p.duration,
              "--delay": p.delay,
              "--size": p.size,
              "--op": p.op,
              "--bg": p.bg,
            }}
          />
        ))}
      </div>

      {/* HERO CONTENT */}
      <div className="relative z-10 w-full max-w-[900px] mx-auto flex flex-col items-center justify-center px-6 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-violet-300 backdrop-blur-md">
            <Sparkles size={13} className="text-violet-400" />
            Insights & Innovation
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-6xl leading-[1.15] mb-4">
            Insights from the <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-gold-400">Future of AI</span>
          </h1>

          {/* Subheading */}
          <p className="mb-8 max-w-[620px] text-[15px] md:text-[16px] leading-[1.6] text-gray-400 font-normal">
            Deep dives into AI, autonomous workflows, and modern education tooling shaping tomorrow's Indian businesses. Written by the Trinetra AI team.
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01] px-8 py-3.5 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col items-center px-6">
              <span className="text-[20px] font-bold text-violet-400">{stats.articles}+</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mt-0.5">Articles</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex flex-col items-center px-6">
              <span className="text-[20px] font-bold text-violet-400">{stats.readers}K+</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mt-0.5">Readers</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex flex-col items-center px-6">
              <span className="text-[20px] font-bold text-violet-400">Weekly</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mt-0.5">Updates</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
