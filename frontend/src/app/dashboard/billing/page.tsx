'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { createClient } from '@/utils/supabase/client'
import {
  CreditCard,
  Check,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Zap,
  Volume2,
  PhoneCall,
  Activity,
  ArrowUpRight,
  Download,
  ShoppingCart,
  Plus,
  Minus,
  Gift,
  Trash2,
  Bot,
  AlertCircle,
  Wallet,
  ShieldCheck as ShieldCheckIcon,
  Sparkles,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface UserLimits {
  plan_tier: string
  trial_ends_at: string | null
  paid_minutes_limit: number
  paid_minutes_used: number
  demo_minutes_limit: number
  demo_minutes_used: number
  additional_agents?: number
  additional_phone_numbers?: number
}

interface Invoice {
  id: string
  invoice_number: string
  subscription_amount?: number
  total_amount?: number
  grand_total_paisa?: number
  subtotal_paisa?: number
  total_tax_paisa?: number
  status: string
  created_at: string
  payment_method?: string
  plan_tier?: string
  pdf_url?: string | null
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

interface WalletInfo {
  balance_inr: number
  spend_limit_inr: number
  current_spend_inr: number
  reliability_score: number
  emergency_minutes_available: number
  emergency_minutes_claimed_at: string | null
  billing_model?: 'subscription' | 'credit_based' | 'outcome_based' | string
}

function BillingContent() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null)
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [updatingPlan, setUpdatingPlan] = useState<boolean>(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showAllInvoices, setShowAllInvoices] = useState(false)
  const [availableBundles, setAvailableBundles] = useState<Bundle[]>([])

  // Wallet State
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [topupLoading, setTopupLoading] = useState(false)
  const [claimingMinutes, setClaimingMinutes] = useState(false)
  const [customTopupAmount, setCustomTopupAmount] = useState('1000')

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [useSameProfile, setUseSameProfile] = useState<boolean>(true)

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      const configRes = await fetch('/api/dashboard/config')
      if (!configRes.ok) {
        throw new Error('Failed to retrieve billing configuration')
      }
      const data = await configRes.json()
      setUserLimits(data.user_limits)
      setConfigs(data.configs || {})
      setAvailableBundles(data.bundles || [])

      // Fetch Invoices
      const invRes = await fetch('/api/billing/invoices', {
        credentials: 'include'
      })
      if (invRes.ok) {
        const invData = await invRes.json()
        if (invData.invoices) {
          setInvoices(invData.invoices)
        }
      }

      // Fetch Prepaid Wallet & Spend Limits
      try {
        const walletRes = await fetch('/api/billing/wallet', {
          credentials: 'include'
        })
        if (walletRes.ok) {
          const wData = await walletRes.json()
          if (wData.wallet) {
            setWallet(wData.wallet)
          }
        }
      } catch (wErr) {
        console.warn('Wallet fetch failed:', wErr)
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingData()
  }, [])

  const handleQuickTopup = async (amount: number) => {
    const minTopupInr = Math.max(1, Math.round(parseInt(configs.wallet_min_topup_paisa || '50000', 10) / 100))
    if (!amount || amount < minTopupInr) {
      toast.error(`Minimum top-up amount is ₹${minTopupInr}`)
      return
    }

    try {
      setTopupLoading(true)

      // 1. Create real Razorpay order on server
      const res = await fetch('/api/billing/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create_order', amount_inr: amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initiate wallet recharge')

      // 2. Open Razorpay payment gateway
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Payment gateway is loading. Please try again in a few seconds.')
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Trinetra AI',
        description: `Prepaid Wallet Recharge (₹${amount.toLocaleString('en-IN')})`,
        order_id: data.order_id,
        prefill: {
          email: data.user_email,
          name: data.user_name
        },
        theme: {
          color: '#18181b'
        },
        handler: async function (response: any) {
          toast.info('Verifying transaction on server...')
          try {
            const verifyRes = await fetch('/api/billing/wallet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                action: 'verify_topup',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                amount_inr: amount
              })
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok) {
              toast.success(verifyData.message || `Wallet topped up by ₹${amount.toLocaleString('en-IN')}!`)
              fetchBillingData()
            } else {
              toast.error(verifyData.error || 'Verification failed. Please contact billing support.')
            }
          } catch (vErr: any) {
            toast.error(vErr.message || 'Payment verification failed')
          } finally {
            setTopupLoading(false)
          }
        },
        modal: {
          ondismiss: function () {
            setTopupLoading(false)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      toast.error(err.message || 'Wallet topup initiation failed')
      setTopupLoading(false)
    }
  }

  const handleClaimEmergencyMinutes = async () => {
    try {
      setClaimingMinutes(true)
      const res = await fetch('/api/billing/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_emergency_minutes' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim emergency minutes')
      toast.success('50 Emergency Minutes claimed successfully!')
      fetchBillingData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setClaimingMinutes(false)
    }
  }

  const handleActivateTrial = async () => {
    if (userLimits?.plan_tier === 'starter' || userLimits?.plan_tier === 'professional' || userLimits?.plan_tier === 'trial') {
      toast.error('The ₹99 Trial is a strictly one-time offer for new accounts. You already have an active subscription or trial.')
      return
    }
    const trialCost = parseInt(configs.trial_price_paisa || '9900', 10) / 100
    addToCart('subscription', 'trial', '7-Day All-Access Trial (50 mins, 2 Agents)', trialCost)
    toast.success('₹99 Trial added to your cart! Click "Proceed to Checkout" on the right to complete payment via Razorpay.')
  }

  useEffect(() => {
    const supabase = createClient()
    let channel: any
    let isMounted = true

    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted || !user) return

      channel = supabase.channel(`profile_plan_changes_${Date.now()}_${Math.random().toString(36).substring(7)}`)

      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new.plan_tier !== payload.old?.plan_tier) {
            router.refresh()
            window.location.reload()
          }
        }
      )

      channel.subscribe()
    }
    setupRealtime()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  const getInvoiceAmountPaisa = (inv: Invoice): number => {
    if (inv.grand_total_paisa && Number(inv.grand_total_paisa) > 0) return Number(inv.grand_total_paisa)
    if (inv.total_amount && Number(inv.total_amount) > 0) return Number(inv.total_amount)
    if (inv.subscription_amount && Number(inv.subscription_amount) > 0) return Number(inv.subscription_amount)
    if (inv.subtotal_paisa && Number(inv.subtotal_paisa) > 0) return Number(inv.subtotal_paisa)
    return 0
  }

  const handleDownload = async (inv: Invoice) => {
    try {
      const response = await fetch(`/api/billing/invoices/download?id=${inv.id}`)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice_${inv.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download invoice:', err)
      toast.error('Failed to download PDF invoice. Downloading text receipt instead.')

      const totalAmt = (getInvoiceAmountPaisa(inv) / 100).toFixed(2)
      const content = `INVOICE\n=======================\nInvoice Number: ${inv.invoice_number}\nDate: ${new Date(inv.created_at).toLocaleDateString()}\nPlan: ${inv.plan_tier || 'Subscription'}\nAmount: ₹${totalAmt}\nGST (18%): ₹0.00 (Included)\nTotal: ₹${totalAmt}\nStatus: ${inv.status}\nPayment Method: ${inv.payment_method || 'Razorpay'}\n\nThank you for your business!`

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice_${inv.invoice_number}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Cart Management
  const addToCart = (type: 'subscription' | 'phone_number' | 'bundle', key: string, name: string, price: number) => {
    const existingIndex = cart.findIndex(item => item.type === type && item.key === key)

    if (type === 'subscription') {
      // Limit subscription items to 1 unique plan in cart at a time
      const filteredCart = cart.filter(item => item.type !== 'subscription')
      setCart([...filteredCart, { type, key, name, price, quantity: 1 }])
      toast.success(`${name} plan selected`)
      return
    }

    if (existingIndex > -1) {
      const updatedCart = [...cart]
      updatedCart[existingIndex].quantity += 1
      setCart(updatedCart)
    } else {
      setCart([...cart, { type, key, name, price, quantity: 1 }])
    }
    toast.success(`${name} added to cart`)
  }

  const updateQuantity = (index: number, delta: number) => {
    const updatedCart = [...cart]
    updatedCart[index].quantity += delta
    if (updatedCart[index].quantity <= 0) {
      updatedCart.splice(index, 1)
      toast.error('Item removed from cart')
    }
    setCart(updatedCart)
  }

  const removeFromCart = (index: number) => {
    const updatedCart = [...cart]
    updatedCart.splice(index, 1)
    setCart(updatedCart)
    toast.error('Item removed from cart')
  }

  // Pricing & Discount Calculations
  const calculateCartPrices = () => {
    let subtotal = 0
    let discount = 0
    let totalAgentsQty = 0
    let totalNumbersQty = 0

    // Count categories for quantity discounts
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
    const cgst = Math.round(discountedSubtotal * 0.09) // 9% CGST
    const sgst = Math.round(discountedSubtotal * 0.09) // 9% SGST
    const total = discountedSubtotal + cgst + sgst

    return {
      subtotal,
      discount,
      discountedSubtotal,
      cgst,
      sgst,
      total
    }
  }

  const handleCartCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setUpdatingPlan(true)
    try {
      const formattedItems = cart.map(item => ({
        type: item.type,
        key: item.key,
        quantity: item.quantity
      }))

      // 1. Create checkout order
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: formattedItems,
          use_same_profile: useSameProfile
        })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout')
      }

      // 2. Open Razorpay gateway
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Trinetra AI',
        description: 'Provision voice agents & lines',
        order_id: data.order_id,
        prefill: {
          email: data.user_email,
          name: data.user_name
        },
        handler: async function (response: any) {
          toast.info('Verifying transaction on server...')
          const verifyRes = await fetch('/api/billing/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              items: formattedItems,
              use_same_profile: useSameProfile
            })
          })

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json()
            toast.success('Payment successful! Your purchased resources have been provisioned.')
            setCart([])
            router.refresh()
            if (verifyData.redirect_url) {
              router.push(verifyData.redirect_url)
            } else {
              window.location.reload()
            }
          } else {
            const errorData = await verifyRes.json()
            toast.error(errorData.error || 'Verification failed. Please contact billing support.')
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed')
    } finally {
      setUpdatingPlan(false)
    }
  }

  // Format Price Helper
  const formatPrice = (paisaVal?: string | number, fallback = '₹0') => {
    if (paisaVal === undefined || paisaVal === null || paisaVal === '') return fallback
    const rupees = Number(paisaVal) / 100
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(rupees)
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
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-8 w-64 bg-[var(--hover-bg)] rounded-lg" />
        <div className="h-32 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
          <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
          <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
        </div>
      </div>
    )
  }

  if (error || !userLimits) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-red-500/20 bg-red-950/10 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-white font-bold text-lg">Billing Gateway Error</h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{error || 'Could not fetch your billing details. Please try again.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 py-2.5 bg-red-650 hover:bg-red-550 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const currentTier = userLimits.plan_tier || 'free'
  const isFree = currentTier === 'free' || currentTier === 'free_demo'

  const planCards = [
    {
      key: 'starter',
      name: 'Starter Upgrade',
      priceRaw: parseInt(configs.starter_price_paisa || '499900', 10) / 100,
      description: 'Ideal for local businesses deploying their first voice auto-responder.',
      minutes: configs.starter_minutes || '500',
      active: currentTier === 'starter',
      features: [
        `${configs.starter_minutes || '500'} monthly minutes included`,
        'Up to 5 active production agents',
        'Custom system prompt configurations',
        `Overage pricing of ₹${configs.overage_per_minute_paisa ? Math.round(parseInt(configs.overage_per_minute_paisa, 10) / 100) : 11}/min`,
        'Email & Telegram support alerts'
      ]
    },
    {
      key: 'professional',
      name: 'Professional Upgrade',
      priceRaw: parseInt(configs.professional_price_paisa || '1499900', 10) / 100,
      description: 'Designed for scaling operations with dedicated telephonic infrastructure.',
      minutes: configs.professional_minutes || '2000',
      active: currentTier === 'professional' || currentTier === 'pro',
      features: [
        `${configs.professional_minutes || '2,000'} monthly minutes included`,
        'Unlimited active voice agents',
        'Dedicated custom phone numbers',
        `Overage pricing of ₹${configs.overage_per_minute_paisa ? Math.round(parseInt(configs.overage_per_minute_paisa, 10) / 100) : 11}/min`,
        'WhatsApp templates & followups'
      ]
    }
  ]

  const phonePriceRaw = parseInt(configs.inbound_number_cost_paisa || '49900', 10) / 100
  const cartPrices = calculateCartPrices()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-[var(--body)]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-[var(--heading)]" />
          Subscription & Billing
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1">Manage plans, provision dedicated numbers, or purchase bundle packs with bulk discounts.</p>
      </div>

      {/* First-time Onboarding Free Trial & Marketplace Guidance Alert */}
      <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--heading)] flex items-center gap-2">
              First-Time Onboarding? Try Free Trial First
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/30">
                Recommended
              </span>
            </h4>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Start with our zero-risk Free Trial to test agents in the live sandbox, then visit the Marketplace to choose and deploy your voice agent.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap cursor-pointer"
        >
          <span>Go to Marketplace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>


      {/* 1. Prepaid Wallet & Spend Limits Engine (Master Plan Section 18.9 & 18.10) - Prominent Full Width */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900/10 dark:bg-white/10 border border-[var(--border)] flex items-center justify-center text-[var(--heading)] shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--heading)] font-display flex flex-wrap items-center gap-2">
                Prepaid Balance & Spend Limits
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {wallet?.billing_model === 'credit_based'
                    ? 'Credit-Based (Pay-As-You-Go)'
                    : wallet?.billing_model === 'outcome_based'
                    ? 'Outcome-Based (Per Result)'
                    : 'Subscription Plan Model'}
                </span>
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Prepaid wallet with instant auto-recharge, spend caps, and statutory GST tax invoices.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-right">
            <div>
              <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">Wallet Balance</span>
              <span className="text-2xl font-bold font-mono text-[var(--heading)]">
                ₹{(wallet?.balance_inr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="sm:border-l sm:border-[var(--border)] sm:pl-6 text-left min-w-[200px]">
              <div className="flex items-center justify-between text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider mb-1.5">
                <span>Monthly Spend Cap</span>
                <span className="font-mono text-[var(--heading)]">₹{(wallet?.current_spend_inr ?? 0).toLocaleString('en-IN')} / ₹{(wallet?.spend_limit_inr ?? 2500).toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-[var(--background)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className={`h-full transition-all duration-500 ${((wallet?.current_spend_inr ?? 0) / (wallet?.spend_limit_inr || 2500)) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  style={{ width: `${Math.min(100, Math.round(((wallet?.current_spend_inr ?? 0) / (wallet?.spend_limit_inr || 2500)) * 100))}%` }}
                />
              </div>
              <span className="text-[9px] text-[var(--muted)] mt-1 block">Bill-shock protected (Admin adjustable)</span>
            </div>
          </div>
        </div>

        {/* Quick Recharge Buttons */}
        <div>
          <label className="block text-[10px] font-bold font-montserrat text-[var(--muted)] uppercase tracking-wider mb-2.5">
            Quick Wallet Top-Up (Instant UPI / Card)
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {[500, 1000, 2500, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={topupLoading}
                onClick={() => handleQuickTopup(amt)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] hover:border-zinc-400 bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--heading)] font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                +₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="number"
                value={customTopupAmount}
                onChange={e => setCustomTopupAmount(e.target.value)}
                placeholder="Custom ₹"
                className="w-24 bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                type="button"
                disabled={topupLoading || !customTopupAmount || Number(customTopupAmount) <= 0}
                onClick={() => handleQuickTopup(Number(customTopupAmount))}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white border border-zinc-700/30 dark:border-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {topupLoading ? 'Adding...' : 'Add Credits'}
              </button>
            </div>
          </div>
        </div>

        {/* Reliability Score & Emergency Minutes (Section 18.9) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
                  Reliability Score
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-[var(--heading)]">
                    {wallet?.reliability_score ?? 85} / 100
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <ShieldCheckIcon className="w-3 h-3" />
                    Good Standing
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
                ✓
              </div>
            </div>
            <p className="text-[9px] text-[var(--muted)] mt-2 pt-2 border-t border-[var(--border)]/60">
              Score &gt; 80 unlocks 50 free overdraft buffer mins upon zero balance. Maintained via prompt recharges, verified KYC, &amp; non-spam usage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider block">
                Emergency Overdraft Protection
              </span>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                {wallet?.emergency_minutes_available ? `${wallet.emergency_minutes_available} emergency mins active` : '50 free buffer minutes upon low balance'}
              </p>
            </div>
            <button
              type="button"
              disabled={claimingMinutes || (wallet?.emergency_minutes_available ?? 0) > 0}
              onClick={handleClaimEmergencyMinutes}
              className="px-3 py-1.5 bg-zinc-900/10 hover:bg-zinc-900/20 dark:bg-white/10 dark:hover:bg-white/20 border border-[var(--border)] text-[var(--heading)] font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {claimingMinutes ? 'Claiming...' : (wallet?.emergency_minutes_available ? 'Claimed' : 'Claim 50 Mins')}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-[var(--muted)] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Zero Mid-Call Disconnect: Active in-progress calls are never terminated mid-sentence when limits are reached.</span>
        </p>
      </div>

      {/* Main Grid: Products on Left, Shopping Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Side: Product Selector list */}
        <div className="lg:col-span-2 space-y-8">

          {/* ₹99 Trial Tier Callout (Decision P2) for Free Users */}
          {isFree && (
            <div className="bg-gradient-to-r from-violet-950/30 to-purple-900/20 border border-violet-500/30 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Limited Trial Offer
                </div>
                <h3 className="font-bold text-base text-[var(--heading)] font-display flex items-center gap-2">
                  Activate 7-Day All-Access Trial for ₹99
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed max-w-lg">
                  Unlock the full dashboard: 50 call minutes, 2 AI agents, dedicated virtual numbers procurement, and advanced analytics. Perfect for testing live campaigns with zero long-term commitment.
                </p>
              </div>
              <button
                type="button"
                disabled={updatingPlan}
                onClick={handleActivateTrial}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-600/20 shrink-0 text-center disabled:opacity-50"
              >
                {updatingPlan ? 'Activating...' : 'Activate for ₹99'}
              </button>
            </div>
          )}

          {/* Subscription Plans Banner */}
          <div>
            <h2 className="text-sm uppercase font-bold text-[var(--heading)] tracking-wider mb-4 font-display">Subscription Upgrades</h2>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[var(--heading)] font-display flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[var(--heading)]" />
                  Activate Premium Voice Agents
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed max-w-lg">
                  Explore our template marketplace to deploy pre-configured sales, support, and receptionist specialists. Select the exact plan tier (Starter/Professional) when activating your agent.
                </p>
              </div>
              <Link
                href="/dashboard/marketplace"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white border border-zinc-700/30 dark:border-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 text-center"
              >
                Go to Marketplace
              </Link>
            </div>
          </div>

          {/* Special Bundles Pack */}
          {availableBundles.length > 0 && (
            <div>
              <h2 className="text-sm uppercase font-bold text-[var(--heading)] tracking-wider mb-4 font-display">Special Product Bundles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableBundles.map((b) => (
                  <div key={b.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-bold uppercase tracking-wider rounded-full">
                      Save {b.discount_percent}%
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-[var(--heading)] font-display">{b.name}</h3>
                      <p className="text-xs text-[var(--muted)] mt-1.5 min-h-[36px] line-clamp-2">{b.description}</p>

                      <div className="mt-4 p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-1.5 text-xs text-[var(--heading)]">
                        <div className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-wider mb-1">Items Included:</div>
                        {(() => {
                          const productsObj = b.products as any
                          const items = Array.isArray(productsObj)
                            ? productsObj
                            : (productsObj?.items || [])
                          return items.map((p: any, idx: number) => {
                            let label = ''
                            if (p.type === 'agent') {
                              const agentLabel = p.agent_type ? `${p.agent_type.replace('_', ' ')} Agent` : `Agent (${p.tier || 'starter'})`
                              label = agentLabel
                            } else {
                              label = 'Phone Number Slot'
                            }
                            return (
                              <div key={idx} className="flex justify-between items-center capitalize">
                                <span className="font-medium text-[var(--heading)]">{label}</span>
                                <span className="font-mono font-bold text-[var(--heading)]">x{p.quantity}</span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[var(--muted)] line-through block">₹{b.individual_price_paisa / 100}</span>
                        <span className="text-lg font-bold font-display text-[var(--heading)]">₹{b.bundle_price_paisa / 100}</span>
                      </div>
                      <button
                        onClick={() => addToCart('bundle', b.id, b.name, b.bundle_price_paisa / 100)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white border border-zinc-700/30 dark:border-zinc-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Add Pack
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Interactive Shopping Cart Sidebar */}
        <div className="space-y-6 lg:pt-9">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[640px]">
            <div>
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-4">
                <ShoppingCart className="w-5 h-5 text-violet-500" />
                <h3 className="font-bold text-base font-display text-[var(--heading)]">Your Cart Summary</h3>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-[var(--muted)]">
                  <ShoppingCart className="w-8 h-8 opacity-20 mb-3" />
                  <p className="text-xs">Your shopping cart is empty.</p>
                  <p className="text-[10px] mt-1">Select subscription upgrades or phone numbers on the left.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {cart.map((item, index) => (
                    <div key={index} className="flex gap-3 justify-between items-center p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl relative">
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="text-xs font-bold text-[var(--heading)] block truncate pr-1">{item.name}</span>
                        <span className="text-[10px] text-violet-500 font-mono font-bold">{formatRawRupees(item.price)} each</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-mono font-bold text-[var(--heading)]">{formatRawRupees(item.price * item.quantity)}</span>

                          {/* Quantity Controls */}
                          {item.type !== 'subscription' && (
                            <div className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-0.5">
                              <button
                                onClick={() => updateQuantity(index, -1)}
                                className="p-1 text-[var(--muted)] hover:text-violet-500 transition-colors"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[11px] font-mono font-bold px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(index, 1)}
                                className="p-1 text-[var(--muted)] hover:text-violet-500 transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            {cart.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4 mt-6 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Subtotal:</span>
                  <span className="font-mono font-medium">{formatRawRupees(cartPrices.subtotal)}</span>
                </div>

                {cartPrices.discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-500">
                    <span>Quantity Bulk Discount:</span>
                    <span className="font-mono font-bold">-{formatRawRupees(cartPrices.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-[var(--muted)]">
                  <span>CGST (9%):</span>
                  <span className="font-mono">{formatRawRupees(cartPrices.cgst)}</span>
                </div>

                <div className="flex justify-between text-xs text-[var(--muted)]">
                  <span>SGST (9%):</span>
                  <span className="font-mono">{formatRawRupees(cartPrices.sgst)}</span>
                </div>

                {/* Same profile configuration option */}
                <div className="pt-2 border-t border-[var(--border)] flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="useSameProfile"
                    checked={useSameProfile}
                    onChange={(e) => setUseSameProfile(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] text-violet-600 focus:ring-violet-500 bg-[var(--background)] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="useSameProfile" className="text-[10px] text-[var(--muted)] leading-tight select-none cursor-pointer">
                    Apply the same business setup profile to all purchased agents
                  </label>
                </div>

                <div className="flex justify-between items-baseline pt-4 border-t border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--heading)]">GRAND TOTAL:</span>
                  <span className="text-xl font-bold font-display text-[var(--heading)] font-mono">{formatRawRupees(cartPrices.total)}</span>
                </div>

                <button
                  onClick={handleCartCheckout}
                  disabled={updatingPlan}
                  className="mt-4 w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white border border-zinc-700/30 dark:border-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>{updatingPlan ? 'Initiating Checkout...' : 'Secure Razorpay Payment'}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="mt-12 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold font-display text-[var(--heading)]">Payment & Invoice History</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Permanent record of all completed subscriptions, add-ons, and statutory GST tax invoices.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Permanent Records Protected</span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--muted)]">No payments found in your history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
                  <th className="py-3 px-4 font-montserrat">Date</th>
                  <th className="py-3 px-4 font-montserrat">Invoice Number</th>
                  <th className="py-3 px-4 font-montserrat">Amount</th>
                  <th className="py-3 px-4 font-montserrat">Status</th>
                  <th className="py-3 px-4 font-montserrat text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[var(--heading)] divide-y divide-[var(--border)]">
                {(showAllInvoices ? invoices : invoices.slice(0, 3)).map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--hover-bg)]/20 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[10px]">
                      {inv.invoice_number?.startsWith('TRI-') ? `VAK/26-27/${inv.invoice_number.slice(-5)}` : inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-medium">
                      {formatPrice(getInvoiceAmountPaisa(inv))}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${inv.status.toLowerCase() === 'paid'
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownload(inv)}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--heading)] hover:opacity-75 font-bold transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-[var(--muted)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>All official GST tax invoices are permanently stored and downloadable anytime.</span>
          </p>
          {invoices.length > 3 && (
            <button
              onClick={() => setShowAllInvoices(!showAllInvoices)}
              className="text-xs text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] px-3 py-1.5 rounded-xl uppercase tracking-wider text-[10px] font-bold transition-all cursor-pointer"
            >
              {showAllInvoices ? 'Show Less' : `Show All (${invoices.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-8 w-64 bg-[var(--hover-bg)] rounded-lg" />
        <div className="h-32 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
