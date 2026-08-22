import { redirect } from 'next/navigation'

/**
 * Legacy profile route — redirects to the unified Settings page.
 * The Profile tab inside /dashboard/settings handles all profile editing.
 */
export default function ProfileRedirectPage() {
  redirect('/dashboard/settings')
}
