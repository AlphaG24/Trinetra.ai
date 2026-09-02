import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendEmailTemplate } from '@/lib/email'
import { generateInvoicePdf } from '@/lib/pdf'
import fs from 'fs'
import path from 'path'

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
    
    const body = await request.json()
    console.log('[Verify Payment] 1F LOG: Payment verification start for user:', user.id, 'with email:', user.email)
    console.log('[Verify Payment] 1F LOG: Request payload details:', JSON.stringify(body))

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, items, use_same_profile } = body as {
      razorpay_payment_id: string
      razorpay_order_id: string
      razorpay_signature: string
      items: CartItem[]
      use_same_profile?: boolean
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
    
    const keySecret = config.razorpay_test_key_secret || config.razorpay_key_secret
    
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
        minutes: parseInt(config.trial_minutes || '100', 10),
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
        const selectedPlan = planConfig[item.key]
        if (selectedPlan) {
          planTierToSet = selectedPlan.tier
          demoMinutesLimitToSet = selectedPlan.tier === 'trial' ? selectedPlan.minutes : 10
          paidMinutesLimitToSet = selectedPlan.tier !== 'trial' ? selectedPlan.minutes : 0
          trialStartedAtToSet = selectedPlan.tier === 'trial' ? new Date().toISOString() : null
          trialEndsAtToSet = selectedPlan.tier === 'trial' ? new Date(Date.now() + selectedPlan.days * 86400000).toISOString() : null
        }

        const basePrice = subscriptionPrices[item.key] || 0
        const totalRawPrice = basePrice * item.quantity
        const itemDiscount = Math.round(totalRawPrice * (agentDiscountPercent / 100))
        const finalPrice = totalRawPrice - itemDiscount
        totalPaidPaisa += finalPrice

        invoiceLines.push({
          item: `${item.key.toUpperCase()} Subscription Plan Upgrade`,
          quantity: item.quantity,
          rate: basePrice,
          discount: itemDiscount,
          amount: finalPrice
        })
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
          const renewalDateIso = new Date(Date.now() + 30 * 86400000).toISOString()

          // 1. Mark pool number as assigned in phone_numbers
          await adminClient
            .from('phone_numbers')
            .update({
              status: 'active',
              is_assigned: true,
              organization_id: profile.organization_id,
              assigned_org_id: profile.organization_id,
              renewal_date: renewalDateIso,
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

          if (assignedCount === undefined || assignedCount <= 1) {
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
          const currentRenewal = phoneRow.renewal_date ? new Date(phoneRow.renewal_date).getTime() : Date.now()
          const baseTime = currentRenewal > Date.now() ? currentRenewal : Date.now()
          const newRenewalDateIso = new Date(baseTime + 30 * 86400000).toISOString()

          // Extend renewal date on phone_numbers
          await adminClient
            .from('phone_numbers')
            .update({
              renewal_date: newRenewalDateIso,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', phoneRow.id)

          // Activity log
          await adminClient.from('activity_log').insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_renewed',
            title: 'Phone Number Renewed',
            description: `Extended subscription for ${phoneRow.phone_number} by 30 days`
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
              additionalNumbersToAdd += prod.quantity * item.quantity

              // Automatically provision phone numbers JIT
              const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
              const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

              for (let i = 0; i < prod.quantity * item.quantity; i++) {
                try {
                  const fastApiBody = {
                    organization_id: profile.organization_id || null,
                    did_type: 'mobile',
                    provider: profile.country === 'IN' ? 'voicelink' : 'twilio',
                    user_id: user.id,
                    area_code: profile.country === 'IN' ? '022' : '212'
                  };

                  const backendResponse = await fetch(`${fastApiUrl}/api/numbers/provision`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${serviceRoleKey}`
                    },
                    body: JSON.stringify(fastApiBody)
                  });

                  if (backendResponse.ok) {
                    const backendData = await backendResponse.json();
                    const phoneData = backendData.data?.phone_number || backendData;
                    
                    // Insert activity log
                    await adminClient.from("activity_log").insert({
                      user_id: user.id,
                      organization_id: profile.organization_id || null,
                      activity_type: 'number_provisioned',
                      title: 'Phone Number Provisioned',
                      description: `Provisioned ${phoneData.phone_number || 'a number'} (${phoneData.city || 'local'}, ${phoneData.did_type || 'mobile'})`
                    });
                    console.log('[Verify Payment] Automatically provisioned number:', phoneData.phone_number);
                  } else {
                    console.error('[Verify Payment] Phone provisioning backend returned error:', await backendResponse.text());
                  }
                } catch (provisionErr: any) {
                  console.error('[Verify Payment] Failed to provision phone number during bundle payment:', provisionErr.message);
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

    const taxPaisa = Math.round(totalPaidPaisa * 0.18) // 18% GST total (9% CGST + 9% SGST)
    const finalTotalPaisa = totalPaidPaisa + taxPaisa

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
    console.log('[Verify Payment] 1F LOG: User profile limits updated successfully in DB:', JSON.stringify(updates))

    // 5. Create and save a single invoice with dynamic line items
    const { data: invoiceRecord, error: invoiceErr } = await adminClient
      .from('invoices')
      .insert({
        organization_id: profile.organization_id || null,
        invoice_number: `TRI-INV-${Date.now()}`,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        subscription_amount: totalPaidPaisa,
        tax_amount: taxPaisa,
        total_amount: finalTotalPaisa,
        line_items: invoiceLines,
        status: 'paid',
        payment_method: 'razorpay',
        payment_id: razorpay_payment_id,
        paid_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString()
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
        customerName: profile.full_name || user.email!,
        customerEmail: user.email!,
        customerAddress: `${profile.city || ''}, ${profile.state || ''}, ${profile.country || 'IN'}`.replace(/^,\s*/, '').replace(/,\s*,$/, ''),
        customerGstin: profile.gst_number || 'N/A',
        subtotal: (totalPaidPaisa / 100).toFixed(2),
        tax: (taxPaisa / 100).toFixed(2),
        total: (finalTotalPaisa / 100).toFixed(2),
        paymentMethod: 'Razorpay',
        transactionId: razorpay_payment_id,
        placeOfSupply: profile.state || 'IN',
        amountInWords: 'Rupees ' + (finalTotalPaisa / 100).toLocaleString('en-IN') + ' Only',
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
        subject: `Invoice ${invoiceRecord.invoice_number} from TRINETRAEDU-AI`,
        templateName: 'invoice',
        variables: {
          invoice_number: invoiceRecord.invoice_number.replace('TRI-INV-', ''),
          company_name: 'TRINETRAEDU-AI',
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
    return NextResponse.json({ success: true, invoice_id: invoiceRecord.id, redirect_url: redirectUrl })
  } catch (error: any) {
    console.error('[Verify Payment] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
