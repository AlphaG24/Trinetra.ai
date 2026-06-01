'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/client'
import { getBaseUrl } from '@/src/utils/url'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  if (!isMounted) {
    return <div className="flex h-screen w-full bg-[#06040A]" />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
        
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid credentials. Please try again.')
        } else if (error.message.includes('Failed to fetch')) {
          toast.error('Connection failed. Check your internet.')
        } else {
          toast.error(error.message || 'No account found. Did you mean to sign up?')
        }
        return
      }

      if (data.user) {
        toast.success('Successfully logged in!')
        router.push('/dashboard')
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getBaseUrl()}/api/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      toast.error('Failed to initialize Google login')
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#06040A] overflow-hidden font-sans text-white selection:bg-amber-500/30 relative">
      
      {/* Static elegant dark grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Smooth linear gradient mesh */}
      <div 
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.08) 0%, rgba(6, 4, 10, 0) 50%), radial-gradient(circle at 70% 70%, rgba(251, 191, 36, 0.04) 0%, rgba(6, 4, 10, 0) 55%)"
        }}
      />

      {/* Left Half - Abstract Visualization (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden border-r border-white/5 z-10">
        
        {/* Glowing Core following mouse */}
        <motion.div 
          animate={{
            x: mousePos.x * 30,
            y: mousePos.y * 30,
          }}
          transition={{ type: "spring", stiffness: 60, damping: 25 }}
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-violet-600/10 via-amber-500/5 to-purple-600/10 blur-[90px] pointer-events-none"
        />

        {/* Brand visual & Logo - perfectly centered */}
        <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 bg-violet-500/10 blur-3xl rounded-full scale-150"></div>
            <img src="/trident.png" alt="Trinetra Logo" className="w-36 h-36 xl:w-52 xl:h-52 object-contain drop-shadow-[0_0_50px_rgba(139,92,246,0.6)] relative z-10" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-6xl xl:text-7xl font-black tracking-tighter leading-none mb-6"
          >
            Trinetra <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-violet-400 to-amber-300">
              Intelligence
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-violet-200/50 font-light leading-relaxed max-w-md"
          >
            Your autonomous business OS. Manage agents, orchestrate calls, and capture leads while you sleep.
          </motion.p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-[10px] text-zinc-600 tracking-widest uppercase font-semibold">
          © {new Date().getFullYear()} Trinetra AI. All Systems Operational.
        </div>
      </div>

      {/* Right Half - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        
        {/* Mobile View Elements */}
        <div className="flex lg:hidden flex-col items-center mb-10 w-full">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-150"></div>
            <img src="/trident.png" alt="Trinetra Logo" className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(139,92,246,0.6)]" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Trinetra</h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h2>
            <p className="text-zinc-400 text-sm">Enter your credentials to access the command center</p>
          </div>

          <motion.div
            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="bg-[#0D0B14]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative"
          >
            {/* Decorative Top Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"></div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[11px] font-bold text-violet-300/60 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-violet-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 transition-colors group-focus-within:text-violet-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 focus:bg-violet-500/5 transition-all shadow-inner"
                    placeholder="agent@trinetra.ai"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[11px] font-bold text-violet-300/60 uppercase tracking-widest transition-colors group-focus-within:text-violet-400">
                    Password
                  </label>
                  <a href="/reset-password" className="text-[11px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-widest">
                    Reset
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 transition-colors group-focus-within:text-violet-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 focus:bg-violet-500/5 transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-violet-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 relative flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 py-4 font-bold text-white transition-all hover:from-violet-400 hover:to-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed group overflow-hidden"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Initialize Session</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              </button>
            </form>

            <div className="my-8 flex items-center justify-center space-x-4">
              <div className="h-px w-full bg-gradient-to-r from-transparent to-white/10"></div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">Or Use Provider</span>
              <div className="h-px w-full bg-gradient-to-l from-transparent to-white/10"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-black/40 border border-white/5 py-4 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-all group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Workspace
            </button>
          </motion.div>

          <p className="mt-8 text-center text-[13px] text-zinc-500">
            No active deployment?{' '}
            <a href="/signup" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Start Free Trial →
            </a>
          </p>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  )
}
