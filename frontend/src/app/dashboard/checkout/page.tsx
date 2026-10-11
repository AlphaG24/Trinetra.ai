'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bot, CreditCard, Check, ArrowLeft, ShieldCheck, Clock, Phone, BarChart3, Zap, Plus, Minus, Trash2, Gift, ShoppingCart, Tag, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Script from 'next/script'
import { createClient } from '@/utils/supabase/client'
import PaymentSuccessInvoiceModal, { InvoiceData } from '@/components/billing/PaymentSuccessInvoiceModal'
import { useAuth } from '@/src/components/providers/AuthProvider'
import CheckoutPromoAndGSTSection, { AppliedCouponInfo } from '@/components/checkout/CheckoutPromoAndGSTSection'
import { calculateGSTBreakdown } from '@/lib/gst'

interface SystemConfigs {
  trial_minutes?: string
  trial_days?: string
  trial_price_paisa?: string
  starter_price_paisa?: string
  professional_price_paisa?: string
  inbound_number_cost_paisa?: string
  bulk_discount_2_agents_percent?: string
  bulk_discount_3_agents_percent?: string
  bulk_discount_2_numbers_percent?: string
  bulk_discount_3plus_numbers_percent?: string
  onboarding_fee_enabled?: string
  onboarding_fee_paisa?: string
}

interface Bundle {
  id: string
  name: string
  description: string
  products: any[]
  individual_price_paisa: number
  bundle_price_paisa: number
  discount_percent: number
  is_active: boolean
}

interface CartItem {
  type: 'subscription' | 'phone_number' | 'bundle'
  key: string
  quantity: number
  name: string
  price: number // in Rupees
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [configs, setConfigs] = useState<SystemConfigs>({})
  const [availableBundles, setAvailableBundles] = useState<Bundle[]>([])
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [useSameProfile, setUseSameProfile] = useState<boolean>(true)
  const checkoutInProgress = useRef(false)

  // Coupon & GST State
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null)
  const [isClaimingGst, setIsClaimingGst] = useState<boolean>(false)
  const [gstin, setGstin] = useState<string>('')
  const [legalName, setLegalName] = useState<string>('')
  const [saveGstToProfile, setSaveGstToProfile] = useState<boolean>(true)

  // Populate GST details from profile if present
  useEffect(() => {
    if (profile) {
      const p = profile as any
      if (p.gst_number || p.gstin) {
        setGstin(p.gst_number || p.gstin || '')
        setIsClaimingGst(true)
      }
      if (p.company_name) {
        setLegalName(p.company_name)
      }
    }
  }, [profile])

  const [invoiceModal, setInvoiceModal] = useState<{
    isOpen: boolean
    status: 'verifying' | 'success' | 'error'
    title?: string
    errorMessage?: string
    paymentId?: string
    invoice?: InvoiceData | null
    invoiceId?: string
    onContinueAction?: () => void
    continueLabel?: string
  }>({
    isOpen: false,
    status: 'verifying',
    invoice: null
  })

  // 1. Initial Load & Restore Cart
  useEffect(() => {
    async function initCheckout() {
      try {
        const supabase = createClient()
        
        // Fetch config & bundles in parallel
        const [configRes, bundlesRes] = await Promise.all([
          fetch('/api/dashboard/config'),
          supabase.from('product_bundles').select('*').eq('is_active', true)
        ])

        let sysConfigs: SystemConfigs = {}
        if (configRes.ok) {
          const data = await configRes.json()
          sysConfigs = data.configs || {}
          setConfigs(sysConfigs)
        }

        if (bundlesRes.data) {
          setAvailableBundles(bundlesRes.data)
        }

        // Restore Cart from localStorage
        let restoredCart: CartItem[] = []
        const savedCart = localStorage.getItem('trinetra-cart')
        if (savedCart) {
          try {
            restoredCart = JSON.parse(savedCart)
          } catch (e) {
            console.error('Failed to parse saved cart:', e)
          }
        }

        // Read query parameters
        const agentSlug = searchParams?.get('agent')
        const planTier = searchParams?.get('plan')

        if (agentSlug && planTier) {
          // Resolve agent metadata
          const { data: serviceData } = await supabase
            .from('platform_services')
            .select('*')
            .eq('slug', agentSlug)
            .maybeSingle()

          const agentName = serviceData?.name || 'AI Agent'
          
          // Resolve price
          let price = 99
          if (planTier === 'starter') {
            price = parseInt(sysConfigs.starter_price_paisa || '499900', 10) / 100
          } else if (planTier === 'professional') {
            price = parseInt(sysConfigs.professional_price_paisa || '1499900', 10) / 100
          } else {
            price = parseInt(sysConfigs.trial_price_paisa || '9900', 10) / 100
          }

          const itemKey = `${agentSlug}_${planTier}`
          let displayName = `${agentName} (${planTier.toUpperCase()} Upgrade)`

          if (planTier === 'trial') {
            const personalitiesParam = searchParams.get('personalities')
            const countParam = searchParams.get('count')
            if (personalitiesParam) {
              const formattedList = decodeURIComponent(personalitiesParam)
                .split(',')
                .map(p => p.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                .join(', ')
              displayName = `7-Day Trial (${countParam || '2'} Agents: ${formattedList})`
            } else {
              displayName = `${agentName} (7-Day Trial)`
            }
          }

          // Check if this subscription is already in the cart
          const exists = restoredCart.some(item => item.type === 'subscription' && item.key === itemKey)
          if (!exists) {
            // Remove other subscriptions to prevent conflicting tier upgrades of the SAME agent
            const filteredCart = restoredCart.filter(item => !item.key.startsWith(agentSlug))
            restoredCart = [...filteredCart, {
              type: 'subscription',
              key: itemKey,
              name: displayName,
              price,
              quantity: 1
            }]
          } else {
            // Update displayName and price if user re-selected different personalities
            restoredCart = restoredCart.map(item =>
              item.key === itemKey ? { ...item, name: displayName, price } : item
            )
          }

          // Save cart to local storage and update state
          localStorage.setItem('trinetra-cart', JSON.stringify(restoredCart))
          
          // Clear query params from url so refresh doesn't duplicate
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }

        setCart(restoredCart)
      } catch (err) {
        console.error('Failed to initialize checkout page:', err)
      } finally {
        setLoading(false)
      }
    }

    initCheckout()
  }, [searchParams])

  // Cart helper functions
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart)
    localStorage.setItem('trinetra-cart', JSON.stringify(updatedCart))
  }

  const addToCart = (type: 'subscription' | 'phone_number' | 'bundle', key: string, name: string, price: number) => {
    const updatedCart = [...cart]
    const existingIndex = updatedCart.findIndex(item => item.type === type && item.key === key)

    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += 1
    } else {
      updatedCart.push({ type, key, name, price, quantity: 1 })
    }
    
    saveCartToStorage(updatedCart)
    toast.success(`${name} added to cart`)
  }

  const updateQuantity = (index: number, delta: number) => {
    const updatedCart = [...cart]
    updatedCart[index].quantity += delta
    if (updatedCart[index].quantity <= 0) {
      updatedCart.splice(index, 1)
      toast.error('Item removed from cart')
    }
    saveCartToStorage(updatedCart)
  }

  const removeFromCart = (index: number) => {
    const updatedCart = [...cart]
    const name = updatedCart[index].name
    updatedCart.splice(index, 1)
    saveCartToStorage(updatedCart)
    toast.error(`${name} removed`)
  }

  // Coupon Handlers
  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    try {
      const prices = calculateRawSubtotal()
      const res = await fetch('/api/billing/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal: prices.discountedSubtotal
        })
      })
      const data = await res.json()
      if (!res.ok || !data.isValid) {
        toast.error(data.error || 'Invalid coupon code')
        return false
      }

      setAppliedCoupon({
        code: data.coupon.code,
        title: data.coupon.title,
        discountRupees: data.discountAmountRupees,
        discountPaisa: data.discountAmountPaisa,
        discount_type: data.coupon.discount_type,
        discount_value: data.coupon.discount_value
      })
      toast.success(`Coupon ${data.coupon.code} applied! Saved ₹${data.discountAmountRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
      return true
    } catch (err: any) {
      toast.error(err.message || 'Error validating coupon')
      return false
    }
  }

  const handleRemoveCoupon = () => {
    if (appliedCoupon) {
      toast.info(`Coupon ${appliedCoupon.code} removed`)
      setAppliedCoupon(null)
    }
  }

  // Price calculations
  const calculateRawSubtotal = () => {
    let subtotal = 0
    let discount = 0
    let totalAgentsQty = 0
    let totalNumbersQty = 0

    cart.forEach(item => {
      if (item.type === 'subscription') {
        totalAgentsQty += item.quantity
      } else if (item.type === 'phone_number') {
        totalNumbersQty += item.quantity
      }
    })

    const bulkAgentDiscount2 = parseInt(configs.bulk_discount_2_agents_percent || '10', 10)
    const bulkAgentDiscount3 = parseInt(configs.bulk_discount_3_agents_percent || '15', 10)
    const bulkNumberDiscount2 = parseInt(configs.bulk_discount_2_numbers_percent || '5', 10)
    const bulkNumberDiscount3 = parseInt(configs.bulk_discount_3plus_numbers_percent || '10', 10)

    const agentDiscountPercent = totalAgentsQty === 2 ? bulkAgentDiscount2 : (totalAgentsQty >= 3 ? bulkAgentDiscount3 : 0)
    const numberDiscountPercent = totalNumbersQty === 2 ? bulkNumberDiscount2 : (totalNumbersQty >= 3 ? bulkNumberDiscount3 : 0)

    cart.forEach(item => {
      const itemSubtotal = item.price * item.quantity
      subtotal += itemSubtotal

      if (item.type === 'subscription') {
        discount += Math.round(itemSubtotal * (agentDiscountPercent / 100))
      } else if (item.type === 'phone_number') {
        discount += Math.round(itemSubtotal * (numberDiscountPercent / 100))
      }
    })

    const discountedSubtotal = subtotal - discount
    return { subtotal, discount, discountedSubtotal }
  }

  const calculateCartPrices = () => {
    const { subtotal, discount, discountedSubtotal } = calculateRawSubtotal()
    const couponDiscount = appliedCoupon ? appliedCoupon.discountRupees : 0
    const baseAmount = Math.max(0, discountedSubtotal - couponDiscount)

    const isTrialOnly = cart.length > 0 && cart.every(item =>
      (item.name || '').toLowerCase().includes('trial') ||
      (item.key || '').toLowerCase().includes('trial')
    )

    const onboardingFeeEnabled = configs.onboarding_fee_enabled === 'true'
    const rawOnboardingFeePaisa = parseInt(configs.onboarding_fee_paisa || '0', 10)
    const onboardingFeeRupees = (onboardingFeeEnabled && !isTrialOnly)
      ? Math.round(rawOnboardingFeePaisa / 100)
      : 0

    if (isTrialOnly) {
      return {
        subtotal,
        discount,
        discountedSubtotal,
        couponDiscount,
        onboardingFee: 0,
        onboardingFeeEnabled: false,
        taxableSubtotal: baseAmount,
        isInterState: false,
        stateName: 'Delhi',
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        total: baseAmount,
        isTrial: true
      }
    }

    const taxableSubtotal = baseAmount + onboardingFeeRupees

    const cleanGst = isClaimingGst && gstin.trim().length === 15 ? gstin.trim().toUpperCase() : null
    const stateCode = cleanGst ? cleanGst.substring(0, 2) : '07'

    const gstBreakdown = calculateGSTBreakdown(taxableSubtotal * 100, cleanGst ? stateCode : null)
    const total = taxableSubtotal + (gstBreakdown.totalTaxAmount / 100)

    return {
      subtotal,
      discount,
      discountedSubtotal,
      couponDiscount,
      onboardingFee: onboardingFeeRupees,
      onboardingFeeEnabled,
      taxableSubtotal,
      isInterState: gstBreakdown.isInterState,
      stateName: gstBreakdown.stateName,
      cgst: gstBreakdown.cgstAmount / 100,
      sgst: gstBreakdown.sgstAmount / 100,
      igst: gstBreakdown.igstAmount / 100,
      totalTax: gstBreakdown.totalTaxAmount / 100,
      total,
      isTrial: false
    }
  }

  const handleCheckout = async () => {
    if (checkoutInProgress.current || processing) return
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (typeof window === 'undefined' || !(window as any).Razorpay) {
      toast.error('Payment gateway is still loading. Please try again.')
      return
    }

    checkoutInProgress.current = true
    setProcessing(true)

    try {
      const formattedItems = cart.map(item => ({
        type: item.type,
        key: item.key,
        quantity: item.quantity
      }))

      // 1. Create Checkout Order
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: formattedItems,
          use_same_profile: useSameProfile,
          coupon_code: appliedCoupon?.code,
          customer_gstin: isClaimingGst && gstin.trim().length === 15 ? gstin.trim().toUpperCase() : undefined,
          customer_legal_name: isClaimingGst && legalName.trim() ? legalName.trim() : undefined,
          save_gst_to_profile: saveGstToProfile
        })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout')
      }

      // 2. Open Razorpay Modal
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'trinetraedu-ai',
        description: 'Provision voice agents & lines',
        order_id: data.order_id,
        prefill: {
          email: data.user_email,
          name: data.user_name
        },
        handler: async function (response: any) {
          // Open high-trust loader modal immediately with no-refresh warning
          setInvoiceModal({
            isOpen: true,
            status: 'verifying',
            title: 'Verifying Payment & Generating Invoice...',
            paymentId: response.razorpay_payment_id,
            invoice: null
          })

          try {
            // 3. Verify payment signature on server
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                items: formattedItems,
                use_same_profile: useSameProfile,
                coupon_code: appliedCoupon?.code,
                customer_gstin: isClaimingGst && gstin.trim().length === 15 ? gstin.trim().toUpperCase() : undefined,
                customer_legal_name: isClaimingGst && legalName.trim() ? legalName.trim() : undefined,
                save_gst_to_profile: saveGstToProfile
              })
            })

            if (verifyRes.ok) {
              toast.success('Payment verified! Provisioning your AI agents...')
              let lastCreatedId = ''

              // 4. Provision all purchased agents
              for (const item of cart) {
                if (item.type === 'subscription') {
                  const parts = item.key.split('_')
                  const agentSlug = parts[0]
                  const planTier = parts[1]
                  
                  try {
                    const industryTemplate = searchParams?.get('industry_template') || undefined
                    const createRes = await fetch('/api/agents/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        agent_type: agentSlug,
                        name: item.name.replace(/\s*\([^)]+\)\s*$/g, ''),
                        is_trial: planTier === 'trial',
                        industry_template: industryTemplate
                      })
                    })
                    
                    const createData = await createRes.json()
                    if (createRes.ok) {
                      lastCreatedId = createData.agent?.id || createData.id
                    }
                  } catch (err) {
                    console.error('Failed to create agent:', item.name, err)
                  }
                }
              }

              const verifyData = await verifyRes.json().catch(() => ({}))

              // Clear Cart from localStorage only on successful completion
              localStorage.removeItem('trinetra-cart')
              setCart([])
              toast.success('Resources provisioned successfully!')

              const destUrl = verifyData.redirect_url || (lastCreatedId ? `/dashboard/agents/${lastCreatedId}/setup` : '/dashboard/agents')

              // Show on-screen printable and downloadable invoice immediately!
              setInvoiceModal({
                isOpen: true,
                status: 'success',
                paymentId: response.razorpay_payment_id,
                invoice: verifyData.invoice,
                invoiceId: verifyData.invoice_id,
                continueLabel: 'Continue to Setup / Dashboard',
                onContinueAction: () => {
                  setInvoiceModal(prev => ({ ...prev, isOpen: false }))
                  window.location.href = destUrl
                }
              })
            } else {
              const errorData = await verifyRes.json()
              setInvoiceModal({
                isOpen: true,
                status: 'error',
                errorMessage: errorData.error || 'Payment verification failed. Contact support.',
                paymentId: response.razorpay_payment_id
              })
              setProcessing(false)
              checkoutInProgress.current = false
            }
          } catch (vErr: any) {
            setInvoiceModal({
              isOpen: true,
              status: 'error',
              errorMessage: vErr.message || 'Payment verification failed',
              paymentId: response.razorpay_payment_id
            })
            setProcessing(false)
            checkoutInProgress.current = false
          }
        },
        modal: {
          ondismiss: function () {
            checkoutInProgress.current = false
            setProcessing(false)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed. Please try again.')
      checkoutInProgress.current = false
      setProcessing(false)
    }
  }

  const formatRawRupees = (rupees: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(rupees)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white" />
      </div>
    )
  }

  const phonePrice = parseInt(configs.inbound_number_cost_paisa || '49900', 10) / 100
  const cartPrices = calculateCartPrices()
  const subscriptionCount = cart.filter(item => item.type === 'subscription').length

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-[var(--body)] text-left px-4 font-montserrat">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--heading)] transition cursor-pointer mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--heading)] font-display">
          Complete Your Purchase
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1">
          Review your resources, add phone numbers or bundles, and verify securely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Cart Items & Extra Provisions (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Cart Details Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-[var(--heading)] font-display flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-4">
              <ShoppingCart className="w-4 h-4 text-zinc-900 dark:text-white" />
              Order Items
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted)]">
                <p className="text-xs">Your shopping cart is empty.</p>
                <Link href="/dashboard/marketplace" className="text-xs text-zinc-600 dark:text-zinc-400 font-bold hover:underline mt-2 inline-block">
                  Go to Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3.5 bg-[var(--background)] border border-[var(--border)] rounded-xl relative group">
                    <div className="flex items-center gap-3">
                      {/* Delete Button on the LEFT */}
                      <button
                        onClick={() => removeFromCart(index)}
                        aria-label="Remove item"
                        className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div>
                        <span className="text-xs font-bold text-[var(--heading)] block">{item.name}</span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono font-bold">{formatRawRupees(item.price)} each</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Quantity Controls */}
                      {item.type !== 'subscription' ? (
                        <div className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="p-1 text-[var(--muted)] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold px-1">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="p-1 text-[var(--muted)] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-[var(--muted)] px-2">Qty: 1</span>
                      )}
                      
                      <span className="text-xs font-mono font-bold text-[var(--heading)] w-20 text-right">
                        {formatRawRupees(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional provisioning and Add-ons */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-sm text-[var(--heading)] font-display flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-900 dark:text-white" />
                Add-on Virtual Numbers
              </h3>
              <p className="text-[10px] text-[var(--muted)] mt-1">Add dedicated phone lines to route calls directly to your agents.</p>
              <div className="mt-3 flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <div>
                  <span className="text-xs font-bold text-[var(--heading)]">Local Dedicated Line</span>
                  <span className="text-[10px] text-[var(--muted)] block">₹{phonePrice}/mo per line</span>
                </div>
                <button
                  onClick={() => addToCart('phone_number', 'phone_number', 'Extra Virtual Phone Number', phonePrice)}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Add Number
                </button>
              </div>
            </div>

            {availableBundles.length > 0 && (
              <div className="border-t border-[var(--border)] pt-6">
                <h3 className="font-bold text-sm text-[var(--heading)] font-display flex items-center gap-2">
                  <Gift className="w-4 h-4 text-zinc-900 dark:text-white" />
                  Special Discount Bundles
                </h3>
                <p className="text-[10px] text-[var(--muted)] mt-1">Unlock multiple agent slots & lines at a bundled rate.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  {availableBundles.map(b => (
                    <div key={b.id} className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-[var(--heading)] line-clamp-1">{b.name}</span>
                          <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                            Save {b.discount_percent}%
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2">{b.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--border)]/40 pt-2.5">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">₹{b.bundle_price_paisa / 100}</span>
                        <button
                          onClick={() => addToCart('bundle', b.id, b.name, b.bundle_price_paisa / 100)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer active:scale-[0.98]"
                        >
                          Add Bundle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Promo Code & GST Section */}
          {cart.length > 0 && (
            <CheckoutPromoAndGSTSection
              subtotalRupees={cartPrices.discountedSubtotal}
              appliedCoupon={appliedCoupon}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              isClaimingGst={isClaimingGst}
              onToggleClaimGst={setIsClaimingGst}
              gstin={gstin}
              onGstinChange={setGstin}
              legalName={legalName}
              onLegalNameChange={setLegalName}
              saveGstToProfile={saveGstToProfile}
              onToggleSaveGst={setSaveGstToProfile}
            />
          )}
        </div>

        {/* Right Side: Payment Panel & Price calculations (1 col) */}
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6 sticky top-6">
            <div className="text-center pb-4 border-b border-[var(--border)]">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-[var(--heading)]">Razorpay Secure Checkout</h3>
              <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-1">
                UPI, Cards, and Netbanking accepted.
              </p>
            </div>

            {/* Calculations */}
            {cart.length > 0 ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Subtotal:</span>
                  <span className="font-mono font-medium">{formatRawRupees(cartPrices.subtotal)}</span>
                </div>
                
                {cartPrices.discount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Quantity Bulk Discount:</span>
                    <span className="font-mono font-bold">-{formatRawRupees(cartPrices.discount)}</span>
                  </div>
                )}

                {cartPrices.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold animate-in fade-in duration-200">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Promo Discount ({appliedCoupon?.code}):</span>
                    </span>
                    <span className="font-mono font-bold">-{formatRawRupees(cartPrices.couponDiscount)}</span>
                  </div>
                )}

                {/* Onboarding & Setup Fee Line Item */}
                {!cartPrices.isTrial && (
                  cartPrices.onboardingFeeEnabled && cartPrices.onboardingFee > 0 ? (
                    <div className="flex justify-between items-center text-[var(--heading)] font-semibold text-xs py-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>Onboarding & Setup Fee:</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-bold">
                          ONE-TIME
                        </span>
                      </div>
                      <span className="font-mono">+{formatRawRupees(cartPrices.onboardingFee)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-[var(--muted)] text-[11px] py-0.5">
                      <span>Onboarding & Setup Fee:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">Waived (₹0)</span>
                    </div>
                  )
                )}

                {/* GST Tax Breakdown */}
                {cartPrices.isTrial ? (
                  <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
                    <span className="flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Trial Tax Exemption:</span>
                    </span>
                    <span className="font-bold">₹0.00 (0% GST)</span>
                  </div>
                ) : cartPrices.isInterState ? (
                  <div className="flex justify-between text-[var(--muted)]">
                    <div className="flex items-center gap-1">
                      <span>IGST (18% Inter-State):</span>
                      <span className="text-[9px] font-mono text-zinc-500">({cartPrices.stateName})</span>
                    </div>
                    <span className="font-mono">{formatRawRupees(cartPrices.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>CGST (9%):</span>
                      <span className="font-mono">{formatRawRupees(cartPrices.cgst)}</span>
                    </div>

                    <div className="flex justify-between text-[var(--muted)]">
                      <span>SGST (9%):</span>
                      <span className="font-mono">{formatRawRupees(cartPrices.sgst)}</span>
                    </div>
                  </>
                )}

                {/* Same profile checkbox - visible when 2+ agents in cart */}
                {subscriptionCount >= 2 && (
                  <div className="pt-2 border-t border-[var(--border)] flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="useSameProfile"
                      checked={useSameProfile}
                      onChange={(e) => setUseSameProfile(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border)] accent-zinc-900 dark:accent-white text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white bg-[var(--background)] mt-0.5 cursor-pointer"
                    />
                    <label htmlFor="useSameProfile" className="text-[10px] text-[var(--muted)] leading-tight select-none cursor-pointer">
                      Apply the same business setup profile to all purchased agents
                    </label>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-4 border-t border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--heading)]">GRAND TOTAL:</span>
                  <span className="text-lg font-bold font-display text-[var(--heading)] font-mono">{formatRawRupees(cartPrices.total)}</span>
                </div>

                {cartPrices.isTrial && (
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[10px] text-[var(--muted)] space-y-1">
                    <div className="font-bold text-[var(--heading)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>7-Day Trial Autopay Mandate</span>
                    </div>
                    <p className="leading-relaxed">
                      ₹99 charged today with ₹0 GST. Autopay scheduled to renew at chosen plan rate with standard GST after 7 days. Cancel anytime with zero penalty before day 7.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className={`w-full py-3.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-4 shadow-sm ${
                    processing
                      ? 'bg-[var(--hover-bg)] text-[var(--muted)] cursor-wait border border-[var(--border)]'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 active:scale-[0.99]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {processing ? 'Processing...' : cartPrices.isTrial ? `Pay ${formatRawRupees(cartPrices.total)} (Start 7-Day Trial)` : `Pay ${formatRawRupees(cartPrices.total)}`}
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-[var(--muted)] text-xs">
                Add items to see totals and check out.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Immediate On-Screen Printable and Downloadable Invoice Modal */}
      <PaymentSuccessInvoiceModal
        isOpen={invoiceModal.isOpen}
        status={invoiceModal.status}
        title={invoiceModal.title}
        errorMessage={invoiceModal.errorMessage}
        paymentId={invoiceModal.paymentId}
        invoice={invoiceModal.invoice}
        invoiceId={invoiceModal.invoiceId}
        profile={profile}
        continueLabel={invoiceModal.continueLabel}
        onClose={() => setInvoiceModal(prev => ({ ...prev, isOpen: false }))}
        onContinue={() => {
          if (invoiceModal.onContinueAction) {
            invoiceModal.onContinueAction()
          } else {
            setInvoiceModal(prev => ({ ...prev, isOpen: false }))
          }
        }}
      />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-8 space-y-4 animate-pulse">
          <div className="h-6 w-40 bg-[var(--hover-bg)] rounded" />
          <div className="h-96 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
