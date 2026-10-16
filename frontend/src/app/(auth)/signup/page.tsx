'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login?mode=signup')
  }, [router])

  return (
    <div className="min-h-screen w-full bg-[#FAFAFC] flex items-center justify-center text-slate-500 text-xs font-medium">
      Redirecting to account creation...
    </div>
  )
}
