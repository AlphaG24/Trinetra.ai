import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up — Trinetra AI',
  description: 'Sign up for a Trinetra AI account and start deploying Hinglish/multilingual voice agents for your business.'
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
