"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  CheckCircle2, AlertCircle, PhoneCall, ShieldCheck, 
  Radio, Sparkles, ArrowRight, RefreshCw, X
} from "lucide-react";

export interface PaymentProgressModalProps {
  isOpen: boolean;
  status: "verifying" | "success" | "error";
  title?: string;
  phoneNumber?: string;
  provider?: string;
  paymentId?: string;
  errorMsg?: string;
  onClose: () => void;
}

const STAGES = [
  { id: 1, label: "Payment Captured & Verified", description: "Transaction confirmed with payment gateway" },
  { id: 2, label: "Allocating Carrier Line", description: "Reserving dedicated number on telecom pool" },
  { id: 3, label: "Configuring Telecom Trunks", description: "Binding inbound and outbound voice routing" },
  { id: 4, label: "Finalizing Line Activation", description: "Registering line with your organization" }
];

export function PaymentProgressModal({
  isOpen,
  status,
  title = "Securing Your Phone Line",
  phoneNumber,
  provider = "Exotel",
  paymentId,
  errorMsg,
  onClose
}: PaymentProgressModalProps) {
  const [currentStage, setCurrentStage] = useState(1);
  const [progress, setProgress] = useState(15);

  // Animate progress smoothly while status is verifying
  useEffect(() => {
    if (!isOpen) {
      setCurrentStage(1);
      setProgress(15);
      return;
    }

    if (status === "success") {
      setCurrentStage(4);
      setProgress(100);
      return;
    }

    if (status === "error") {
      return;
    }

    // Dynamic progression while verifying
    const timer1 = setTimeout(() => {
      setCurrentStage(2);
      setProgress(45);
    }, 2500);

    const timer2 = setTimeout(() => {
      setCurrentStage(3);
      setProgress(75);
    }, 7000);

    const timer3 = setTimeout(() => {
      setCurrentStage(4);
      setProgress(90);
    }, 15000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen, status]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 shadow-2xl overflow-hidden text-left"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Close button only enabled on completed success or error */}
          {status !== "verifying" && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status === "success" 
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" 
                : status === "error"
                ? "bg-red-500/15 text-red-500 border border-red-500/30"
                : "bg-violet-500/15 text-violet-500 border border-violet-500/30 animate-pulse"
            }`}>
              {status === "success" ? (
                <CheckCircle2 size={24} />
              ) : status === "error" ? (
                <AlertCircle size={24} />
              ) : (
                <Radio size={24} className="animate-spin" />
              )}
            </div>
            <div>
              <h3 className="font-playfair text-xl font-bold text-[var(--heading)]">
                {status === "success" ? "Line Activated Successfully!" : status === "error" ? "Payment Verification" : title}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {status === "success" 
                  ? "Your dedicated number is ready to use" 
                  : status === "error"
                  ? "We encountered an issue finalizing your order"
                  : "Processing carrier provisioning in real time..."}
              </p>
            </div>
          </div>

          {/* Live Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-[var(--heading)] flex items-center gap-1.5">
                {status === "verifying" && (
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                )}
                {status === "success" ? "100% Completed" : status === "error" ? "Halted" : `Processing (${progress}%)`}
              </span>
              <span className="text-[var(--muted)] text-[11px] font-mono">
                {status === "success" ? "READY" : status === "error" ? "ACTION REQUIRED" : "ACTIVE"}
              </span>
            </div>
            <div className="w-full h-2.5 bg-[var(--secondary)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
              <motion.div
                className={`h-full rounded-full ${
                  status === "success"
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                    : status === "error"
                    ? "bg-red-500 shadow-sm shadow-red-500/50"
                    : "bg-gradient-to-r from-violet-600 to-indigo-500 shadow-sm shadow-violet-500/50"
                }`}
                initial={{ width: "15%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Status Details / Stages */}
          {status !== "error" ? (
            <div className="space-y-3 mb-6 bg-[var(--secondary)]/60 rounded-xl p-4 border border-[var(--border)]">
              {STAGES.map((stage) => {
                const isCompleted = status === "success" || currentStage > stage.id;
                const isActive = status === "verifying" && currentStage === stage.id;
                return (
                  <div key={stage.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                          <CheckCircle2 size={12} />
                        </div>
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[var(--border)] flex items-center justify-center text-[9px] text-[var(--muted)] font-mono">
                          {stage.id}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-tight ${
                        isCompleted ? "text-[var(--heading)]" : isActive ? "text-violet-400" : "text-[var(--muted)] opacity-60"
                      }`}>
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 space-y-2">
              <p className="font-semibold">{errorMsg || "Failed to verify payment or provision number."}</p>
              {paymentId && (
                <p className="text-[11px] text-[var(--muted)] font-mono">
                  Payment Reference ID: <span className="text-[var(--heading)] font-bold">{paymentId}</span>
                </p>
              )}
              <p className="text-[11px] text-[var(--muted)]">
                If money was deducted from your account, please contact our support with your Payment ID and your number will be manually activated immediately.
              </p>
            </div>
          )}

          {/* Success Number Showcase */}
          {status === "success" && phoneNumber && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Allocated Line</span>
                <p className="font-mono font-bold text-lg text-[var(--heading)]">{phoneNumber}</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold capitalize border border-emerald-500/30">
                {provider}
              </span>
            </div>
          )}

          {/* Reassurance Footer */}
          {status === "verifying" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
              <ShieldCheck size={16} className="shrink-0" />
              <span>Your payment is secured. Please do not refresh or close this tab while we connect to telecom carriers.</span>
            </div>
          )}

          {/* Action Buttons */}
          {status === "success" && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              <span>View in My Numbers</span>
              <ArrowRight size={14} />
            </button>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--secondary)] font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <a
                href="/dashboard/support"
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider text-center transition-colors cursor-pointer"
              >
                Contact Support
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
