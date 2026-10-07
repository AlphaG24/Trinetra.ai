/**
 * Deletes a partner from BOTH auth.users AND the partners table.
 * Usage: node scripts/delete-partner.mjs <email>
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const email = process.argv.filter(arg => !arg.startsWith('--'))[2]
if (!email) {
  console.error('Usage: node scripts/delete-partner.mjs <email> --confirm')
  process.exit(1)
}

if (!process.argv.includes('--confirm')) {
  console.error('⚠️  SAFETY GUARD: To prevent accidental production deletions, pass --confirm to proceed.')
  console.error('Example: node scripts/delete-partner.mjs test@example.com --confirm')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in environment.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)


console.log(`\n🔍 Looking up user with email: ${email}`)

// 1. Find in auth.users
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
if (listError) {
  console.error('❌ Failed to list users:', listError.message)
  process.exit(1)
}

const authUser = users.find(u => u.email === email)

if (!authUser) {
  console.log('ℹ️  No auth user found with that email.')
} else {
  console.log(`✅ Found auth user: ${authUser.id}`)

  // 2. Delete from partners table
  const { error: partnerDelError } = await supabase
    .from('partners')
    .delete()
    .or(`user_id.eq.${authUser.id},auth_user_id.eq.${authUser.id},email.eq.${email}`)

  if (partnerDelError) {
    console.error('⚠️  Partner row delete error:', partnerDelError.message)
  } else {
    console.log('✅ Deleted partner record (if it existed)')
  }

  // 3. Delete from partner_referrals
  const { error: refDelError } = await supabase
    .from('partner_referrals')
    .delete()
    .eq('partner_id', authUser.id)

  if (refDelError) {
    console.log('⚠️  Referrals delete (non-critical):', refDelError.message)
  }

  // 4. Delete from auth.users
  const { error: authDelError } = await supabase.auth.admin.deleteUser(authUser.id)
  if (authDelError) {
    console.error('❌ Failed to delete auth user:', authDelError.message)
  } else {
    console.log('✅ Deleted auth user')
  }
}

// Also try deleting any partner row by email alone (in case user_id didn't match)
const { error: emailDelError } = await supabase
  .from('partners')
  .delete()
  .eq('email', email)

if (!emailDelError) {
  console.log('✅ Cleaned up any orphaned partner rows by email')
}

console.log('\n🎉 Done! You can now re-register with this email.\n')
