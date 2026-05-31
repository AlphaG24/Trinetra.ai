'use server';

import { randomBytes } from 'crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

function buildReferralCode(email?: string | null) {
  const base = (email ?? 'partner')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, 'X');

  return `${base}${randomBytes(2).toString('hex').toUpperCase()}`;
}

export async function joinPartnerProgram() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: existingPartner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingPartner) {
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const referralCode = buildReferralCode(user.email);
      const { error } = await supabase.from('partners').insert({
        user_id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
        referral_code: referralCode,
      });

      if (!error) {
        break;
      }

      lastError = error.message;
    }

    if (lastError) {
      throw new Error(lastError);
    }
  }

  revalidatePath('/partners');
  redirect('/partners');
}
