"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function registerPartner(formData: any) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  let userId: string | null = null;

  // Step 1: Create the auth user via admin API (auto-confirms email)
  const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // Auto-confirm so they can log in immediately
    user_metadata: {
      full_name: formData.fullName,
      company_name: formData.company,
    },
  });

  if (adminAuthError) {
    // If user already exists in auth, try to recover
    if (adminAuthError.message.toLowerCase().includes('already') ||
        adminAuthError.message.toLowerCase().includes('exists') ||
        adminAuthError.message.toLowerCase().includes('duplicate')) {

      // Try to sign in — if the password matches, we can still create the partner record
      const { data: signInData, error: signInErr } = await supabaseAuth.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInErr || !signInData.session) {
        return { error: 'An account with this email already exists. Please use the login page, or check your password.' };
      }

      userId = signInData.user?.id ?? null;

      if (!userId) {
        return { error: 'An account with this email already exists. Please use the login page.' };
      }

      // Check if partner record exists
      const { data: existingPartner } = await supabaseAdmin
        .from('partners')
        .select('id')
        .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle();

      if (existingPartner) {
        // Everything exists, just redirect to dashboard
        return { success: true };
      }

      // Auth user exists but no partner record — fall through to create it below
    } else {
      return { error: adminAuthError.message };
    }
  } else {
    userId = adminAuth.user?.id ?? null;
  }

  if (!userId) {
    return { error: 'Failed to create user account.' };
  }

  // Step 2: Sign in the user so they get a session cookie
  const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (signInError) {
    console.error('Auto sign-in after signup failed:', signInError.message);
    // Return error if they couldn't be signed in
    return { error: 'Account created but failed to sign in automatically. Please log in.' };
  }

  // Step 3: Check if partner record already exists
  const { data: existing } = await supabaseAdmin
    .from('partners')
    .select('id')
    .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
    .maybeSingle();

  if (existing) {
    return { success: true };
  }

  // Step 4: Create partner record in the database
  const referralCode = 'TRIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const { error: insertError } = await supabaseAdmin.from('partners').insert({
    user_id: userId,
    auth_user_id: userId,
    email: formData.email,
    full_name: formData.fullName,
    company_name: formData.company || null,
    phone: formData.phone || null,
    referral_code: referralCode,
    status: 'active',
    commission_currency: 'INR',
    currency: 'INR',
  });

  if (insertError) {
    console.error('Partner insert error:', JSON.stringify(insertError));
    return { error: `Failed to create partner profile: ${insertError.message}` };
  }

  return { success: true };
}
