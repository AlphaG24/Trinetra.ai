import { Suspense } from 'react'
import { OnboardingClient } from '@/src/components/onboarding/OnboardingClient'

export const metadata = {
  title: 'Onboarding | Trinetra AI',
  description: 'Complete your onboarding details to start using Trinetra AI.',
}

export default function OnboardingPage() {
  return (
    <div className="py-8 px-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<div className="flex items-center justify-center p-12 text-zinc-400">Loading Onboarding Wizard...</div>}>
        <OnboardingClient />
      </Suspense>
    </div>
  )
}
