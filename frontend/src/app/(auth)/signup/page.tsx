'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, UserPlus, PhoneCall, MessageSquare, Bot } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return <div className="flex h-screen w-full bg-[#05050a]" />
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        }
      })

      if (error) {
        toast.error(error.message || 'Failed to sign up.')
        return
      }

      toast.success('Account created! Please check your email to verify.')
      router.push('/login')
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/api/auth/callback',
        },
      })
      if (error) throw error
    } catch (err) {
      toast.error('Failed to initialize Google signup')
    }
  }

  const floatAnimation: any = {
    animate: {
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#05050a] overflow-hidden font-sans text-white selection:bg-amber-500/30">
      
      {/* Left Half - Abstract Visualization */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden border-r border-white/5">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-600/20 via-yellow-500/10 to-purple-600/20 blur-[100px] pointer-events-none" />

        <div className="absolute inset-0 perspective-[1000px] pointer-events-none overflow-hidden flex items-center justify-center opacity-30">
          <motion.div 
            animate={{
              rotateX: [60, 60],
              rotateZ: [0, 360],
            }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="w-[200vw] h-[200vw] absolute bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]"
            style={{ transformStyle: 'preserve-3d' }}
          />
        </div>

        {/* Floating Icons */}
        <motion.div variants={floatAnimation} animate="animate" className="absolute top-16 left-16 xl:top-24 xl:left-24 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <PhoneCall className="w-8 h-8 text-amber-400" />
        </motion.div>
        
        <motion.div variants={floatAnimation} animate="animate" style={{ animationDelay: '2s' }} className="absolute top-16 right-16 xl:top-24 xl:right-24 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
          <MessageSquare className="w-8 h-8 text-purple-400" />
        </motion.div>

        <motion.div variants={floatAnimation} animate="animate" style={{ animationDelay: '4s' }} className="absolute top-48 left-24 xl:top-64 xl:left-32 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Bot className="w-8 h-8 text-emerald-400" />
        </motion.div>

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full scale-150"></div>
            <img src="/trident.png" alt="Trinetra Logo" className="w-32 h-32 xl:w-48 xl:h-48 object-contain drop-shadow-[0_0_40px_rgba(245,158,11,0.8)] relative z-10" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl xl:text-7xl font-black tracking-tighter leading-none mb-6"
          >
            Trinetra <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
              Intelligence
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-400 font-light leading-relaxed max-w-md"
          >
            Start building your autonomous business OS.
          </motion.p>
        </div>

        <div className="absolute bottom-8 text-xs text-gray-600 tracking-widest uppercase font-semibold">
          © {new Date().getFullYear()} Trinetra AI. All Systems Operational.
        </div>
      </div>

      {/* Right Half - Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        
        {/* Mobile View Elements */}
        <div className="flex lg:hidden flex-col items-center mb-10 w-full">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-150"></div>
            <img src="/trident.png" alt="Trinetra Logo" className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Trinetra</h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Create Account</h2>
            <p className="text-gray-400 text-sm">Start your 14-day free trial today</p>
          </div>

          <motion.div
            className="bg-white/[0.02] backdrop-blur-3xl p-8 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-amber-500">
                  Full Name
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-amber-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:bg-amber-500/5 transition-all shadow-inner"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-amber-500">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-amber-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:bg-amber-500/5 transition-all shadow-inner"
                    placeholder="agent@trinetra.ai"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-amber-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-amber-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:bg-amber-500/5 transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 relative flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 font-bold text-black transition-all hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed group overflow-hidden"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Create Account</span>
                  </>
                )}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              </button>
            </form>

            <div className="my-8 flex items-center justify-center space-x-4">
              <div className="h-px w-full bg-gradient-to-r from-transparent to-white/10"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Or Sign Up With</span>
              <div className="h-px w-full bg-gradient-to-l from-transparent to-white/10"></div>
            </div>

            <button
              onClick={handleGoogleSignup}
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-black/40 border border-white/5 py-4 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-all group"
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

          <p className="mt-8 text-center text-[13px] text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-amber-500 hover:text-amber-400 font-bold transition-colors">
              Sign In →
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
