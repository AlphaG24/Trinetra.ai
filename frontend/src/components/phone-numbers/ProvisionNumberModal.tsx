"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  X, Zap, MapPin, Smartphone, Globe, CreditCard, 
  ChevronDown, Phone, CheckCircle, XCircle 
} from "lucide-react";

const getCitiesForProvider = (provider: string, country: string) => {
  if (provider === 'twilio' || country === 'US') {
    return [
      { name: 'New York', code: '212' },
      { name: 'Los Angeles', code: '310' },
      { name: 'Chicago', code: '312' },
      { name: 'San Francisco', code: '415' },
      { name: 'Dallas', code: '214' },
      { name: 'Miami', code: '305' },
      { name: 'Seattle', code: '206' },
      { name: 'Boston', code: '617' },
      { name: 'Phoenix', code: '602' },
      { name: 'Denver', code: '303' },
    ]
  }
  // VoiceLink / Indian cities
  return [
    { name: 'Mumbai', code: '022' },
    { name: 'Delhi', code: '011' },
    { name: 'Bangalore', code: '080' },
    { name: 'Chennai', code: '044' },
    { name: 'Kolkata', code: '033' },
    { name: 'Hyderabad', code: '040' },
    { name: 'Pune', code: '020' },
    { name: 'Ahmedabad', code: '079' },
  ]
}

export interface ProvisionNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newNumber: any) => void;
  userCountry: string;
  userCity?: string;
}

export function ProvisionNumberModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userCountry, 
  userCity 
}: ProvisionNumberModalProps) {
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  
  const autoDetectedCity = userCountry === "IN" ? "Mumbai" : "New York";
  const autoDetectedAreaCode = userCountry === "IN" ? "022" : "212";
  const autoDetectedProvider = userCountry === "IN" ? "sarvam" : "twilio";
  
  const cities = getCitiesForProvider(autoDetectedProvider, userCountry);
  const [selectedCity, setSelectedCity] = useState(cities[0]?.code || "022");
  const [selectedType, setSelectedType] = useState("mobile");

  // Sync selectedCity if userCountry / provider changes
  useEffect(() => {
    const updatedCities = getCitiesForProvider(autoDetectedProvider, userCountry);
    setSelectedCity(updatedCities[0]?.code || "022");
  }, [userCountry, autoDetectedProvider]);
  
  type ProvisionState = "idle" | "browse_numbers" | "loading" | "success" | "error";
  const [provisionState, setProvisionState] = useState<ProvisionState>("idle");
  const [loadingMode, setLoadingMode] = useState<"search" | "provision">("search");
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [selectedNumberForPurchase, setSelectedNumberForPurchase] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [provisionedNumber, setProvisionedNumber] = useState<any>(null);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && provisionState !== "loading") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, provisionState]);

  // Auto-close on success after 10s
  useEffect(() => {
    if (provisionState === "success") {
      const timer = setTimeout(() => {
        onClose();
        setProvisionState("idle");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [provisionState, onClose]);

  const handleSearchNumbers = async (isExpress: boolean) => {
    setLoadingMode("search");
    setProvisionState("loading");
    setErrorMsg("");
    setSelectedNumberForPurchase(null);
    setAvailableNumbers([]);
    
    try {
      const area = isExpress ? autoDetectedAreaCode : selectedCity;
      const type = isExpress ? "mobile" : selectedType;
      const provider = autoDetectedProvider;
      
      const res = await fetch(`/api/phone-numbers/available?provider=${provider}&area_code=${area}&did_type=${type}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch available numbers");
      }
      
      const fetched = data.data?.available_numbers || [];
      setAvailableNumbers(fetched);
      setProvisionState("browse_numbers");
      
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
      setProvisionState("error");
    }
  };

  const handleProvision = async (selectedNum: any) => {
    setLoadingMode("provision");
    setProvisionState("loading");
    setErrorMsg("");
    
    try {
      const body = {
        area_code: selectedNum.area_code,
        city: selectedNum.city,
        did_type: selectedNum.did_type,
        provider: selectedNum.provider,
        phone_number: selectedNum.phone_number
      };
      
      const res = await fetch("/api/phone-numbers/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to provision number");
      }
      
      setProvisionedNumber(data.data?.phone_number || data.data || data);
      setProvisionState("success");
      onSuccess(data.data?.phone_number || data.data || data);
      
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
      setProvisionState("error");
    }
  };

  const resetModal = () => {
    setProvisionState("idle");
    setErrorMsg("");
    setIsCustomExpanded(false);
    setSelectedNumberForPurchase(null);
    setAvailableNumbers([]);
  };

  const handleClose = () => {
    if (provisionState === "loading") return;
    onClose();
    setTimeout(resetModal, 300); // Reset after animation
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 shadow-2xl overflow-hidden"
        >
          {/* Header X Button */}
          {provisionState !== "loading" && (
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--heading)] transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}

          {/* IDLE / EXPRESS & CUSTOM STATE */}
          {provisionState === "idle" && (
            <div className="flex flex-col">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Zap size={20} className="fill-amber-500/20" />
                </div>
                <div>
                  <h2 id="modal-title" className="font-playfair text-xl font-semibold text-[var(--heading)]">Express Setup</h2>
                  <p className="text-sm text-[var(--muted)]">One click and your number is ready</p>
                </div>
              </div>

              {/* Express Card */}
              <div className="mb-6 rounded-xl border border-[var(--primary-bg)] bg-[var(--card-bg)] p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-bg)]/5 rounded-bl-full -z-10" />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]">
                    <MapPin size={16} className="text-[var(--primary-bg)]" />
                    <span>{autoDetectedCity}, {userCountry === 'IN' ? 'India' : 'International'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]">
                    <Smartphone size={16} className="text-[var(--primary-bg)]" />
                    <span>Mobile Number</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]">
                    <Globe size={16} className="text-[var(--primary-bg)]" />
                    <span>{autoDetectedProvider === 'sarvam' ? 'Sarvam AI (India)' : 'International Provider'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]">
                    <CreditCard size={16} className="text-[var(--primary-bg)]" />
                    <span>Billed monthly</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSearchNumbers(true)}
                  className="mt-5 w-full bg-[var(--primary-bg)] text-[var(--heading)] hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-lg px-5 py-2 flex items-center justify-center gap-2 font-semibold"
                >
                  <Zap size={18} />
                  Get My Number — 1 Click
                </button>
                <p className="text-center text-xs text-[var(--muted)] mt-3">
                  Setup in seconds • Cancel anytime • Billed monthly
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold">Or customize</span>
                <div className="h-[1px] flex-1 bg-[var(--border)]" />
              </div>

              {/* Custom Expandable Section */}
              <button
                onClick={() => setIsCustomExpanded(!isCustomExpanded)}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-[var(--heading)] transition-colors hover:bg-[var(--secondary)]"
              >
                Customize your number
                <ChevronDown size={16} className={`transition-transform duration-200 ${isCustomExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isCustomExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="flex flex-col gap-4 rounded-lg bg-[var(--secondary)] p-4 border border-[var(--border)]">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[var(--muted)]">City / Region</label>
                        <select 
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-[var(--primary-bg)]"
                        >
                          {cities.map(c => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[var(--muted)]">Number Type</label>
                        <select 
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-[var(--primary-bg)]"
                        >
                          <option value="mobile">Mobile (Best for calls)</option>
                          <option value="landline">Landline (Business look)</option>
                          <option value="tollfree">Toll-Free (Customer support)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[var(--muted)]">Provider</label>
                        <div className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)] cursor-not-allowed">
                          Auto-selected: {autoDetectedProvider === 'sarvam' ? 'Sarvam AI' : 'Twilio'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSearchNumbers(false)}
                        className="mt-2 w-full bg-[var(--primary-bg)] text-[var(--heading)] hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-lg px-5 py-2 font-medium"
                      >
                        Search Available Numbers
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* BROWSE NUMBERS STATE */}
          {provisionState === "browse_numbers" && (
            <div className="flex flex-col">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-bg)]/10 text-[var(--primary-bg)]">
                  <Phone size={20} />
                </div>
                <div>
                  <h2 className="font-playfair text-xl font-semibold text-[var(--heading)] font-[family-name:var(--font-montserrat)]">Select a Number</h2>
                  <p className="text-sm text-[var(--muted)] font-medium">Choose from available numbers in area code {selectedCity}</p>
                </div>
              </div>

              {availableNumbers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[var(--secondary)] rounded-xl border border-[var(--border)] p-6">
                  <XCircle size={40} className="text-red-500 mb-3" />
                  <p className="font-semibold text-[var(--heading)] mb-1">No numbers available in area code {selectedCity}</p>
                  <p className="text-xs text-[var(--muted)] mb-5">Please try searching a different city or area code.</p>
                  <button
                    onClick={() => setProvisionState("idle")}
                    className="bg-[var(--primary-bg)] text-[var(--heading)] hover:shadow-lg transition-all rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Go Back
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Grid list scrollable */}
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {availableNumbers.map((num) => {
                      const isSelected = selectedNumberForPurchase?.phone_number === num.phone_number;
                      return (
                        <div
                          key={num.phone_number}
                          onClick={() => setSelectedNumberForPurchase(num)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[var(--primary-bg)]/10 border-[var(--primary-bg)] ring-1 ring-[var(--primary-bg)]"
                              : "bg-[var(--secondary)] border-[var(--border)] hover:border-[var(--muted)]"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-base font-bold text-[var(--heading)] tracking-wider">
                              {num.phone_number}
                            </span>
                            <span className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                              <MapPin size={12} /> {num.city}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]">
                              {num.did_type}
                            </span>
                            <button
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-[var(--primary-bg)] text-[var(--heading)]"
                                  : "bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--secondary)]"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => {
                        setSelectedNumberForPurchase(null);
                        setProvisionState("idle");
                      }}
                      className="flex-1 border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--secondary)] transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => selectedNumberForPurchase && handleProvision(selectedNumberForPurchase)}
                      disabled={!selectedNumberForPurchase}
                      className="flex-1 bg-[var(--primary-bg)] text-[var(--heading)] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Zap size={16} />
                      Buy Selected Number
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {provisionState === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-[var(--primary-bg)] opacity-20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-bg)]/20 text-[var(--primary-bg)]">
                  <Phone size={32} className="animate-pulse" />
                </div>
              </div>
              <h3 className="font-playfair text-xl font-semibold text-[var(--heading)] mb-2">
                {loadingMode === "search" ? "Searching available numbers" : "Provisioning your number"}
              </h3>
              <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                {loadingMode === "search" ? "Connecting to provider network" : "This takes about 30 seconds"}
                <span className="flex">
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}>.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}>.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}>.</motion.span>
                </span>
              </p>
            </div>
          )}

          {/* SUCCESS STATE */}
          {provisionState === "success" && provisionedNumber && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle size={36} />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-[var(--heading)] mb-1">Number Ready!</h3>
              <div className="inline-flex items-center justify-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-500 mb-6">
                Inbound calls active
              </div>
              
              <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-6 mb-6">
                <div className="text-3xl font-bold tracking-widest text-[var(--heading)] mb-4 flex items-center justify-center gap-2">
                  {provisionedNumber.phone_number}
                </div>
                
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {provisionedNumber.city}</span>
                  <span className="flex items-center gap-1 capitalize"><Smartphone size={14} /> {provisionedNumber.did_type}</span>
                  <span className="flex items-center gap-1"><CreditCard size={14} /> Billed monthly</span>
                </div>
              </div>
              
              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={handleClose}
                  className="w-full bg-[var(--primary-bg)] text-[var(--heading)] hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-lg px-5 py-2 font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {provisionState === "error" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <XCircle size={36} />
              </div>
              <h3 className="font-playfair text-xl font-bold text-[var(--heading)] mb-2">Provisioning Failed</h3>
              <p className="text-sm text-[var(--muted)] mb-8 max-w-sm">
                {errorMsg}
              </p>
              
              <div className="flex w-full gap-3">
                <button
                  onClick={resetModal}
                  className="flex-1 bg-[var(--primary-bg)] text-[var(--heading)] hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-lg px-5 py-2 font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
