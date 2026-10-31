import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up — Vaakriti AI',
  description: 'Create your Vaakriti AI account to launch autonomous conversational voice agents.'
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
