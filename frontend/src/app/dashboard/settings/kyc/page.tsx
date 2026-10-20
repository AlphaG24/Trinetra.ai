import { redirect } from 'next/navigation'

export default function SettingsKycRedirectPage() {
  redirect('/dashboard/kyc')
}
