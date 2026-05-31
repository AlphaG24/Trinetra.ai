"use client";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { createBrowserClient } from "@/lib/supabase/client";

import { formatDate } from "@/utils/formatDate";
import { getCategoryColor, truncateText } from "@/utils/blogHelpers";

const supabase = createBrowserClient();

export default function BlogHero({ featuredPost: featuredPostProp }) {
  const router = useRouter();
  const [featuredPost, setFeaturedPost] = useState(featuredPostProp || null);
  const [loading, setLoading] = useState(!featuredPostProp);
  const [error, setError] = useState("");

  const hasFeatured = Boolean(featuredPost);

  useEffect(() => {
    let cancelled = false;

    // If the parent is managing the featured post (even if null), don't refetch here.
    if (featuredPostProp !== undefined) {
      setFeaturedPost(featuredPostProp || null);
      setLoading(false);
      setError("");
      return undefined;
    }

    async function run() {
      setLoading(true);
      setError("");
      try {
        const { data, error: fetchError } = await supabase
          .from("blog_posts")
          .select(
            "id,title,slug,excerpt,cover_image,category,tags,author_name,author_avatar,featured,views,read_time,created_at"
          )
          .eq("status", "published")
          .eq("featured", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!cancelled) setFeaturedPost(data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load featured post.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [featuredPostProp]);

  const bgImage = useMemo(() => {
    if (!featuredPost?.cover_image) return null;
    return `url("${featuredPost.cover_image}")`;
  }, [featuredPost?.cover_image]);

  const onRead = () => {
    if (!featuredPost?.slug) return;
    router.push(`/blog/${featuredPost.slug}`);
  };

  const [stats, setStats] = useState({ articles: 0, readers: 0 });

  useEffect(() => {
    // Animate stats counting up
    let startTimestamp = null;
    const duration = 2000;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      setStats({
        articles: Math.floor(progress * 50),
        readers: Math.floor(progress * 10)
      });
      
      if (progress < 1) window.requestAnimationFrame(step);
    };
    
    window.requestAnimationFrame(step);
  }, []);

  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 25 }).map(() => ({
      left: `${Math.random() * 100}%`,
      duration: `${15 + Math.random() * 25}s`,
      delay: `-${Math.random() * 20}s`,
      size: `${2 + Math.random() * 3}px`,
      op: 0.1 + Math.random() * 0.2,
      bg: Math.random() > 0.5 ? '#8b5cf6' : '#ffffff',
    })));
  }, []);

  return (
    <section className="relative min-h-[85vh] w-full overflow-hidden flex items-center justify-center font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes meshShift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 10px) scale(0.95); }
        }
        .animate-mesh { animation: meshShift 15s ease-in-out infinite; }
        
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
        <div className="animate-mesh absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="animate-mesh absolute top-[-5%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-[rgba(139,92,246,0.08)] blur-[100px]" style={{ animationDelay: '-5s' }} />
        <div className="animate-mesh absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-[rgba(168,85,247,0.06)] blur-[100px]" style={{ animationDelay: '-10s' }} />
        <div className="absolute top-[50%] left-[50%] w-[80%] h-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.15)_0%,transparent_70%)]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-100 pointer-events-none mix-blend-overlay shadow-[inset_0_0_100px_100px_#080010]" />

      {/* Particles - rendered client-side only to prevent hydration mismatch */}
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
      <div className="relative z-10 w-full max-w-[800px] mx-auto flex flex-col items-center justify-center px-6 pt-20 pb-20 text-center text-white">
        
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-violet-300 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.15)] relative overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            <Sparkles size={14} className="text-violet-400" />
            Insights & Innovation
          </motion.div>

          {/* Heading */}
          <motion.h1 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="font-display text-5xl font-black tracking-[-0.02em] md:text-7xl leading-[1.1] mb-6"
          >
            <span className="block text-white drop-shadow-md">Insights from the</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-gold-400 drop-shadow-lg pb-2">Future of AI</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mb-12 max-w-[560px] text-[18px] md:text-[20px] leading-[1.7] text-gray-400 font-medium"
          >
            Deep dives into AI, automation, and the technology shaping tomorrow's businesses. Written by the Trinetra AI team.
          </motion.p>

          {/* Stats Row */}
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md transition-transform hover:scale-[1.02] duration-500"
          >
            <div className="flex flex-col items-center px-4 md:px-8">
              <div className="text-3xl font-bold text-violet-400">{stats.articles}+</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-1">Articles</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col items-center px-4 md:px-8">
              <div className="text-3xl font-bold text-violet-400">{stats.readers}K+</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-1">Readers</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col items-center px-4 md:px-8">
              <div className="text-3xl font-bold text-violet-400">Weekly</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-1">Updates</div>
            </div>
          </motion.div>
        </motion.div>

      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 cursor-pointer"
        onClick={() => {
          window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Explore Articles</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <ArrowRight size={16} className="text-gray-500 rotate-90" />
        </motion.div>
      </motion.div>

    </section>
  );
}
