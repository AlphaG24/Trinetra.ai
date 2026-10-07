import { redirect } from 'next/navigation';

export default function NumbersRedirectPage() {
  redirect('/dashboard/phone-numbers');
}
