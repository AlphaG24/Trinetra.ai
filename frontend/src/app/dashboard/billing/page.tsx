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
  ArrowRight,
  Eye,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import PaymentSuccessInvoiceModal, { InvoiceData } from '@/components/billing/PaymentSuccessInvoiceModal'
import { useAuth } from '@/src/components/providers/AuthProvider'
import CheckoutPromoAndGSTSection, { AppliedCouponInfo } from '@/components/checkout/CheckoutPromoAndGSTSection'
import { calculateGSTBreakdown } from '@/lib/gst'
import TrialSetupModal from '@/components/billing/TrialSetupModal'
import EnterpriseContactModal from '@/components/enterprise/EnterpriseContactModal'

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
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null)
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [updatingPlan, setUpdatingPlan] = useState<boolean>(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showAllInvoices, setShowAllInvoices] = useState(false)
  const [availableBundles, setAvailableBundles] = useState<Bundle[]>([])
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

  // Wallet State
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [topupLoading, setTopupLoading] = useState(false)
  const [claimingMinutes, setClaimingMinutes] = useState(false)
  const [customTopupAmount, setCustomTopupAmount] = useState('1000')

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [useSameProfile, setUseSameProfile] = useState<boolean>(true)

  // Coupon & GST State
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null)
  const [isClaimingGst, setIsClaimingGst] = useState<boolean>(false)
  const [gstin, setGstin] = useState<string>('')
  const [legalName, setLegalName] = useState<string>('')
  const [saveGstToProfile, setSaveGstToProfile] = useState<boolean>(true)

  // Modals & Invoicing Tabs State
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false)
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false)
  const [invoiceTab, setInvoiceTab] = useState<'paid' | 'trial'>('paid')

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

  const fetchBillingData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
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
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingData(true)
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
          // Open high-trust loader modal immediately with no-refresh warning
          setInvoiceModal({
            isOpen: true,
            status: 'verifying',
            title: `Confirming Recharge (₹${amount.toLocaleString('en-IN')})`,
            paymentId: response.razorpay_payment_id,
            invoice: null
          })

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
              
              const rawInv = verifyData.invoice || {}
              const resolvedInv = {
                ...rawInv,
                id: verifyData.invoice_id || rawInv.id || 'inv_' + Date.now(),
                invoice_number: verifyData.invoice_number || rawInv.invoice_number || `VAK/26-27/${Date.now().toString().slice(-5)}`,
                grand_total_paisa: rawInv.grand_total_paisa || (amount * 100),
                total_amount: rawInv.total_amount || (amount * 100),
                subtotal_paisa: rawInv.subtotal_paisa || Math.round((amount * 100) / 1.18),
                total_tax_paisa: rawInv.total_tax_paisa || ((amount * 100) - Math.round((amount * 100) / 1.18)),
                payment_id: response.razorpay_payment_id,
                payment_method: 'Razorpay UPI / Cards',
                created_at: rawInv.created_at || new Date().toISOString(),
                supplier_name: rawInv.supplier_name || 'Vaakriti Technologies Private Limited',
                supplier_gstin: rawInv.supplier_gstin || '07AAAAA0000A1Z5',
                customer_legal_name: rawInv.customer_legal_name || profile?.company_name || profile?.full_name || user?.user_metadata?.full_name || 'Customer',
                customer_email: rawInv.customer_email || profile?.email || user?.email || '',
                customer_address: typeof rawInv.customer_address === 'string' && rawInv.customer_address.trim().length > 0
                  ? rawInv.customer_address
                  : [profile?.address || profile?.street, profile?.city, profile?.state, profile?.pincode, profile?.country || 'India'].filter(Boolean).join(', ') || 'India',
                customer_gstin: rawInv.customer_gstin || profile?.gst_number || profile?.gstin || 'N/A',
                line_items: rawInv.line_items || [
                  {
                    description: `Prepaid Wallet Recharge (₹${amount.toLocaleString('en-IN')})`,
                    hsn_sac: '998413',
                    quantity: 1,
                    rate_paisa: Math.round((amount * 100) / 1.18),
                    amount_paisa: Math.round((amount * 100) / 1.18),
                    taxable_amount_paisa: Math.round((amount * 100) / 1.18),
                    gst_rate: 18,
                    total_paisa: amount * 100
                  }
                ]
              }

              // Show on-screen printable and downloadable invoice immediately!
              setInvoiceModal({
                isOpen: true,
                status: 'success',
                paymentId: response.razorpay_payment_id,
                invoice: resolvedInv,
                invoiceId: resolvedInv.id,
                continueLabel: 'Done & Return to Billing',
                onContinueAction: () => {
                  setInvoiceModal(prev => ({ ...prev, isOpen: false }))
                  fetchBillingData(false)
                }
              })

              // Background refresh data without resetting loading state
              fetchBillingData(false)
            } else {
              setInvoiceModal({
                isOpen: true,
                status: 'error',
                errorMessage: verifyData.error || 'Verification failed. Please contact billing support.',
                paymentId: response.razorpay_payment_id
              })
            }
          } catch (vErr: any) {
            setInvoiceModal({
              isOpen: true,
              status: 'error',
              errorMessage: vErr.message || 'Payment verification failed',
              paymentId: response.razorpay_payment_id
            })
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
    setIsTrialModalOpen(true)
  }

  const handleTrialModalCheckout = async (trialPayload: {
    agentCount: number
    targetPlanSlug: string
    targetPriceRupees: number
    selectedPersonalities: string[]
    renewalDate: string
  }) => {
    try {
      setUpdatingPlan(true)
      const trialItems = [{
        type: 'subscription' as const,
        key: 'trial',
        quantity: 1
      }]

      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: trialItems,
          use_same_profile: true,
          trial_metadata: trialPayload
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initiate trial checkout')

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Trinetra AI',
        description: `7-Day All-Access Trial (${trialPayload.agentCount} Agents)`,
        order_id: data.order_id,
        prefill: {
          email: data.user_email,
          name: data.user_name
        },
        handler: async function (response: any) {
          setInvoiceModal({
            isOpen: true,
            status: 'verifying',
            title: 'Activating 7-Day All-Access Trial...',
            paymentId: response.razorpay_payment_id,
            invoice: null
          })

          try {
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                items: trialItems,
                trial_metadata: trialPayload
              })
            })

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json()
              toast.success('Trial activated successfully! 50 minutes & agents are live.')
              fetchBillingData(false)
              const rawInv = verifyData.invoice || {}
              const resolvedInv = {
                ...rawInv,
                id: verifyData.invoice_id || rawInv.id || 'inv_' + Date.now(),
                invoice_number: verifyData.invoice_number || rawInv.invoice_number || `VAK/26-27/${Date.now().toString().slice(-5)}`,
                grand_total_paisa: 9900,
                total_amount: 9900,
                subtotal_paisa: 9900,
                total_tax_paisa: 0,
                payment_id: response.razorpay_payment_id,
                payment_method: 'Razorpay Gateway',
                created_at: rawInv.created_at || new Date().toISOString(),
                supplier_name: 'Vaakriti Technologies Private Limited',
                supplier_gstin: '07AAAAA0000A1Z5',
                customer_legal_name: profile?.company_name || profile?.full_name || 'Customer',
                customer_email: profile?.email || user?.email || '',
                customer_address: profile?.city || 'India',
                customer_gstin: 'N/A',
                line_items: [{
                  description: `7-Day All-Access Trial (${trialPayload.agentCount} Agents - ${trialPayload.selectedPersonalities.join(', ')})`,
                  quantity: 1,
                  amount_paisa: 9900
                }]
              }

              setInvoiceModal({
                isOpen: true,
                status: 'success',
                paymentId: response.razorpay_payment_id,
                invoice: resolvedInv,
                invoiceId: resolvedInv.id,
                continueLabel: 'Go to Agent Setup',
                onContinueAction: () => {
                  setInvoiceModal(prev => ({ ...prev, isOpen: false }))
                  window.location.href = '/dashboard/agents'
                }
              })
            } else {
              const verifyData = await verifyRes.json()
              toast.error(verifyData.error || 'Payment verification failed')
            }
          } catch (vErr: any) {
            toast.error(vErr.message || 'Payment verification failed')
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      toast.error(err.message || 'Trial activation initiation failed')
    } finally {
      setUpdatingPlan(false)
    }
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
      const safeNum = (inv.invoice_number || 'receipt').replace(/[\/\\:*?"<>|]/g, '_')
      a.download = `Invoice_${safeNum}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleViewInvoice = (inv: Invoice) => {
    setInvoiceModal({
      isOpen: true,
      status: 'success',
      invoice: {
        ...(inv as any),
        id: inv.id,
        invoice_number: inv.invoice_number,
        total_amount: getInvoiceAmountPaisa(inv),
        grand_total_paisa: getInvoiceAmountPaisa(inv),
        subtotal_paisa: inv.subtotal_paisa || (inv as any).subscription_amount || Math.round(getInvoiceAmountPaisa(inv) / 1.18),
        total_tax_paisa: inv.total_tax_paisa || (inv as any).tax_amount || (getInvoiceAmountPaisa(inv) - (inv.subtotal_paisa || (inv as any).subscription_amount || Math.round(getInvoiceAmountPaisa(inv) / 1.18))),
        status: inv.status,
        created_at: inv.created_at,
        payment_method: inv.payment_method || 'Razorpay Gateway',
        plan_tier: inv.plan_tier,
        supplier_name: (inv as any).supplier_name || 'Vaakriti Technologies Private Limited',
        supplier_gstin: (inv as any).supplier_gstin || '07AAAAA0000A1Z5',
        customer_legal_name: (inv as any).customer_legal_name || profile?.company_name || profile?.full_name || user?.user_metadata?.full_name || 'Customer',
        customer_email: (inv as any).customer_email || profile?.email || user?.email || '',
        customer_address: typeof (inv as any).customer_address === 'string' && (inv as any).customer_address.trim().length > 0
          ? (inv as any).customer_address
          : [profile?.address || profile?.street, profile?.city, profile?.state, profile?.pincode, profile?.country || 'India'].filter(Boolean).join(', ') || 'India',
        customer_gstin: (inv as any).customer_gstin || profile?.gst_number || profile?.gstin || 'N/A',
        line_items: (inv as any).line_items
      },
      invoiceId: inv.id,
      continueLabel: 'Close Invoice',
      onContinueAction: () => setInvoiceModal(prev => ({ ...prev, isOpen: false }))
    })
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

  // Pricing & Discount Calculations
  const calculateRawSubtotal = () => {
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
          // Open high-trust loader modal immediately with no-refresh warning
          setInvoiceModal({
            isOpen: true,
            status: 'verifying',
            title: 'Provisioning AI Voice Resources...',
            paymentId: response.razorpay_payment_id,
            invoice: null
          })

          try {
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
              const verifyData = await verifyRes.json()
              toast.success('Payment successful! Your purchased resources have been provisioned.')
              const { total: cartTotal, discountedSubtotal: cartSubtotal, cgst, sgst } = calculateCartPrices()
              const cartTax = cgst + sgst
              setCart([])

              const rawInv = verifyData.invoice || {}
              const resolvedInv = {
                ...rawInv,
                id: verifyData.invoice_id || rawInv.id || 'inv_' + Date.now(),
                invoice_number: verifyData.invoice_number || rawInv.invoice_number || `VAK/26-27/${Date.now().toString().slice(-5)}`,
                grand_total_paisa: rawInv.grand_total_paisa || (cartTotal * 100),
                total_amount: rawInv.total_amount || (cartTotal * 100),
                subtotal_paisa: rawInv.subtotal_paisa || Math.round(cartSubtotal * 100),
                total_tax_paisa: rawInv.total_tax_paisa || Math.round(cartTax * 100),
                payment_id: response.razorpay_payment_id,
                payment_method: 'Razorpay Gateway',
                created_at: rawInv.created_at || new Date().toISOString(),
                supplier_name: rawInv.supplier_name || 'Vaakriti Technologies Private Limited',
                supplier_gstin: rawInv.supplier_gstin || '07AAAAA0000A1Z5',
                customer_legal_name: rawInv.customer_legal_name || profile?.company_name || profile?.full_name || user?.user_metadata?.full_name || 'Customer',
                customer_email: rawInv.customer_email || profile?.email || user?.email || '',
                customer_address: typeof rawInv.customer_address === 'string' && rawInv.customer_address.trim().length > 0
                  ? rawInv.customer_address
                  : [profile?.address || profile?.street, profile?.city, profile?.state, profile?.pincode, profile?.country || 'India'].filter(Boolean).join(', ') || 'India',
                customer_gstin: rawInv.customer_gstin || profile?.gst_number || profile?.gstin || 'N/A',
                line_items: rawInv.line_items || cart.map(item => ({
                  description: item.name,
                  quantity: item.quantity,
                  amount_paisa: Math.round(item.price * item.quantity * 100)
                }))
              }

              // Show on-screen printable and downloadable invoice immediately!
              setInvoiceModal({
                isOpen: true,
                status: 'success',
                paymentId: response.razorpay_payment_id,
                invoice: resolvedInv,
                invoiceId: resolvedInv.id,
                continueLabel: verifyData.redirect_url ? 'Continue to Agent Setup' : 'Continue to Dashboard',
                onContinueAction: () => {
                  setInvoiceModal(prev => ({ ...prev, isOpen: false }))
                  const targetUrl = verifyData.redirect_url || '/dashboard/agents'
                  window.location.href = targetUrl
                }
              })

              // Background refresh data without resetting loading state
              fetchBillingData(false)
            } else {
              const errorData = await verifyRes.json()
              setInvoiceModal({
                isOpen: true,
                status: 'error',
                errorMessage: errorData.error || 'Verification failed. Please contact billing support.',
                paymentId: response.razorpay_payment_id
              })
            }
          } catch (vErr: any) {
            setInvoiceModal({
              isOpen: true,
              status: 'error',
              errorMessage: vErr.message || 'Payment verification failed',
              paymentId: response.razorpay_payment_id
            })
          } finally {
            setUpdatingPlan(false)
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
      <>
        <div className="space-y-8 animate-pulse p-6">
          <div className="h-8 w-64 bg-[var(--hover-bg)] rounded-lg" />
          <div className="h-32 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
            <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
            <div className="h-96 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
          </div>
        </div>
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
      </>
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
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
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
            <div className="bg-zinc-100/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
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
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 text-center disabled:opacity-50 active:scale-[0.98]"
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
                  <strong className="text-[var(--heading)] font-semibold">First-time onboarding?</strong> Test agents in the <strong className="text-[var(--heading)] font-semibold">live sandbox</strong> with our <strong className="text-[var(--heading)] font-semibold">zero-risk trial</strong>, or explore our <strong className="text-[var(--heading)] font-semibold">template marketplace</strong> to deploy pre-configured sales, support, and receptionist specialists. Select your plan tier (<strong className="text-[var(--heading)] font-semibold">Starter / Professional</strong>) when activating your agent.
                </p>
              </div>
              <Link
                href="/dashboard/marketplace"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 text-center active:scale-[0.98]"
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

          {/* Go Enterprise Tier Banner */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-500" /> Enterprise Scale
              </div>
              <h3 className="font-bold text-sm text-[var(--heading)] font-display flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--heading)]" />
                Custom Enterprise Telephony & Limits
              </h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed max-w-lg">
                High-volume call quotas (10,000+ min/month), dedicated VPC air-gapped deployment, custom fine-tuned voice personas, and bespoke SLA contracts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEnterpriseModalOpen(true)}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 text-center active:scale-[0.98]"
            >
              Contact Enterprise
            </button>
          </div>

        </div>

        {/* Right Side: Interactive Shopping Cart Sidebar */}
        <div className="space-y-6 lg:pt-9">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[640px]">
            <div>
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-4">
                <ShoppingCart className="w-5 h-5 text-zinc-900 dark:text-white" />
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
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono font-bold">{formatRawRupees(item.price)} each</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-mono font-bold text-[var(--heading)]">{formatRawRupees(item.price * item.quantity)}</span>

                          {/* Quantity Controls */}
                          {item.type !== 'subscription' && (
                            <div className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-0.5">
                              <button
                                onClick={() => updateQuantity(index, -1)}
                                className="p-1 text-[var(--muted)] hover:text-zinc-900 dark:hover:text-white transition-colors"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[11px] font-mono font-bold px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(index, 1)}
                                className="p-1 text-[var(--muted)] hover:text-zinc-900 dark:hover:text-white transition-colors"
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

            {/* Promo Code & GST Section */}
            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
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
              </div>
            )}

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

                {cartPrices.couponDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-500 font-semibold animate-in fade-in duration-200">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Promo Discount ({appliedCoupon?.code}):</span>
                    </span>
                    <span className="font-mono font-bold">-{formatRawRupees(cartPrices.couponDiscount)}</span>
                  </div>
                )}

                {/* Onboarding & Setup Fee Line Item (Cases A, B, C) */}
                {cartPrices.isTrial ? (
                  <div className="flex justify-between items-center text-[11px] py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--muted)]">Onboarding & Setup Fee:</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                        TRIAL SPECIAL
                      </span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">Waived Off (₹0)</span>
                  </div>
                ) : cartPrices.onboardingFeeEnabled && cartPrices.onboardingFee > 0 ? (
                  <div className="flex justify-between items-center text-[var(--heading)] font-semibold text-xs py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span>Onboarding & Setup Fee:</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-bold">
                        ONE-TIME
                      </span>
                    </div>
                    <span className="font-mono">+{formatRawRupees(cartPrices.onboardingFee)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-[11px] py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--muted)]">Onboarding & Setup Fee:</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                        100% WAIVED
                      </span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">Waived Off (₹0)</span>
                  </div>
                )}

                {/* Tax Breakdown */}
                {cartPrices.isInterState ? (
                  <div className="flex justify-between text-xs text-[var(--muted)]">
                    <div className="flex items-center gap-1">
                      <span>IGST (18% Inter-State):</span>
                      <span className="text-[9px] font-mono text-zinc-500">({cartPrices.stateName})</span>
                    </div>
                    <span className="font-mono">{formatRawRupees(cartPrices.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                      <span>CGST (9%):</span>
                      <span className="font-mono">{formatRawRupees(cartPrices.cgst)}</span>
                    </div>

                    <div className="flex justify-between text-xs text-[var(--muted)]">
                      <span>SGST (9%):</span>
                      <span className="font-mono">{formatRawRupees(cartPrices.sgst)}</span>
                    </div>
                  </>
                )}

                {/* Same profile configuration option */}
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

        {/* Dual Invoice Tabs (Feature 4) */}
        {(() => {
          const trialInvoices = invoices.filter(inv =>
            inv.plan_tier === 'trial' ||
            inv.grand_total_paisa === 9900 ||
            inv.total_amount === 9900 ||
            (Array.isArray((inv as any).line_items) && (inv as any).line_items.some((item: any) =>
              item.is_trial === true || item.invoice_type === 'trial' || (item.item || item.description || '').toLowerCase().includes('trial')
            ))
          )

          const paidInvoices = invoices.filter(inv =>
            inv.plan_tier !== 'trial' &&
            inv.grand_total_paisa !== 9900 &&
            inv.total_amount !== 9900 &&
            !(Array.isArray((inv as any).line_items) && (inv as any).line_items.some((item: any) =>
              item.is_trial === true || item.invoice_type === 'trial' || (item.item || item.description || '').toLowerCase().includes('trial')
            ))
          )

          const activeList = invoiceTab === 'paid' ? paidInvoices : trialInvoices

          return (
            <div>
              <div className="flex items-center gap-2 border-b border-[var(--border)] mb-4">
                <button
                  type="button"
                  onClick={() => { setInvoiceTab('paid'); setShowAllInvoices(false); }}
                  className={`pb-2.5 px-3 text-xs font-bold font-montserrat uppercase tracking-wider transition-colors relative cursor-pointer flex items-center gap-2 ${
                    invoiceTab === 'paid'
                      ? 'text-[var(--heading)] border-b-2 border-zinc-900 dark:border-white'
                      : 'text-[var(--muted)] hover:text-[var(--heading)]'
                  }`}
                >
                  <span>Paid Invoices</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-800 text-[var(--heading)] font-mono">
                    {paidInvoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setInvoiceTab('trial'); setShowAllInvoices(false); }}
                  className={`pb-2.5 px-3 text-xs font-bold font-montserrat uppercase tracking-wider transition-colors relative cursor-pointer flex items-center gap-2 ${
                    invoiceTab === 'trial'
                      ? 'text-[var(--heading)] border-b-2 border-zinc-900 dark:border-white'
                      : 'text-[var(--muted)] hover:text-[var(--heading)]'
                  }`}
                >
                  <span>Trial Invoices</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-800 text-[var(--heading)] font-mono">
                    {trialInvoices.length}
                  </span>
                </button>
              </div>

              {activeList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[var(--muted)]">
                    {invoiceTab === 'paid'
                      ? 'No paid subscription invoices found. Direct purchases and post-trial renewed invoices appear here.'
                      : 'No trial invoices found. When you activate the ₹99 7-day trial, your trial invoice with zero GST will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
                        <th className="py-3 px-4 font-montserrat">Date</th>
                        <th className="py-3 px-4 font-montserrat">Invoice Number</th>
                        <th className="py-3 px-4 font-montserrat">Amount</th>
                        <th className="py-3 px-4 font-montserrat">Type & Status</th>
                        <th className="py-3 px-4 font-montserrat text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-[var(--heading)] divide-y divide-[var(--border)]">
                      {(showAllInvoices ? activeList : activeList.slice(0, 3)).map((inv) => (
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
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${inv.status.toLowerCase() === 'paid'
                                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                {inv.status}
                              </span>
                              {invoiceTab === 'trial' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-200 dark:bg-zinc-800 text-[var(--muted)]">
                                  0 GST
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleViewInvoice(inv)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--border)] text-xs text-[var(--heading)] font-semibold transition cursor-pointer"
                                title="View & Print Official Invoice on Screen"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                View
                              </button>
                              <button
                                onClick={() => handleDownload(inv)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--border)] text-xs text-[var(--heading)] font-semibold transition cursor-pointer"
                                title="Download Official PDF Invoice"
                              >
                                <Download className="w-3.5 h-3.5" />
                                PDF
                              </button>
                            </div>
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
                  <span>
                    {invoiceTab === 'paid'
                      ? 'All statutory B2B/B2C GST invoices are permanently stored for your accounting records.'
                      : 'Trial invoices document your ₹99 evaluation and upcoming autopay mandate disclosures.'}
                  </span>
                </p>
                {activeList.length > 3 && (
                  <button
                    onClick={() => setShowAllInvoices(!showAllInvoices)}
                    className="text-xs text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] px-3 py-1.5 rounded-xl uppercase tracking-wider text-[10px] font-bold transition-all cursor-pointer"
                  >
                    {showAllInvoices ? 'Show Less' : `Show All (${activeList.length})`}
                  </button>
                )}
              </div>
            </div>
          )
        })()}
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

      {/* Trial Setup & Personality Selector Modal */}
      <TrialSetupModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        configs={configs}
        onProceedToCheckout={handleTrialModalCheckout}
      />

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
      />
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
