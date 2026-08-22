"use client";

import { useEffect, useState } from "react";
import { 
  Phone, Zap, ChevronDown, ChevronUp, Globe, MapPin, 
  Smartphone, CreditCard, Check, Copy, HelpCircle, AlertCircle,
  Search, RefreshCw, SlidersHorizontal, XCircle, Info, PhoneCall
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
  const { profile } = useDashboardStore();

  // Purchased Numbers State
  const [numbers, setNumbers] = useState<any[]>([]);
  const [pricingInfo, setPricingInfo] = useState<any>(null);
  const [purchasedLoading, setPurchasedLoading] = useState(true);
  const [purchasedError, setPurchasedError] = useState("");
  const [maxLimit, setMaxLimit] = useState(5);
  
  // Selection/Search State
  const userCountry = (profile as any)?.country || "US";
  const [country, setCountry] = useState(userCountry);
  const [provider, setProvider] = useState(userCountry === 'IN' ? 'voicelink' : 'twilio');
  const [areaCode, setAreaCode] = useState('');
  const [city, setCity] = useState('');
  const [didType, setDidType] = useState('local');
  
  // Available Numbers Results State
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  
  // Provisioning state
  const [provisioningNum, setProvisioningNum] = useState<string | null>(null);
  
  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [manageNumberId, setManageNumberId] = useState<string | null>(null);

  // Sync country and provider when profile loads
  useEffect(() => {
    if (profile) {
      const cntry = (profile as any).country || "US";
      setCountry(cntry);
      setProvider(cntry === 'IN' ? 'voicelink' : 'twilio');
      setDidType(cntry === 'IN' ? 'mobile' : 'local');
    }
  }, [profile]);

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

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/phone-numbers/pricing");
      const data = await res.json();
      if (res.ok) {
        setPricingInfo(data.data);
      }
    } catch (err) {
      console.error("Failed to load pricing info", err);
    }
  };

  useEffect(() => {
    fetchPurchasedNumbers();
    fetchPricing();

    // Trigger sync in the background without blocking the initial UI load
    fetch("/api/phone-numbers/sync", { method: "POST" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Sync returned non-200");
      })
      .then(data => {
        if (data.success) {
          // Silently refresh numbers list in case sync changed something
          fetchPurchasedNumbers();
        }
      })
      .catch(err => {
        console.error("Background auto-sync failed", err);
      });
  }, []);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setProvider(newCountry === 'IN' ? 'voicelink' : 'twilio');
    setDidType(newCountry === 'IN' ? 'mobile' : 'local');
    setAreaCode('');
    setCity('');
    setAvailableNumbers([]);
    setHasSearched(false);
    setVisibleCount(6);
  };

  const handleSearchAvailable = async () => {
    setSearchLoading(true);
    setHasSearched(true);
    setVisibleCount(6);
    
    try {
      const params = new URLSearchParams({
        provider,
        did_type: didType,
        city: city || ''
      });
      if (areaCode) {
        // Strip zeros for US area code
        const cleanArea = provider === 'twilio' ? areaCode.replace(/^0+/, '') : areaCode;
        params.append('area_code', cleanArea);
      }
      
      const res = await fetch(`/api/phone-numbers/available?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to search numbers");
      
      setAvailableNumbers(data.data?.available_numbers || []);
    } catch (err: any) {
      toast.error(err.message || "Search failed");
      setAvailableNumbers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBuyNumber = async (num: any) => {
    const isAtLimit = Array.isArray(numbers) ? numbers.length >= maxLimit : false;
    if (isAtLimit) {
      toast.error(`You have reached the maximum limit of ${maxLimit} numbers.`);
      return;
    }
    
    setProvisioningNum(num.phone_number);
    try {
      const res = await fetch('/api/phone-numbers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: num.phone_number,
          did_type: num.did_type,
          provider: num.provider,
          area_code: num.area_code,
          city: num.city
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to purchase number");
      
      toast.success('Number purchased successfully!');
      
      // Remove from available numbers list
      setAvailableNumbers(prev => prev.filter(n => n.phone_number !== num.phone_number));
      
      await fetchPurchasedNumbers();
    } catch (err: any) {
      const message = err.message || "Purchase failed";
      if (message.includes("Trial accounts are limited") || message.includes("limited to one")) {
        toast.error(message, {
          action: {
            label: "View Purchased",
            onClick: () => {
              const element = document.getElementById("purchased-numbers-section");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }
          },
          duration: 10000
        });
      } else {
        toast.error(message);
      }
    } finally {
      setProvisioningNum(null);
    }
  };

  const handleManage = (id: string) => {
    setManageNumberId(id);
  };

  const selectedNumber = Array.isArray(numbers) ? numbers.find((n: any) => n.id === manageNumberId) : undefined;
  const isAtLimit = Array.isArray(numbers) ? numbers.length >= maxLimit : false;

  const popularAreaCodes = country === 'US' 
    ? ['212', '310', '312', '415', '617']
    : ['022', '011', '080', '044', '033'];

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
        <div className="text-[family-name:var(--font-merriweather)]">
          <h4 className="text-sm font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)]">Telephony Infrastructure Dashboard</h4>
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
            Acquire phone numbers to connect with your virtual AI assistants. We support domestic Indian lines via **VoiceLink** and US/UK international connections via **Twilio**.
          </p>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-[var(--heading)] font-[family-name:var(--font-playfair)]">Phone Numbers</h1>
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

      {/* Search and Filters Bar */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider mb-4 flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-violet-500" />
          Find New Phone Numbers
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Country</label>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-violet-500 transition-colors"
            >
              <option value="US">🇺🇸 United States</option>
              <option value="IN">🇮🇳 India</option>
            </select>
          </div>

          {/* Provider */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-violet-500 transition-colors"
            >
              {country === 'IN' ? (
                <option value="voicelink">VoiceLink (IN)</option>
              ) : (
                <>
                  <option value="twilio">Twilio (US/Global)</option>
                  <option value="simulated">Simulated (Sandbox)</option>
                </>
              )}
            </select>
          </div>

          {/* Area Code */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Area Code</label>
            <div className="relative">
              <input
                type="text"
                placeholder={provider === 'voicelink' ? 'e.g. 022' : 'e.g. 212'}
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                maxLength={4}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-violet-500 transition-colors"
              />
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)]" />
            </div>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">City</label>
            <input
              type="text"
              placeholder="e.g. Chicago"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* DID Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Number Type</label>
            <select
              value={didType}
              onChange={(e) => setDidType(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-violet-500 transition-colors"
            >
              {provider === 'voicelink' ? (
                <>
                  <option value="mobile">Mobile</option>
                  <option value="landline">Landline</option>
                  <option value="tollfree">Toll-Free</option>
                </>
              ) : (
                <>
                  <option value="local">Local</option>
                  <option value="mobile">Mobile</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Action Button & Suggestions */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Suggestions:</span>
            {popularAreaCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setAreaCode(code)}
                className="px-2.5 py-1 text-xs rounded bg-[var(--secondary)] border border-[var(--border)] text-[var(--heading)] hover:border-violet-500 transition-all font-semibold"
              >
                {code}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleSearchAvailable}
            disabled={searchLoading}
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            {searchLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Searching...
              </>
            ) : (
              <>
                <Search size={14} /> Search Available Numbers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Available Numbers Section */}
      {hasSearched && (
        <div className="mb-10">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-6">
            <h2 className="font-playfair text-xl font-bold text-[var(--heading)] flex items-center gap-2 font-[family-name:var(--font-playfair)]">
              Available Numbers ({availableNumbers.length} found)
            </h2>
            <button
              onClick={handleSearchAvailable}
              className="text-xs font-bold text-violet-500 hover:underline flex items-center gap-1 cursor-pointer font-[family-name:var(--font-montserrat)]"
            >
              <RefreshCw size={12} /> Refresh List
            </button>
          </div>

          {searchLoading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 h-44 flex flex-col animate-pulse">
                  <div className="w-32 h-6 bg-[var(--secondary)] rounded mb-3"></div>
                  <div className="w-44 h-4 bg-[var(--secondary)] rounded mb-2"></div>
                  <div className="w-20 h-5 bg-[var(--secondary)] rounded-full mb-auto"></div>
                  <div className="w-full h-9 bg-[var(--secondary)] rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : availableNumbers.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
              <XCircle size={44} className="text-red-500 mb-3" />
              <h3 className="text-base font-bold text-[var(--heading)] mb-1">No Numbers Found</h3>
              <p className="text-xs text-[var(--muted)] mb-5 max-w-xs font-medium">
                No active inventory was resolved for area code {areaCode || "any"}. Try searching a different city or region code.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAreaCode(''); setCity(''); }}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--secondary)]"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            /* Available Grid List */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableNumbers.slice(0, visibleCount).map((num) => {
                  const isBuying = provisioningNum === num.phone_number;
                  return (
                    <div 
                      key={num.phone_number}
                      className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-violet-500/50 rounded-2xl p-5 flex flex-col transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider capitalize">
                          {num.provider}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full capitalize font-[family-name:var(--font-montserrat)]">
                          <Smartphone size={10} />
                          {num.did_type}
                        </span>
                      </div>

                      <h3 className="font-mono text-xl font-bold text-[var(--heading)] tracking-wider mb-2">
                        {num.phone_number}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-[var(--body)] font-medium mb-5">
                        <MapPin size={13} className="text-[var(--muted)] shrink-0" />
                        <span className="truncate">{num.city || "United States"}</span>
                      </div>

                      <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted)]">Subscription</span>
                          <span className="text-xs font-black text-[var(--heading)]">
                            {pricingInfo?.display_text || "Billed monthly"}
                          </span>
                        </div>

                        <button
                          onClick={() => handleBuyNumber(num)}
                          disabled={isBuying || isAtLimit}
                          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            isAtLimit
                              ? "bg-[var(--secondary)] text-[var(--muted)] cursor-not-allowed border border-[var(--border)]"
                              : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/10"
                          }`}
                        >
                          {isBuying ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" /> Buying...
                            </>
                          ) : (
                            <>
                              <CreditCard size={12} /> Buy Line
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Pagination */}
              {availableNumbers.length > visibleCount && (
                <div className="flex flex-col items-center gap-2 pt-4">
                  <p className="text-xs text-[var(--muted)] font-medium">
                    Showing {Math.min(visibleCount, availableNumbers.length)} of {availableNumbers.length} numbers
                  </p>
                  <button
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="px-5 py-2 text-xs font-bold rounded-lg border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--secondary)] transition-all cursor-pointer"
                  >
                    Load More Numbers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Purchased Numbers Grid Section */}
      <div id="purchased-numbers-section">
        <div className="border-b border-[var(--border)] pb-3 mb-6 flex items-center justify-between">
          <h2 className="font-playfair text-xl font-bold text-[var(--heading)] font-[family-name:var(--font-playfair)]">
            Your Purchased Numbers ({numbers.length})
          </h2>
          <button 
            onClick={fetchPurchasedNumbers}
            className="text-xs font-bold text-[var(--muted)] hover:text-[var(--heading)] flex items-center gap-1 cursor-pointer font-[family-name:var(--font-montserrat)]"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {purchasedLoading ? (
          /* Purchased Skeletons */
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
          /* Empty Purchased State */
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--secondary)] border border-[var(--border)] rounded-2xl p-6">
            <PhoneCall size={36} className="text-[var(--muted)] mb-3" />
            <h3 className="text-base font-bold text-[var(--heading)] mb-1">No purchased numbers</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs mb-1 font-medium">
              You haven't acquired any phone lines yet.
            </p>
            <p className="text-xs text-[var(--muted)] max-w-xs font-medium">
              Search above or click "Express Setup" to register a line instantly.
            </p>
          </div>
        ) : (
          /* Numbers List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-[family-name:var(--font-montserrat)]">
            {numbers.map((number: any) => (
              <NumberCard 
                key={number.id} 
                phoneNumber={{
                  ...number,
                  display_price: pricingInfo?.display_text || "Billed monthly"
                }} 
                onManage={handleManage} 
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
        userCountry={userCountry}
      />

      {selectedNumber && (
        <ManageNumberModal 
          isOpen={!!manageNumberId} 
          onClose={() => setManageNumberId(null)} 
          phoneNumber={{
            ...selectedNumber,
            display_price: pricingInfo?.display_text || "Billed monthly"
          }}
          onUpdate={fetchPurchasedNumbers}
        />
      )}
    </div>
  );
}
