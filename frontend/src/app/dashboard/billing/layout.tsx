import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plans & Pricing — Trinetra AI',
  description: 'View plan packages, minutes pricing, active subscriptions, and billing invoices.'
}

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
