import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login — Vaakriti AI',
  description: 'Log in to your Vaakriti AI account to control and deploy your intelligent voice agents.'
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
