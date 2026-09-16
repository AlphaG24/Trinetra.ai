"use client";

import { useEffect, useState } from "react";
import { 
  Phone, Zap, ChevronDown, ChevronUp, Globe, MapPin, 
  Smartphone, CreditCard, Check, Copy, HelpCircle, AlertCircle,
  Search, RefreshCw, SlidersHorizontal, XCircle, Info, PhoneCall, ShoppingBag
} from "lucide-react";
import { NumberCard } from "@/src/components/phone-numbers/NumberCard";
import { ManageNumberModal } from "@/src/components/phone-numbers/ManageNumberModal";
import { PaymentProgressModal } from "@/src/components/phone-numbers/PaymentProgressModal";
import { toast } from "sonner";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardStore } from "@/store/dashboardStore";
import UpgradePrompt from "@/src/components/shared/UpgradePrompt";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { PageHeaderSkeleton, CardGridSkeleton, TableSkeleton } from "@/src/components/ui/skeleton";

export default function PhoneNumbersPage() {
  const { profile: authProfile, isLoading: authLoading } = useAuth();
  const { profile: storeProfile, setProfile } = useDashboardStore();
  const profile = authProfile || storeProfile;

  useEffect(() => {
    if (!profile || profile.plan_tier === undefined) {
      const loadProfile = async () => {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (dbProfile) {
              setProfile(dbProfile);
            }
          }
        } catch (err) {
          console.error("Error loading profile in PhoneNumbersPage:", err);
        }
      };
      loadProfile();
    }
  }, [profile, setProfile]);

  // Purchased Numbers State
  const [numbers, setNumbers] = useState<any[]>([]);
  const [purchasedLoading, setPurchasedLoading] = useState(true);
  const [purchasedError, setPurchasedError] = useState("");
  const [maxLimit, setMaxLimit] = useState(5);

  // Available Pool Numbers State
  const [poolNumbers, setPoolNumbers] = useState<any[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  // Pre-loaded agents for instant modal rendering
  const [agents, setAgents] = useState<any[]>([]);

  // Payment Verification & Allocation Progress State
  const [paymentProgress, setPaymentProgress] = useState<{
    isOpen: boolean;
    status: "verifying" | "success" | "error";
    title?: string;
    phoneNumber?: string;
    provider?: string;
    paymentId?: string;
    errorMsg?: string;
  }>({
    isOpen: false,
    status: "verifying"
  });

  // Modals state
  const [manageNumberId, setManageNumberId] = useState<string | null>(null);

  // Pool Bidding State
  const [poolCategoryFilter, setPoolCategoryFilter] = useState<"all" | "available_now" | "bidding" | "assigned_bidding">("all");
  const [bidModalNumber, setBidModalNumber] = useState<any>(null);
  const [bidAmountRupees, setBidAmountRupees] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [claimingBidId, setClaimingBidId] = useState<string | null>(null);

  const handleOpenBidModal = (num: any) => {
    setBidModalNumber(num);
    const minRequiredPaisa = num.current_bid_paisa 
      ? num.current_bid_paisa + 100 
      : (num.minimum_bid_paisa || 29900);
    setBidAmountRupees((minRequiredPaisa / 100).toString());
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModalNumber) return;

    try {
      setSubmittingBid(true);
      const res = await fetch(`/api/phone-numbers/${bidModalNumber.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_amount_rupees: bidAmountRupees })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place bid");

      toast.success(data.message || "Bid placed successfully!");
      setBidModalNumber(null);
      setBidAmountRupees("");
      fetchPoolNumbers();
    } catch (err: any) {
      toast.error(err.message || "Failed to place bid");
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleClaimBid = async (num: any) => {
    try {
      setClaimingBidId(num.id);
      const res = await fetch(`/api/phone-numbers/${num.id}/claim-bid`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim number");

      toast.success(data.message || "Number claimed and assigned successfully!");
      fetchPurchasedNumbers();
      fetchPoolNumbers();
    } catch (err: any) {
      toast.error(err.message || "Failed to claim number");
    } finally {
      setClaimingBidId(null);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchPurchasedNumbers = async () => {
    try {
      setPurchasedLoading(true);
      setPurchasedError("");
      const res = await fetch("/api/phone-numbers");
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch phone numbers");
      
      setNumbers(data.data?.phone_numbers || []);
      if (data.data?.limit) setMaxLimit(data.data.limit);
      
    } catch (err: any) {
      setPurchasedError(err.message || "Failed to load phone numbers");
    } finally {
      setPurchasedLoading(false);
    }
  };

  const fetchPoolNumbers = async () => {
    try {
      setPoolLoading(true);
      const res = await fetch("/api/phone-numbers/pool");
      const data = await res.json();
      if (res.ok && data.success) {
        setPoolNumbers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load pool numbers", err);
    } finally {
      setPoolLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          const { data: dbAgents } = await supabase
            .from('agents')
            .select('id, name, status, is_demo, agent_type')
            .eq('organization_id', profile.organization_id)
            .neq('status', 'deleted');

          if (dbAgents) {
            setAgents(dbAgents);
          }
        }
      }
    } catch (err) {
      console.error("Failed to pre-fetch agents in PhoneNumbersPage", err);
    }
  };

  useEffect(() => {
    fetchPurchasedNumbers();
    fetchPoolNumbers();
    fetchAgents();
  }, []);

  const handleBuyPoolNumber = async (poolNum: any) => {
    const isAtLimit = Array.isArray(numbers) ? numbers.length >= maxLimit : false;
    if (isAtLimit) {
      toast.error(`You have reached the maximum limit of ${maxLimit} numbers.`);
      return;
    }

    try {
      setBuyingId(poolNum.id);
      const res = await fetch("/api/phone-numbers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number_id: poolNum.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize purchase");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway SDK");
        return;
      }

      const options = {
        key: data.data.key,
        amount: data.data.amount,
        currency: data.data.currency,
        name: "Trinetra AI",
        description: `Purchase Phone Number ${data.data.phone_number}`,
        order_id: data.data.order_id,
        prefill: {
          name: data.data.user_name,
          email: data.data.user_email,
        },
        theme: { color: "#7c3aed" },
        handler: async function (response: any) {
          // Open progress modal immediately so user sees live confirmation & progress
          setPaymentProgress({
            isOpen: true,
            status: "verifying",
            title: "Securing Your Phone Line",
            phoneNumber: data.data.phone_number,
            provider: poolNum.provider === "exotel" ? "Exotel" : poolNum.provider === "sarvam" ? "Sarvam AI" : "Twilio",
            paymentId: response.razorpay_payment_id
          });

          try {
            const verifyRes = await fetch("/api/billing/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                items: [{
                  type: "number_pool",
                  key: data.data.number_id,
                  quantity: 1
                }]
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setPaymentProgress(prev => ({
                ...prev,
                status: "success",
                phoneNumber: data.data.phone_number
              }));
              toast.success("Phone number purchased successfully!");
              fetchPurchasedNumbers();
              fetchPoolNumbers();
            } else {
              setPaymentProgress(prev => ({
                ...prev,
                status: "error",
                errorMsg: verifyData.error || "Payment verification failed"
              }));
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            setPaymentProgress(prev => ({
              ...prev,
              status: "error",
              errorMsg: err.message || "Payment verification failed"
            }));
            toast.error(err.message || "Payment verification failed");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setBuyingId(null);
    }
  };

  const handleRenewNumber = async (phoneId: string) => {
    try {
      setRenewingId(phoneId);
      const res = await fetch(`/api/phone-numbers/${phoneId}/renew`, {
        method: "POST"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize renewal");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway SDK");
        return;
      }

      const options = {
        key: data.data.key,
        amount: data.data.amount,
        currency: data.data.currency,
        name: "Trinetra AI",
        description: `30-Day Renewal for ${data.data.phone_number}`,
        order_id: data.data.order_id,
        prefill: {
          name: data.data.user_name,
          email: data.data.user_email,
        },
        theme: { color: "#7c3aed" },
        handler: async function (response: any) {
          setPaymentProgress({
            isOpen: true,
            status: "verifying",
            title: "Renewing Phone Line",
            phoneNumber: data.data.phone_number,
            paymentId: response.razorpay_payment_id
          });

          try {
            const verifyRes = await fetch("/api/billing/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                items: [{
                  type: "number_renewal",
                  key: data.data.number_id,
                  quantity: 1
                }]
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setPaymentProgress(prev => ({
                ...prev,
                status: "success",
                phoneNumber: data.data.phone_number
              }));
              toast.success("Phone number renewed for 30 days!");
              fetchPurchasedNumbers();
            } else {
              setPaymentProgress(prev => ({
                ...prev,
                status: "error",
                errorMsg: verifyData.error || "Payment verification failed"
              }));
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            setPaymentProgress(prev => ({
              ...prev,
              status: "error",
              errorMsg: err.message || "Renewal verification failed"
            }));
            toast.error(err.message || "Renewal verification failed");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      toast.error(err.message || "Renewal failed");
    } finally {
      setRenewingId(null);
    }
  };

  const handleManage = (id: string) => {
    setManageNumberId(id);
  };

  const selectedNumber = Array.isArray(numbers) ? numbers.find((n: any) => n.id === manageNumberId) : undefined;
  const isAtLimit = Array.isArray(numbers) ? numbers.length >= maxLimit : false;

  if (!profile) {
    return (
      <div className="flex-1 w-full p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-8">
        <PageHeaderSkeleton />
        <CardGridSkeleton count={3} />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  const userPlanTier = (profile as any)?.plan_tier?.toLowerCase() || 'free';
  const hasPaidPlan = userPlanTier !== 'free' && userPlanTier !== 'free_demo';
  const hasPaidMinutes = ((profile as any)?.paid_minutes_limit || 0) > 0;
  const isUnlocked = hasPaidPlan || hasPaidMinutes;

  if (!isUnlocked) {
    return (
      <UpgradePrompt 
        title="Phone Numbers"
        message="Phone numbers are available on paid plans. Upgrade to the ₹99 Trial or a paid plan to buy and manage phone numbers."
        upgradeLink="/dashboard/billing"
      />
    );
  }

  return (
    <div className="flex-1 w-full p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto text-left font-[family-name:var(--font-montserrat)]">
      
      {/* Header Info Banner */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-[var(--heading)]">Telephony Infrastructure Dashboard</h4>
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
            Acquire phone numbers to connect with your virtual AI assistants. Select from pre-purchased pool lines or request custom line provisioning.
          </p>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-[var(--heading)]">Phone Numbers</h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-medium">
            Acquire and manage dedicated channels for customer interactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold text-[var(--heading)] flex items-center gap-1.5 font-mono">
            Active Lines: {numbers.length} / {maxLimit}
          </div>
        </div>
      </div>

      {/* SECTION 1: AVAILABLE NUMBERS FROM SHARED POOL */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-3 mb-6 gap-3">
          <h2 className="font-playfair text-xl font-bold text-[var(--heading)] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            Pool Numbers & Bidding Inventory ({poolNumbers.length})
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPoolCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                poolCategoryFilter === "all"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                  : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
              }`}
            >
              All ({poolNumbers.length})
            </button>
            <button
              onClick={() => setPoolCategoryFilter("available_now")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                poolCategoryFilter === "available_now"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                  : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
              }`}
            >
              Available Now
            </button>
            <button
              onClick={() => setPoolCategoryFilter("bidding")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                poolCategoryFilter === "bidding"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
              }`}
            >
              Open for Bidding
            </button>
            <button
              onClick={() => setPoolCategoryFilter("assigned_bidding")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                poolCategoryFilter === "assigned_bidding"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
              }`}
            >
              Bid for Next Cycle
            </button>
            <button
              onClick={fetchPoolNumbers}
              className="p-2 rounded-lg bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)] ml-auto"
              title="Refresh Pool"
            >
              <RefreshCw size={12} className={poolLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {poolLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-44 animate-pulse"></div>
            ))}
          </div>
        ) : poolNumbers.filter((num) => {
            if (poolCategoryFilter === "available_now") return !num.is_assigned && !num.bidding_enabled;
            if (poolCategoryFilter === "bidding") return !num.is_assigned && num.bidding_enabled;
            if (poolCategoryFilter === "assigned_bidding") return num.is_assigned && num.bidding_enabled;
            return true;
          }).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <PhoneCall size={36} className="text-[var(--muted)] mb-3" />
            <h3 className="text-base font-bold text-[var(--heading)] mb-1">No Numbers in this Category</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs font-medium">
              No numbers currently match the selected filter category. Click "Express Setup" for custom provisioning.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poolNumbers
              .filter((num) => {
                if (poolCategoryFilter === "available_now") return !num.is_assigned && !num.bidding_enabled;
                if (poolCategoryFilter === "bidding") return !num.is_assigned && num.bidding_enabled;
                if (poolCategoryFilter === "assigned_bidding") return num.is_assigned && num.bidding_enabled;
                return true;
              })
              .map((num) => (
                <NumberCard
                  key={num.id}
                  phoneNumber={{
                    id: num.id,
                    phone_number: num.phone_number,
                    city: num.city || "Mumbai",
                    did_type: num.did_type || "mobile",
                    provider: num.provider || "exotel",
                    status: num.is_assigned ? "assigned" : "available",
                    retail_price_paisa: num.retail_price_paisa || 29900,
                    bidding_enabled: num.bidding_enabled,
                    current_bid_paisa: num.current_bid_paisa,
                    minimum_bid_paisa: num.minimum_bid_paisa,
                    bid_count: num.bid_count,
                    is_assigned: num.is_assigned,
                    renewal_date: num.renewal_date
                  }}
                  isPoolItem={true}
                  isBuying={buyingId === num.id}
                  onBuyNow={handleBuyPoolNumber}
                  onPlaceBid={() => handleOpenBidModal(num)}
                  onClaimBid={() => handleClaimBid(num)}
                />
              ))}
          </div>
        )}
      </div>

      {/* SECTION 2: MY NUMBERS */}
      <div id="purchased-numbers-section">
        <div className="border-b border-[var(--border)] pb-3 mb-6 flex items-center justify-between">
          <h2 className="font-playfair text-xl font-bold text-[var(--heading)] flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-400" />
            My Numbers ({numbers.length})
          </h2>
          <button 
            onClick={fetchPurchasedNumbers}
            className="text-xs font-bold text-[var(--muted)] hover:text-[var(--heading)] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={purchasedLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {purchasedLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-44 animate-pulse"></div>
            ))}
          </div>
        ) : purchasedError ? (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-500 flex items-center justify-between text-xs font-medium">
            <p>{purchasedError}</p>
            <button onClick={fetchPurchasedNumbers} className="underline cursor-pointer">Retry</button>
          </div>
        ) : numbers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--secondary)] border border-[var(--border)] rounded-2xl p-6">
            <PhoneCall size={36} className="text-[var(--muted)] mb-3" />
            <h3 className="text-base font-bold text-[var(--heading)] mb-1">No purchased numbers</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs mb-1 font-medium">
              You haven't acquired any phone lines yet.
            </p>
            <p className="text-xs text-[var(--muted)] max-w-xs font-medium">
              Browse available numbers above or click "Express Setup" to register a line instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-[family-name:var(--font-montserrat)]">
            {numbers.map((number: any) => (
              <div key={number.id} className="space-y-2">
                {number.bidding_enabled && number.bid_count > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      ⚠️ You have {number.bid_count} active bid(s) on this number
                    </p>
                    {number.current_bid_paisa && (
                      <p className="text-[11px] text-[var(--muted)]">
                        Highest bid: <span className="font-mono font-bold text-emerald-400">₹{(number.current_bid_paisa / 100).toFixed(2)}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--muted)] italic">
                      If you renew before your expiration date, your line remains safe.
                    </p>
                  </div>
                )}
                <NumberCard 
                  phoneNumber={{
                    ...number,
                    display_price: number.retail_price_paisa
                      ? `₹${(number.retail_price_paisa / 100).toFixed(0)}/mo`
                      : "₹299/mo"
                  }} 
                  onManage={handleManage}
                  onRenew={handleRenewNumber}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}

      {selectedNumber && (
        <ManageNumberModal 
          isOpen={!!manageNumberId} 
          onClose={() => setManageNumberId(null)} 
          phoneNumber={{
            ...selectedNumber,
            display_price: selectedNumber.retail_price_paisa
              ? `₹${(selectedNumber.retail_price_paisa / 100).toFixed(0)}/mo`
              : "₹299/mo"
          }}
          agents={agents}
          onUpdate={fetchPurchasedNumbers}
        />
      )}

      {/* Payment & Carrier Provisioning Live Progress Modal */}
      <PaymentProgressModal
        isOpen={paymentProgress.isOpen}
        status={paymentProgress.status}
        title={paymentProgress.title}
        phoneNumber={paymentProgress.phoneNumber}
        provider={paymentProgress.provider}
        paymentId={paymentProgress.paymentId}
        errorMsg={paymentProgress.errorMsg}
        onClose={() => setPaymentProgress(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Place Bid Modal */}
      {bidModalNumber && (
        <div className="fixed inset-0 z-[1050] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--heading)] mb-1 flex items-center gap-2">
              <ShoppingBag className="text-emerald-500" size={18} />
              Place Bid on {bidModalNumber.phone_number}
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              {bidModalNumber.is_assigned 
                ? "This number is currently assigned. If the owner doesn't renew, the highest bidder gets priority to purchase."
                : "Submit a competing bid for priority purchase on this open line."}
            </p>

            <div className="p-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)] text-xs mb-4 space-y-1">
              <p className="text-[var(--muted)]">Number Type: <span className="text-[var(--heading)] font-semibold uppercase">{bidModalNumber.did_type || "mobile"}</span></p>
              <p className="text-[var(--muted)]">Provider: <span className="text-[var(--heading)] font-semibold capitalize">{bidModalNumber.provider || "exotel"}</span></p>
              {bidModalNumber.current_bid_paisa ? (
                <p className="text-emerald-400 font-bold">Current Highest Bid: ₹{(bidModalNumber.current_bid_paisa / 100).toFixed(2)}</p>
              ) : bidModalNumber.minimum_bid_paisa ? (
                <p className="text-emerald-400 font-bold">Minimum Bid Required: ₹{(bidModalNumber.minimum_bid_paisa / 100).toFixed(2)}</p>
              ) : null}
            </div>

            <form onSubmit={handlePlaceBid} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Your Bid Amount (₹)</label>
                <input
                  type="number"
                  min={(bidModalNumber.current_bid_paisa ? (bidModalNumber.current_bid_paisa + 100) / 100 : (bidModalNumber.minimum_bid_paisa || 0) / 100).toString()}
                  step="1"
                  required
                  value={bidAmountRupees}
                  onChange={(e) => setBidAmountRupees(e.target.value)}
                  className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] text-sm font-mono font-bold outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  Must be higher than current bid (min ₹{((bidModalNumber.current_bid_paisa ? bidModalNumber.current_bid_paisa + 100 : bidModalNumber.minimum_bid_paisa || 0) / 100).toFixed(2)})
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setBidModalNumber(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBid}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {submittingBid ? <RefreshCw className="animate-spin" size={14} /> : "Submit Bid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
