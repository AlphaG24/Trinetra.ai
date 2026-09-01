"use client";

import { useEffect, useState } from "react";
import { 
  Phone, Zap, ChevronDown, ChevronUp, Globe, MapPin, 
  Smartphone, CreditCard, Check, Copy, HelpCircle, AlertCircle,
  Search, RefreshCw, SlidersHorizontal, XCircle, Info, PhoneCall, ShoppingBag
} from "lucide-react";
import { NumberCard } from "@/src/components/phone-numbers/NumberCard";
import { ProvisionNumberModal } from "@/src/components/phone-numbers/ProvisionNumberModal";
import { ManageNumberModal } from "@/src/components/phone-numbers/ManageNumberModal";
import { toast } from "sonner";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardStore } from "@/store/dashboardStore";
import UpgradePrompt from "@/src/components/shared/UpgradePrompt";

export default function PhoneNumbersPage() {
  const { profile, setProfile } = useDashboardStore();

  useEffect(() => {
    if (!profile) {
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

  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [manageNumberId, setManageNumberId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPurchasedNumbers();
    fetchPoolNumbers();
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
              toast.success("Phone number purchased successfully!");
              fetchPurchasedNumbers();
              fetchPoolNumbers();
            } else {
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
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
              toast.success("Phone number renewed for 30 days!");
              fetchPurchasedNumbers();
            } else {
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
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
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userPlanTier = (profile as any)?.plan_tier?.toLowerCase() || 'free';
  if (userPlanTier === 'free' || userPlanTier === 'free_demo') {
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
          <button
            onClick={() => setIsProvisionModalOpen(true)}
            disabled={isAtLimit}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              isAtLimit 
                ? "bg-[var(--secondary)] text-[var(--muted)] cursor-not-allowed border border-[var(--border)]"
                : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/15"
            }`}
          >
            + Express Setup
          </button>
        </div>
      </div>

      {/* SECTION 1: AVAILABLE NUMBERS FROM SHARED POOL */}
      <div className="mb-12">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-6">
          <h2 className="font-playfair text-xl font-bold text-[var(--heading)] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            Available Numbers in Pool ({poolNumbers.length})
          </h2>
          <button
            onClick={fetchPoolNumbers}
            className="text-xs font-bold text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={poolLoading ? "animate-spin" : ""} /> Refresh Pool
          </button>
        </div>

        {poolLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-44 animate-pulse"></div>
            ))}
          </div>
        ) : poolNumbers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <PhoneCall size={36} className="text-[var(--muted)] mb-3" />
            <h3 className="text-base font-bold text-[var(--heading)] mb-1">No Pool Numbers Currently Available</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs font-medium">
              All shared pool numbers are assigned. Click "Express Setup" to request custom line provisioning.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poolNumbers.map((num) => (
              <NumberCard
                key={num.id}
                phoneNumber={{
                  id: num.id,
                  phone_number: num.phone_number,
                  city: num.city || "Mumbai",
                  did_type: num.did_type || "mobile",
                  provider: num.provider || "voicelink",
                  status: "available",
                  retail_price_paisa: num.retail_price_paisa || 29900
                }}
                isPoolItem={true}
                isBuying={buyingId === num.id}
                onBuyNow={handleBuyPoolNumber}
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
              <NumberCard 
                key={number.id} 
                phoneNumber={{
                  ...number,
                  display_price: "₹299/mo"
                }} 
                onManage={handleManage}
                onRenew={handleRenewNumber}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProvisionNumberModal 
        isOpen={isProvisionModalOpen} 
        onClose={() => setIsProvisionModalOpen(false)} 
        onSuccess={() => {
          fetchPurchasedNumbers();
        }}
        userCountry={(profile as any)?.country || "IN"}
      />

      {selectedNumber && (
        <ManageNumberModal 
          isOpen={!!manageNumberId} 
          onClose={() => setManageNumberId(null)} 
          phoneNumber={{
            ...selectedNumber,
            display_price: "₹299/mo"
          }}
          onUpdate={fetchPurchasedNumbers}
        />
      )}
    </div>
  );
}
