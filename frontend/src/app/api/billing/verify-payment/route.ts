import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendEmailTemplate } from '@/lib/email'
import { generateInvoicePdf } from '@/lib/pdf'
import fs from 'fs'
import path from 'path'
import { validateCoupon, recordCouponRedemption } from '@/lib/coupons'
import { calculateGSTBreakdown, validateGSTIN } from '@/lib/gst'

interface CartItem {
  type: 'subscription' | 'phone_number' | 'bundle' | 'number_pool' | 'number_renewal'
  key: string
  quantity: number
}

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('[Verify Payment] Unauthorized access attempt.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let body: any = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseErr) {
      console.warn('[Verify Payment] Could not parse request JSON body:', parseErr)
      return NextResponse.json({ error: 'Invalid or empty request payload' }, { status: 400 })
    }

    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      items, 
      use_same_profile,
      coupon_code,
      customer_gstin,
      customer_legal_name,
      save_gst_to_profile
    } = body as {
      razorpay_payment_id: string
      razorpay_order_id: string
      razorpay_signature: string
      items: CartItem[]
      use_same_profile?: boolean
      coupon_code?: string
      customer_gstin?: string
      customer_legal_name?: string
      save_gst_to_profile?: boolean
    }

    if (!items || items.length === 0) {
      console.warn('[Verify Payment] Cart items are empty.')
      return NextResponse.json({ error: 'Cart items are missing' }, { status: 400 })
    }
    
    const adminClient = getAdminClient()

    // 1. Fetch system configurations
    const { data: configs } = await adminClient.from('system_config').select('config_key, config_value')
    const config: Record<string, string> = {}
    configs?.forEach(c => { config[c.config_key] = c.config_value })
    
    const keySecret = config.razorpay_test_key_secret || config.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET
    
    if (!keySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
    }
    
    // 2. Verify payment signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')
    
    if (expectedSignature !== razorpay_signature) {
      console.error('[Verify Payment] Signature mismatch', { expected: expectedSignature, actual: razorpay_signature })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    console.log('[Verify Payment] 1F LOG: Signature verified successfully for order:', razorpay_order_id)

    // 3. Load active bundles
    const { data: activeBundles } = await adminClient
      .from('product_bundles')
      .select('*')
      .eq('is_active', true)

    const bundleMap: Record<string, any> = {}
    activeBundles?.forEach(b => { bundleMap[b.id] = b })
    
    // Load current profile
    const { data: profile, error: profileLoadError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileLoadError || !profile) {
      console.error('[Verify Payment] Error loading profile:', profileLoadError)
      return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 })
    }
    console.log('[Verify Payment] 1F LOG: Profile loaded successfully. Current plan tier:', profile.plan_tier)

    // Pricing details for invoices
    const subscriptionPrices: Record<string, number> = {
      starter: parseInt(config.starter_price_paisa || '499900', 10),
      professional: parseInt(config.professional_price_paisa || '1499900', 10),
      trial: parseInt(config.trial_price_paisa || '9900', 10)
    }
    const numberPrice = parseInt(config.inbound_number_cost_paisa || '49900', 10)

    // Plan limits mapping
    const planConfig: Record<string, { tier: string, minutes: number, days: number }> = {
      trial: {
        tier: 'trial',
        minutes: parseInt(config.trial_minutes || '50', 10),
        days: parseInt(config.trial_days || '7', 10)
      },
      starter: {
        tier: 'starter',
        minutes: parseInt(config.starter_minutes || '500', 10),
        days: 30
      },
      professional: {
        tier: 'professional',
        minutes: parseInt(config.professional_minutes || '2000', 10),
        days: 30
      }
    }

    // Resource tracking changes
    let planTierToSet = profile.plan_tier || 'free'
    let demoMinutesLimitToSet = profile.demo_minutes_limit || 10
    let paidMinutesLimitToSet = profile.paid_minutes_limit || 0
    let trialStartedAtToSet = profile.trial_started_at
    let trialEndsAtToSet = profile.trial_ends_at

    let additionalAgentsToAdd = 0
    let additionalNumbersToAdd = 0
    let firstAgentId: string | null = null

    // Setup invoice lines list
    const invoiceLines: any[] = []
    let totalPaidPaisa = 0

    // Gather quantities for bulk discounts calculation
    let totalAgentsQty = 0
    let totalNumbersQty = 0
    items.forEach(item => {
      if (item.type === 'subscription') totalAgentsQty += item.quantity
      if (item.type === 'phone_number') totalNumbersQty += item.quantity
    })

    const bulkAgentDiscount2 = parseInt(config.bulk_discount_2_agents_percent || '10', 10)
    const bulkAgentDiscount3 = parseInt(config.bulk_discount_3_agents_percent || '15', 10)
    const bulkNumberDiscount2 = parseInt(config.bulk_discount_2_numbers_percent || '5', 10)
    const bulkNumberDiscount3 = parseInt(config.bulk_discount_3plus_numbers_percent || '10', 10)

    const agentDiscountPercent = totalAgentsQty === 2 ? bulkAgentDiscount2 : (totalAgentsQty >= 3 ? bulkAgentDiscount3 : 0)
    const numberDiscountPercent = totalNumbersQty === 2 ? bulkNumberDiscount2 : (totalNumbersQty >= 3 ? bulkNumberDiscount3 : 0)

    // Process all items in cart
    for (const item of items) {
      if (item.type === 'subscription') {
        let tierKey = item.key.toLowerCase()
        if (tierKey.includes('professional') || tierKey.includes('pro')) {
          tierKey = 'professional'
        } else if (tierKey.includes('starter')) {
          tierKey = 'starter'
        } else if (tierKey.includes('trial')) {
          tierKey = 'trial'
        }

        const selectedPlan = planConfig[tierKey] || planConfig[item.key]
        if (selectedPlan) {
          planTierToSet = selectedPlan.tier
          demoMinutesLimitToSet = selectedPlan.tier === 'trial' ? selectedPlan.minutes : 10
          paidMinutesLimitToSet = selectedPlan.tier !== 'trial' ? selectedPlan.minutes : 0
          trialStartedAtToSet = selectedPlan.tier === 'trial' ? new Date().toISOString() : null
          trialEndsAtToSet = selectedPlan.tier === 'trial' ? new Date(Date.now() + selectedPlan.days * 86400000).toISOString() : null
        }

        const basePrice = subscriptionPrices[tierKey] || subscriptionPrices[item.key] || 0
        const totalRawPrice = basePrice * item.quantity
        const itemDiscount = Math.round(totalRawPrice * (agentDiscountPercent / 100))
        const finalPrice = totalRawPrice - itemDiscount
        totalPaidPaisa += finalPrice

        if (tierKey === 'trial') {
          const trialMeta = (body as any).trial_metadata || {}
          const targetCount = trialMeta.agentCount || 2
          const persList = Array.isArray(trialMeta.selectedPersonalities) && trialMeta.selectedPersonalities.length > 0
            ? trialMeta.selectedPersonalities.map((p: string) => p.replace('_', ' ')).join(', ')
            : 'Sales Executive, Customer Support'
          const targetPrice = trialMeta.targetPriceRupees || (targetCount === 1 ? 4999 : targetCount === 4 ? 19999 : 9999)
          const renewalDateStr = trialMeta.renewalDate
            ? new Date(trialMeta.renewalDate).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
            : new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

          invoiceLines.push({
            item: `7-Day All-Access Trial (${targetCount} Agent${targetCount > 1 ? 's' : ''} - ${persList})`,
            description: `Initial charge: ₹99.00 (0 CGST / 0 SGST). Upcoming autopay deduction: ₹${targetPrice.toLocaleString('en-IN')} + 18% GST (Total: ₹${Math.round(targetPrice * 1.18).toLocaleString('en-IN')}) scheduled on ${renewalDateStr}. Cancel anytime before then in billing settings.`,
            quantity: 1,
            rate: basePrice,
            discount: 0,
            amount: finalPrice,
            is_trial: true,
            invoice_type: 'trial'
          })

          // Instant auto-provisioning of selected trial personality agents
          const selectedPersonalities: string[] = Array.isArray(trialMeta.selectedPersonalities) && trialMeta.selectedPersonalities.length > 0
            ? trialMeta.selectedPersonalities
            : ['sales_agent', 'support_agent'].slice(0, targetCount)

          const trialDays = selectedPlan?.days || 7
          const trialExpiresAt = new Date(Date.now() + trialDays * 86400000).toISOString()
          const companyName = profile.company_name || profile.full_name || 'My Company'

          for (const roleId of selectedPersonalities) {
            const dbAgentType = roleId.toLowerCase()
            const agentTypeKey = dbAgentType.endsWith('_agent') ? dbAgentType : `${dbAgentType}_agent`

            let voiceId = 'shubh'
            let cleanName = roleId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

            if (dbAgentType.includes('support')) {
              voiceId = 'anushka'
              cleanName = 'Customer Support Agent'
            } else if (dbAgentType.includes('sales')) {
              voiceId = 'shubh'
              cleanName = 'Sales Executive Agent'
            } else if (dbAgentType.includes('appointment')) {
              voiceId = 'anushka'
              cleanName = 'Appointment Booking Agent'
            } else if (dbAgentType.includes('lead')) {
              voiceId = 'shubh'
              cleanName = 'Lead Qualifier Agent'
            } else if (dbAgentType.includes('multi')) {
              voiceId = 'shubh'
              cleanName = 'Multi-Personality Agent'
            } else if (dbAgentType.includes('anika') || dbAgentType.includes('vikram')) {
              voiceId = 'shubh'
              cleanName = 'Vikram - AI Voice Assistant'
            }

            const agentName = `[Trial] ${cleanName}`

            let systemPrompt = ''
            try {
              const promptFileName = (dbAgentType === 'anika-voice' || dbAgentType.includes('vikram'))
                ? 'vikram_sharma.txt'
                : `${agentTypeKey}.txt`
              const possiblePaths = [
                path.resolve(process.cwd(), '../backend/prompts', promptFileName),
                path.resolve(process.cwd(), 'backend/prompts', promptFileName),
                path.resolve('/app/backend/prompts', promptFileName),
              ]
              for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                  systemPrompt = fs.readFileSync(filePath, 'utf-8')
                  break
                }
              }
            } catch (e) {}

            if (!systemPrompt) {
              systemPrompt = `You are a helpful, courteous ${cleanName} for ${companyName}. Speak clearly and assist customers professionally.`
            }

            try {
              const businessDescription = profile.business_description || 'General business'
              const contextBlock = `=== BUSINESS CONTEXT ===\nBusiness Description: ${businessDescription}\nCompany Name: ${companyName}\nIndustry: ${profile.business_type || 'General'}\n========================\n\n`
              systemPrompt = contextBlock + systemPrompt
            } catch (e) {}

            const greetingMessage = (dbAgentType.includes('support') || dbAgentType.includes('appointment'))
              ? `Hello, main ${cleanName} bol rahi hoon ${companyName} se. Kaise help kar sakti hoon?`
              : `Hello, main ${cleanName} bol raha hoon ${companyName} se. Kaise help kar sakta hoon?`

            const agentPayload = {
              user_id: user.id,
              organization_id: profile.organization_id || null,
              name: agentName,
              agent_type: 'voice',
              voice_provider: 'sarvam',
              voice_id: voiceId,
              status: 'active',
              system_prompt: systemPrompt,
              greeting_message: greetingMessage,
              fallback_message: 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.',
              validity_days: trialDays,
              subscription_expires_at: trialExpiresAt,
              expiry_alerts_sent: [],
              config: {
                plan_tier: 'trial',
                target_plan: trialMeta.targetPlanSlug || 'starter',
                personality_role: roleId,
                slug: roleId,
                minutes_limit: 50
              }
            }

            const { data: newAgents, error: insertAgentErr } = await adminClient
              .from('agents')
              .insert(agentPayload)
              .select()

            if (insertAgentErr) {
              console.error('[Verify Payment] Trial Personality Agent Creation Error:', insertAgentErr)
            } else if (newAgents && newAgents.length > 0) {
              if (!firstAgentId) {
                firstAgentId = newAgents[0].id
              }
              console.log('[Verify Payment] Instantly created trial personality agent:', agentName)
            }
          }
        } else {
          invoiceLines.push({
            item: `${item.key.toUpperCase()} Subscription Plan Upgrade`,
            quantity: item.quantity,
            rate: basePrice,
            discount: itemDiscount,
            amount: finalPrice
          })
        }
      } else if (item.type === 'phone_number') {
        additionalNumbersToAdd += item.quantity

        const basePrice = numberPrice
        const totalRawPrice = basePrice * item.quantity
        const itemDiscount = Math.round(totalRawPrice * (numberDiscountPercent / 100))
        const finalPrice = totalRawPrice - itemDiscount
        totalPaidPaisa += finalPrice

        invoiceLines.push({
          item: 'Virtual Phone Number Slot',
          quantity: item.quantity,
          rate: basePrice,
          discount: itemDiscount,
          amount: finalPrice
        })
      } else if (item.type === 'number_pool') {
        // Pool Number Purchase Processing
        const { data: poolNumber } = await adminClient
          .from('phone_numbers')
          .select('*')
          .eq('id', item.key)
          .single()

        if (poolNumber) {
          const validityDays = poolNumber.validity_days || 30
          const renewalDateIso = new Date(Date.now() + validityDays * 86400000).toISOString()

          // 1. Mark pool number as assigned in phone_numbers
          await adminClient
            .from('phone_numbers')
            .update({
              status: 'active',
              is_assigned: true,
              organization_id: profile.organization_id,
              assigned_org_id: profile.organization_id,
              validity_days: validityDays,
              renewal_date: renewalDateIso,
              expiry_alerts_sent: [],
              metadata: {
                payment_id: razorpay_payment_id
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', poolNumber.id)

          // 2. Check if this is the organization's FIRST assigned number; if so, auto-assign to most recently created agent
          const { count: assignedCount } = await adminClient
            .from('phone_numbers')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)
            .eq('is_assigned', true)

          if (assignedCount === null || assignedCount === undefined || assignedCount <= 1) {
            const { data: recentAgent } = await adminClient
              .from('agents')
              .select('id, name')
              .eq('organization_id', profile.organization_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (recentAgent) {
              await adminClient
                .from('phone_numbers')
                .update({ assigned_agent_id: recentAgent.id })
                .eq('id', poolNumber.id)

              await adminClient
                .from('agent_phone_numbers')
                .upsert({
                  agent_id: recentAgent.id,
                  phone_number_id: poolNumber.id,
                  is_primary: true
                })

              await adminClient
                .from('agents')
                .update({
                  phone_number: poolNumber.phone_number,
                  telephony_provider: poolNumber.provider || 'sarvam'
                })
                .eq('id', recentAgent.id)

              console.log(`[First Number Auto-Assignment] Assigned ${poolNumber.phone_number} to recent agent ${recentAgent.name} (${recentAgent.id})`)
            }
          }

          // 3. Activity log
          await adminClient.from('activity_log').insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_provisioned',
            title: 'Phone Number Purchased from Pool',
            description: `Purchased number ${poolNumber.phone_number} (${poolNumber.city || 'Local'})`
          })

          const itemRate = poolNumber.retail_price_paisa || 29900
          const itemTotal = itemRate * item.quantity
          totalPaidPaisa += itemTotal

          invoiceLines.push({
            item: `Virtual Phone Number Purchase (${poolNumber.phone_number})`,
            quantity: item.quantity,
            rate: itemRate,
            discount: 0,
            amount: itemTotal
          })
        }
      } else if (item.type === 'number_renewal') {
        // Phone Number Renewal Processing
        const { data: phoneRow } = await adminClient
          .from('phone_numbers')
          .select('*')
          .eq('id', item.key)
          .single()

        if (phoneRow) {
          const validityDays = phoneRow.validity_days || 30
          const currentRenewal = phoneRow.renewal_date ? new Date(phoneRow.renewal_date).getTime() : Date.now()
          const baseTime = currentRenewal > Date.now() ? currentRenewal : Date.now()
          const newRenewalDateIso = new Date(baseTime + validityDays * 86400000).toISOString()

          // Extend renewal date on phone_numbers
          await adminClient
            .from('phone_numbers')
            .update({
              renewal_date: newRenewalDateIso,
              status: 'active',
              expiry_alerts_sent: [],
              updated_at: new Date().toISOString()
            })
            .eq('id', phoneRow.id)

          // Activity log
          await adminClient.from('activity_log').insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_renewed',
            title: 'Phone Number Renewed',
            description: `Extended subscription for ${phoneRow.phone_number} by ${validityDays} days`
          })

          const itemRate = phoneRow.retail_price_paisa || 29900
          const itemTotal = itemRate * item.quantity
          totalPaidPaisa += itemTotal

          invoiceLines.push({
            item: `Virtual Phone Number 30-Day Renewal (${phoneRow.phone_number})`,
            quantity: item.quantity,
            rate: itemRate,
            discount: 0,
            amount: itemTotal
          })
        }
      } else if (item.type === 'bundle') {
        const bundle = bundleMap[item.key]
        if (bundle) {
          // Increment bundle conversion count
          await adminClient
            .from('product_bundles')
            .update({ purchase_count: (bundle.purchase_count || 0) + item.quantity })
            .eq('id', bundle.id)

          // Parse bundle products content and increment limit slots
          const productsObj = bundle.products as any
          const productsList = Array.isArray(productsObj) 
            ? productsObj 
            : (productsObj?.items || [])

          for (const prod of productsList) {
            if (prod.type === 'agent') {
              additionalAgentsToAdd += prod.quantity * item.quantity

              for (let i = 0; i < prod.quantity * item.quantity; i++) {
                let dbAgentType = prod.agent_type
                if (!dbAgentType) {
                  // Fallback for old schema
                  dbAgentType = (i === 1) ? 'support' : 'sales'
                }

                const agentTypeKey = dbAgentType.endsWith('_agent') ? dbAgentType : `${dbAgentType}_agent`
                
                // Determine clean name and voice ID based on the agent type
                let voiceId = 'shubh'
                let cleanName = 'Sales Agent'
                
                if (dbAgentType === 'support') {
                  voiceId = 'anushka'
                  cleanName = 'Support Agent'
                } else if (dbAgentType === 'appointment') {
                  voiceId = 'shubh'
                  cleanName = 'Appointment Agent'
                } else if (dbAgentType === 'lead_qualifier') {
                  voiceId = 'shubh'
                  cleanName = 'Lead Qualifier'
                } else if (dbAgentType === 'multi_agent') {
                  voiceId = 'anushka'
                  cleanName = 'Multi Agent'
                }

                const agentName = `[${agentTypeKey}] ${cleanName}`
                const companyName = profile.company_name || profile.full_name || 'My Company'

                // Try loading template prompt file from backend/prompts/
                let systemPrompt = ''
                try {
                  const promptFileName = dbAgentType === 'lead_qualifier' || dbAgentType === 'multi_agent'
                    ? `${dbAgentType}.txt`
                    : `${agentTypeKey}.txt`
                  const possiblePaths = [
                    path.resolve(process.cwd(), '../backend/prompts', promptFileName),
                    path.resolve(process.cwd(), 'backend/prompts', promptFileName),
                    path.resolve('/app/backend/prompts', promptFileName),
                  ]
                  for (const filePath of possiblePaths) {
                    if (fs.existsSync(filePath)) {
                      systemPrompt = fs.readFileSync(filePath, 'utf-8')
                      break
                    }
                  }
                } catch (e) {
                  // ignore template lookup errors
                }

                if (!systemPrompt) {
                  systemPrompt = dbAgentType === 'support'
                    ? `You are a helpful customer support assistant for ${companyName}. Your name is ${cleanName}.`
                    : `You are a helpful ${cleanName} for ${companyName}. Your name is ${cleanName}.`
                }

                // Add business context if available
                try {
                  const businessDescription = profile.business_description || 'General business'
                  const contextBlock = `=== BUSINESS CONTEXT ===\nBusiness Description: ${businessDescription}\nCompany Name: ${companyName}\nIndustry: ${profile.business_type || 'General'}\n========================\n\n`
                  systemPrompt = contextBlock + systemPrompt
                } catch (e) {}

                const greetingMessage = dbAgentType === 'support'
                  ? `Hello, main ${cleanName} bol rahi hoon ${companyName} support team se. Kaise help kar sakti hoon?`
                  : `Hello, main ${cleanName} bol raha hoon ${companyName} se. Kaise hain aap?`

                const bundleValidityDays = bundle.validity_days || 30;
                const subscriptionExpiresAt = new Date(Date.now() + bundleValidityDays * 86400000).toISOString();

                const agentPayload = {
                  user_id: user.id,
                  organization_id: profile.organization_id || null,
                  name: agentName,
                  agent_type: 'voice',
                  voice_provider: 'sarvam',
                  voice_id: voiceId,
                  status: 'active',
                  system_prompt: systemPrompt,
                  greeting_message: greetingMessage,
                  fallback_message: 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.',
                  validity_days: bundleValidityDays,
                  subscription_expires_at: subscriptionExpiresAt,
                  expiry_alerts_sent: [],
                  config: {
                    plan_tier: prod.tier || (dbAgentType === 'multi_agent' ? 'professional' : 'starter'),
                    minutes_limit: 1000
                  }
                };

                const { data: newAgents, error: insertAgentErr } = await adminClient
                  .from('agents')
                  .insert(agentPayload)
                  .select()

                if (insertAgentErr) {
                  console.error('[Verify Payment] Bundle Agent Instant Creation Error:', insertAgentErr)
                } else if (newAgents && newAgents.length > 0) {
                  if (!firstAgentId) {
                    firstAgentId = newAgents[0].id
                  }
                  console.log('[Verify Payment] Instantly created and allotted bundle agent:', agentName)
                }
              }
            } else if (prod.type === 'phone_number') {
              const countNeeded = prod.quantity * item.quantity;
              additionalNumbersToAdd += countNeeded;

              // Claim numbers directly from pre-stocked admin inventory
              for (let i = 0; i < countNeeded; i++) {
                try {
                  const targetProvider = profile.country === 'IN' ? 'exotel' : 'twilio';
                  
                  // Query for an unassigned number in inventory for this provider
                  let { data: availableNumber } = await adminClient
                    .from('phone_numbers')
                    .select('*')
                    .eq('is_assigned', false)
                    .eq('status', 'available')
                    .eq('provider', targetProvider)
                    .limit(1)
                    .maybeSingle();

                  // Fallback to any unassigned available number in stock
                  if (!availableNumber) {
                    const { data: fallbackNum } = await adminClient
                      .from('phone_numbers')
                      .select('*')
                      .eq('is_assigned', false)
                      .eq('status', 'available')
                      .limit(1)
                      .maybeSingle();
                    availableNumber = fallbackNum;
                  }

                  if (availableNumber) {
                    // Claim and assign to this user's organization
                    await adminClient
                      .from('phone_numbers')
                      .update({
                        is_assigned: true,
                        status: 'active',
                        organization_id: profile.organization_id || null,
                        assigned_org_id: profile.organization_id || null,
                        assigned_at: new Date().toISOString()
                      })
                      .eq('id', availableNumber.id);

                    // If user has an agent that has no assigned number yet, auto-link it
                    if (profile.organization_id) {
                      const { data: orgAgents } = await adminClient
                        .from('agents')
                        .select('id')
                        .eq('organization_id', profile.organization_id)
                        .neq('status', 'deleted')
                        .limit(1);

                      if (orgAgents && orgAgents.length > 0) {
                        const agentId = orgAgents[0].id;
                        try {
                          await adminClient.from('agent_phone_numbers').insert({
                            agent_id: agentId,
                            phone_number_id: availableNumber.id,
                            is_primary: true
                          });
                          await adminClient.from('phone_numbers').update({ assigned_agent_id: agentId }).eq('id', availableNumber.id);
                        } catch (linkErr) {
                          console.warn('[Verify Payment] Could not auto-link agent to claimed number:', linkErr);
                        }
                      }
                    }

                    // Insert activity log
                    await adminClient.from("activity_log").insert({
                      user_id: user.id,
                      organization_id: profile.organization_id || null,
                      activity_type: 'number_provisioned',
                      title: 'Pack Phone Number Assigned',
                      description: `Assigned number ${availableNumber.phone_number} from purchased package`
                    });
                    console.log('[Verify Payment] Automatically assigned pre-stocked number from package:', availableNumber.phone_number);
                  } else {
                    console.log('[Verify Payment] Inventory currently empty; user credited with number entitlement slot to claim from catalog.');
                  }
                } catch (provisionErr: any) {
                  console.error('[Verify Payment] Failed to claim phone number during bundle payment:', provisionErr.message);
                }
              }
            }
          }

          // Determine highest tier from bundle products list to upgrade user plan
          let highestTier = 'starter'
          for (const prod of productsList) {
            const tierVal = (prod.tier || (prod.agent_type === 'multi_agent' ? 'professional' : 'starter')).toLowerCase()
            if (tierVal === 'professional' || tierVal === 'pro') {
              highestTier = 'professional'
            }
          }

          // If current tier is free or trial, upgrade to the bundle's highest tier
          if (planTierToSet === 'free' || planTierToSet === 'trial' || planTierToSet === 'free_demo') {
            planTierToSet = highestTier
            const selectedPlan = planConfig[highestTier]
            if (selectedPlan) {
              demoMinutesLimitToSet = 10
              paidMinutesLimitToSet = selectedPlan.minutes
              trialStartedAtToSet = null
              trialEndsAtToSet = null
            }
          }

          const totalRawPrice = bundle.bundle_price_paisa * item.quantity
          totalPaidPaisa += totalRawPrice

          invoiceLines.push({
            item: `Product Bundle: ${bundle.name}`,
            quantity: item.quantity,
            rate: bundle.bundle_price_paisa,
            discount: 0,
            amount: totalRawPrice
          })
        }
      }
    }

    // 3a. Onboarding & Setup Fee processing (if enabled in admin configs and not pure trial)
    const isPureTrial = items.length === 1 && items.some((item: any) => item.type === 'subscription' && (item.key === 'trial' || item.key.endsWith('_trial')))
    const onboardingFeeEnabled = config.onboarding_fee_enabled === 'true'
    const onboardingFeePaisa = (onboardingFeeEnabled && !isPureTrial)
      ? parseInt(config.onboarding_fee_paisa || '0', 10)
      : 0

    if (onboardingFeePaisa > 0) {
      totalPaidPaisa += onboardingFeePaisa
      invoiceLines.push({
        item: 'One-Time Onboarding & Setup Fee',
        quantity: 1,
        rate: onboardingFeePaisa,
        discount: 0,
        amount: onboardingFeePaisa
      })
    }

    // 3b. Coupon validation and discount line
    let couponDiscountPaisa = 0
    let validCouponCode = ''
    if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim()) {
      const cRes = await validateCoupon(adminClient, coupon_code.trim(), totalPaidPaisa / 100, user.id)
      if (cRes.isValid) {
        couponDiscountPaisa = cRes.discountAmountPaisa
        validCouponCode = cRes.coupon!.code
        invoiceLines.push({
          item: `Coupon Discount (${validCouponCode})`,
          quantity: 1,
          rate: -couponDiscountPaisa,
          discount: 0,
          amount: -couponDiscountPaisa
        })
      }
    }

    const taxablePaisa = Math.max(0, totalPaidPaisa - couponDiscountPaisa)

    // 3c. GST Calculation (Intra-state CGST+SGST vs Inter-state IGST)
    let cleanGSTIN = customer_gstin && typeof customer_gstin === 'string' && customer_gstin.trim()
      ? customer_gstin.trim().toUpperCase()
      : (profile.gst_number || profile.gstin || null)

    let customerStateCode = '07'
    let stateName = profile.state || 'Delhi'
    if (cleanGSTIN) {
      const gstinVal = validateGSTIN(cleanGSTIN)
      if (gstinVal.isValid) {
        customerStateCode = gstinVal.stateCode!
        stateName = gstinVal.state!
      }
    }

    const gstCalc = isPureTrial
      ? {
          isInterState: false,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalTaxAmount: 0,
          grandTotal: taxablePaisa
        }
      : calculateGSTBreakdown(taxablePaisa, cleanGSTIN ? customerStateCode : null)

    const taxPaisa = gstCalc.totalTaxAmount
    const finalTotalPaisa = isPureTrial ? taxablePaisa : (taxablePaisa + taxPaisa)

    // 4. Update profiles table with fallback checks
    const updates: Record<string, any> = {
      plan_tier: planTierToSet,
      demo_minutes_limit: demoMinutesLimitToSet,
      demo_minutes_used: 0,
      paid_minutes_limit: paidMinutesLimitToSet,
      paid_minutes_used: 0,
      trial_started_at: trialStartedAtToSet,
      trial_ends_at: trialEndsAtToSet,
      updated_at: new Date().toISOString()
    }

    if (isPureTrial) {
      const trialMeta = (body as any).trial_metadata || {}
      updates.mandate_status = 'scheduled'
      updates.mandate_id = razorpay_payment_id || razorpay_order_id
      updates.mandate_target_plan = trialMeta.targetPlanSlug || 'starter'
      updates.mandate_renewal_date = trialMeta.renewalDate || new Date(Date.now() + 7 * 86400000).toISOString()
      updates.mandate_target_price_paisa = (trialMeta.targetPriceRupees || 4999) * 100
      updates.mandate_personalities = trialMeta.selectedPersonalities || ['sales', 'support']
    } else if (planTierToSet !== 'free' && planTierToSet !== 'free_demo') {
      updates.mandate_status = 'active'
    }

    if (save_gst_to_profile && cleanGSTIN) {
      updates.gst_number = cleanGSTIN
      if (customer_legal_name) updates.company_name = customer_legal_name
      updates.state = stateName
    }

    // Support fallback increments if columns exist, otherwise safe defaults
    const currentAddAgents = profile.additional_agents || 0
    const currentAddNumbers = profile.additional_phone_numbers || 0

    updates.additional_agents = currentAddAgents + additionalAgentsToAdd
    updates.additional_phone_numbers = currentAddNumbers + additionalNumbersToAdd

    const { error: profileUpdateErr } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (profileUpdateErr) {
      console.error('[Verify Payment] Profiles Update Error:', profileUpdateErr)
      return NextResponse.json({ error: 'Failed to update plan limits' }, { status: 500 })
    }
    // Extend validity on active agents by 30 days upon paid plan upgrade or recurring renewal
    if (planTierToSet !== 'trial' && planTierToSet !== 'free' && planTierToSet !== 'free_demo') {
      try {
        const renewalExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString()
        let agentQuery = adminClient
          .from('agents')
          .update({
            subscription_expires_at: renewalExpiresAt,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .neq('status', 'deleted')

        if (profile.organization_id) {
          agentQuery = agentQuery.eq('organization_id', profile.organization_id)
        } else {
          agentQuery = agentQuery.eq('user_id', user.id)
        }
        await agentQuery
        console.log('[Verify Payment] Successfully extended subscription_expires_at for active agents to:', renewalExpiresAt)
      } catch (agentRenewErr) {
        console.warn('[Verify Payment] Could not extend agents subscription_expires_at:', agentRenewErr)
      }
    }

    // Record coupon redemption if applicable
    if (validCouponCode) {
      await recordCouponRedemption(
        adminClient,
        validCouponCode,
        user.id,
        razorpay_order_id,
        razorpay_payment_id,
        couponDiscountPaisa,
        totalPaidPaisa
      )
    }

    // 5. Create and save a single invoice with dynamic line items (VAK/ series per Task 11)
    const { count: totalInvoices } = await adminClient
      .from('invoices')
      .select('*', { count: 'exact', head: true })
    const seq = (totalInvoices || 0) + 1
    const vakInvoiceNumber = `VAK/26-27/${String(seq).padStart(5, '0')}`

    const { data: invoiceRecord, error: invoiceErr } = await adminClient
      .from('invoices')
      .insert({
        organization_id: profile.organization_id || null,
        invoice_number: vakInvoiceNumber,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        subscription_amount: taxablePaisa,
        tax_amount: taxPaisa,
        total_amount: finalTotalPaisa,
        line_items: invoiceLines,
        status: 'paid',
        payment_method: 'Razorpay Gateway',
        payment_id: razorpay_payment_id,
        payment_reference_id: razorpay_payment_id,
        paid_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        customer_legal_name: customer_legal_name || profile.company_name || profile.full_name || user.email,
        customer_gstin: cleanGSTIN || 'N/A',
        customer_state: stateName,
        customer_state_code: customerStateCode,
        customer_billing_address: {
          name: customer_legal_name || profile.full_name || '',
          company: customer_legal_name || profile.company_name || '',
          email: user.email,
          address: profile.address || '',
          city: profile.city || '',
          state: stateName,
          pincode: profile.pincode || '',
          country: profile.country || 'India'
        },
        place_of_supply: stateName,
        subtotal_paisa: taxablePaisa,
        cgst_rate_pct: gstCalc.cgstRate,
        cgst_amount_paisa: gstCalc.cgstAmount,
        sgst_rate_pct: gstCalc.sgstRate,
        sgst_amount_paisa: gstCalc.sgstAmount,
        igst_rate_pct: gstCalc.igstRate,
        igst_amount_paisa: gstCalc.igstAmount,
        total_tax_paisa: taxPaisa,
        grand_total_paisa: finalTotalPaisa,
        supplier_name: 'Vaakriti Technologies Private Limited',
        supplier_gstin: '07AAAAA0000A1Z5'
      })
      .select()
      .single()

    if (invoiceErr) {
      console.error('[Verify Payment] Invoices Insert Error:', invoiceErr)
      return NextResponse.json({ error: 'Failed to record invoice details' }, { status: 500 })
    }
    console.log('[Verify Payment] 1F LOG: Invoice record inserted successfully into DB:', invoiceRecord.invoice_number)


    // 6. Generate Invoice PDF buffer
    let pdfUrl = ''
    let pdfBase64 = ''

    try {
      console.log('[Verify Payment] 1F LOG: Generating Invoice HTML Buffer...')
      const pdfBuffer = generateInvoicePdf({
        invoiceNumber: invoiceRecord.invoice_number,
        date: new Date(invoiceRecord.created_at).toLocaleDateString('en-IN'),
        customerName: invoiceRecord.customer_legal_name || profile.full_name || user.email!,
        customerEmail: user.email!,
        customerAddress: `${invoiceRecord.customer_billing_address?.city || profile.city || ''}, ${invoiceRecord.customer_billing_address?.state || profile.state || ''}, ${profile.country || 'IN'}`.replace(/^,\s*/, '').replace(/,\s*,$/, ''),
        customerGstin: invoiceRecord.customer_gstin || 'N/A',
        subtotal: (taxablePaisa / 100).toFixed(2),
        tax: (taxPaisa / 100).toFixed(2),
        total: (finalTotalPaisa / 100).toFixed(2),
        paymentMethod: 'Razorpay',
        transactionId: razorpay_payment_id,
        placeOfSupply: invoiceRecord.place_of_supply || 'IN',
        amountInWords: 'Rupees ' + (finalTotalPaisa / 100).toLocaleString('en-IN') + ' Only',
        supplierName: invoiceRecord.supplier_name || 'Vaakriti Technologies Private Limited',
        supplierGstin: invoiceRecord.supplier_gstin || '07AAAAA0000A1Z5',
        items: invoiceLines.map((line: any) => ({
          quantity: line.quantity,
          description: line.item,
          rate: (line.rate / 100).toFixed(2),
          amount: (line.amount / 100).toFixed(2)
        }))
      })

      pdfBase64 = pdfBuffer.toString('base64')
      console.log('[Verify Payment] 1F LOG: Invoice PDF Buffer generated successfully.')

      // Ensure invoices storage bucket exists
      console.log('[Verify Payment] 1F LOG: Checking if storage bucket "invoices" exists...')
      const { data: buckets, error: listBucketsErr } = await adminClient.storage.listBuckets()
      if (listBucketsErr) {
        console.error('[Verify Payment] Error listing buckets:', listBucketsErr)
      }
      
      const hasBucket = buckets?.some(b => b.id === 'invoices')
      if (!hasBucket) {
        console.log('[Verify Payment] 1F LOG: Bucket "invoices" not found. Creating bucket...')
        const { error: createBucketErr } = await adminClient.storage.createBucket('invoices', { public: false })
        if (createBucketErr) {
          console.error('[Verify Payment] Error creating bucket:', createBucketErr)
        } else {
          console.log('[Verify Payment] 1F LOG: Bucket "invoices" created successfully.')
        }
      } else {
        console.log('[Verify Payment] 1F LOG: Bucket "invoices" already exists.')
      }

      // Upload PDF
      const pdfPath = `${invoiceRecord.id}.pdf`
      console.log('[Verify Payment] 1F LOG: Uploading invoice PDF to storage path:', pdfPath)
      const { error: uploadErr } = await adminClient.storage
        .from('invoices')
        .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) throw uploadErr
      console.log('[Verify Payment] 1F LOG: Invoice PDF uploaded successfully to Supabase Storage.')

      // Generate a signed URL for 3 months (7776000 seconds)
      const { data: signedData, error: signedUrlErr } = await adminClient.storage
        .from('invoices')
        .createSignedUrl(pdfPath, 7776000)

      if (signedUrlErr) throw signedUrlErr
      pdfUrl = signedData?.signedUrl || ''

      // Save PDF URL to invoice row
      await adminClient
        .from('invoices')
        .update({ pdf_url: pdfUrl })
        .eq('id', invoiceRecord.id)

      console.log('[Verify Payment] 1F LOG: Invoice PDF URL updated in DB:', pdfUrl)
    } catch (pdfErr: any) {
      console.error('[Verify Payment] PDF Generation/Upload failed:', pdfErr.message)
    }

    // Format line items for email
    const emailLineItems = invoiceLines.map((line: any) => ({
      quantity: line.quantity,
      description: line.item,
      subtext: '',
      rate: line.rate,
      amount: line.amount
    }))

    // Send invoice email receipt with attachment
    try {
      await sendEmailTemplate({
        to: user.email!,
        subject: `Tax Invoice ${invoiceRecord.invoice_number}`,
        templateName: 'invoice',
        variables: {
          invoice_number: invoiceRecord.invoice_number,
          company_name: invoiceRecord.supplier_name || 'Vaakriti Technologies Private Limited',
          company_address: 'India , Uttar Pradesh\\nKanpur Nagar , 208022',
          company_phone: '+91 9580619562',
          company_email: 'support@trinetraedu-ai.com',
          customer_name: profile.full_name || user.email!,
          customer_address: `${profile.city || ''}, ${profile.state || ''}, ${profile.country || 'IN'}`,
          customer_gstin: profile.gst_number || 'N/A',
          customer_email: user.email!,
          invoice_date: new Date(invoiceRecord.created_at).toLocaleDateString('en-IN'),
          due_date: new Date(invoiceRecord.due_date).toLocaleDateString('en-IN'),
          place_of_supply: profile.state || 'IN',
          payment_gateway: 'Razorpay',
          payment_method: 'Credit Card/UPI',
          payment_status: 'Paid',
          payment_status_lowercase: 'paid',
          transaction_id: razorpay_payment_id,
          subtotal: (totalPaidPaisa / 100).toFixed(2),
          cgst_rate: '9',
          cgst_amount: ((totalPaidPaisa * 0.09) / 100).toFixed(2),
          sgst_rate: '9',
          sgst_amount: ((totalPaidPaisa * 0.09) / 100).toFixed(2),
          total: (finalTotalPaisa / 100).toFixed(2),
          amount_in_words: 'Rupees ' + (finalTotalPaisa / 100).toLocaleString('en-IN') + ' Only'
        },
        lineItems: emailLineItems,
        attachments: pdfBase64 ? [{
          content: pdfBase64,
          filename: `invoice_${invoiceRecord.invoice_number}.pdf`
        }] : undefined
      })
    } catch (err: any) {
      console.error('[Verify Payment] Invoice email send error:', err.message)
    }

    // 6. Telegram notification
    if (profile.telegram_chat_id) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        const textMessage = `✅ Payment verified successfully!\nInvoice: ${invoiceRecord.invoice_number}\nAmount Paid: ₹${(finalTotalPaisa / 100).toFixed(2)}\nActive plan: ${planTierToSet.toUpperCase()}.\nThank you for choosing Trinetra AI!`
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.telegram_chat_id,
              text: textMessage
            })
          })
        } catch (err) {
          console.error('[Verify Payment] Telegram notification failure:', err)
        }
      }
    }

    const redirectUrl = firstAgentId ? `/dashboard/agents/${firstAgentId}/setup?bundle=true` : undefined
    const cleanCustomerAddress = typeof invoiceRecord.customer_address === 'string' && invoiceRecord.customer_address.trim().length > 0
      ? invoiceRecord.customer_address
      : [profile.address || profile.street, profile.city, profile.state, profile.pincode, profile.country || 'India'].filter(Boolean).join(', ') || 'India'

    return NextResponse.json({
      success: true,
      invoice_id: invoiceRecord.id,
      invoice_number: invoiceRecord.invoice_number,
      invoice: {
        ...invoiceRecord,
        customer_address: cleanCustomerAddress
      },
      redirect_url: redirectUrl
    })
  } catch (error: any) {
    console.error('[Verify Payment] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
