import { Fragment } from "react";

const metrics = [
  "24/7 AI Agents",
  "Self-Healing Systems",
  "Hindi + English Support",
  "Setup in 24 Hours",
  "Enterprise-Grade Security",
  "Pay Per Use Pricing",
  "No Contracts Required",
  "Cancel Anytime",
  "India-First AI Platform",
];

export function MetricsBar() {
  // Duplicate array inside standard content block to guarantee coverage even on 4K+ displays
  const doubledMetrics = [...metrics, ...metrics];
  
  const content = (
    <div className="flex items-center w-max pr-[20px] animate-marquee group-hover:[animation-play-state:paused]">
      {doubledMetrics.map((metric, idx) => (
        <Fragment key={idx}>
          <span className="font-mono text-[13px] font-normal text-[#6B6088] whitespace-nowrap">
            {metric}
          </span>
          <span className="text-[#8B5CF6] text-[10px] mx-[20px] shrink-0 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
            ◆
          </span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <section className="w-full bg-[#0C0118] border-y border-[rgba(139,92,246,0.08)] py-[20px] overflow-hidden flex relative">
      <div 
        className="flex w-full"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        }}
      >
        <div className="flex w-max group">
          {/* We render the row twice side-by-side to allow seamless infinite scrolling */}
          {content}
          {content}
        </div>
      </div>
    </section>
  );
}
