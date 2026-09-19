"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export interface PlanValidityTimerProps {
  createdAt?: string | null;
  expiresAt?: string | null;
  validityDays?: number | null;
  label?: string;
  size?: "xs" | "sm" | "md";
  showProgress?: boolean;
  className?: string;
}

export function PlanValidityTimer({
  createdAt,
  expiresAt,
  validityDays = 30,
  label = "Validity",
  size = "sm",
  showProgress = true,
  className = ""
}: PlanValidityTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    daysPassed: number;
    percentPassed: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    daysPassed: 0,
    percentPassed: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const startMs = createdAt ? new Date(createdAt).getTime() : now;
      const totalDays = validityDays && validityDays > 0 ? validityDays : 30;
      const totalDurationMs = totalDays * 24 * 60 * 60 * 1000;

      let endMs = expiresAt ? new Date(expiresAt).getTime() : startMs + totalDurationMs;

      const remainingMs = endMs - now;
      const elapsedMs = Math.max(0, now - startMs);

      if (remainingMs <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          daysPassed: totalDays,
          percentPassed: 100,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const daysPassed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
      const percentPassed = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

      setTimeLeft({
        days,
        hours,
        minutes,
        daysPassed,
        percentPassed,
        isExpired: false
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // recalculate every minute
    return () => clearInterval(interval);
  }, [createdAt, expiresAt, validityDays]);

  const isUrgent = !timeLeft.isExpired && timeLeft.days <= 5;

  const badgeBg = timeLeft.isExpired
    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
    : isUrgent
    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
    : "bg-violet-500/10 border-violet-500/20 text-violet-400";

  const progressBg = timeLeft.isExpired
    ? "bg-rose-500"
    : isUrgent
    ? "bg-gradient-to-r from-amber-500 to-rose-500"
    : "bg-gradient-to-r from-violet-500 to-indigo-500";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-1.5">
          <Clock className={`shrink-0 ${size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} ${timeLeft.isExpired ? "text-rose-400" : isUrgent ? "text-amber-400" : "text-violet-400"}`} />
          <span className={`${size === "xs" ? "text-[10px]" : "text-[11px]"} font-medium text-[var(--muted)] font-mono`}>
            {timeLeft.isExpired ? (
              <span className="text-rose-400 font-bold">Pack Expired</span>
            ) : (
              <span>
                <strong className={isUrgent ? "text-amber-400" : "text-[var(--heading)]"}>
                  {timeLeft.days}d {timeLeft.hours}h left
                </strong>
                <span className="text-[var(--muted)] text-[10px] ml-1">
                  ({timeLeft.daysPassed}d passed)
                </span>
              </span>
            )}
          </span>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badgeBg}`}>
          {timeLeft.isExpired ? "Expired" : `${100 - timeLeft.percentPassed}% Remain`}
        </span>
      </div>

      {showProgress && (
        <div className="w-full h-1.5 bg-zinc-800/60 rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full transition-all duration-500 rounded-full ${progressBg}`}
            style={{ width: `${100 - timeLeft.percentPassed}%` }}
            title={`${timeLeft.daysPassed} days passed, ${timeLeft.days} days remaining`}
          />
        </div>
      )}
    </div>
  );
}
