'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, Bot, PhoneCall, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return <div className="flex h-screen w-full bg-[#05050a]" />
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/settings/password-update`,
      })

      if (error) {
        toast.error(error.message || 'Failed to send reset email.')
        return
      }

      toast.success('Password reset email sent! Check your inbox.')
      router.push('/login')
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
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
            Recover your access and return to the command center.
          </motion.p>
        </div>

        <div className="absolute bottom-8 text-xs text-gray-600 tracking-widest uppercase font-semibold">
          © {new Date().getFullYear()} Trinetra AI. All Systems Operational.
        </div>
      </div>

      {/* Right Half - Reset Form */}
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
            <h2 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h2>
            <p className="text-gray-400 text-sm">Enter your email and we'll send you a recovery link.</p>
          </div>

          <motion.div
            className="bg-white/[0.02] backdrop-blur-3xl p-8 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

            <form onSubmit={handleReset} className="space-y-6">
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 relative flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 font-bold text-black transition-all hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed group overflow-hidden"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              </button>
            </form>
          </motion.div>

          <p className="mt-8 text-center text-[13px] text-gray-500">
            Remember your password?{' '}
            <a href="/login" className="text-amber-500 hover:text-amber-400 font-bold transition-colors">
              Sign In →
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
