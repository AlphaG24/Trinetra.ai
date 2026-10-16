import { Fragment } from "react";
import { createClient } from "@supabase/supabase-js";

function formatLink(url: string | null) {
  if (!url || url.trim() === "") return "/dashboard";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

const FALLBACK_SERVICES = [
  { name: "Trinetra Shiksha", subdomain_url: "https://shiksha.trinetraedu-ai.com" },
  { name: "Vikram Voice Assistant", subdomain_url: "/dashboard" },
  { name: "Autonomous Support Desk", subdomain_url: "/dashboard" },
  { name: "Outbound Sales Closer", subdomain_url: "/dashboard" },
  { name: "Lead Qualification Engine", subdomain_url: "/dashboard" },
  { name: "Multi-Dialect Conversationalist", subdomain_url: "/dashboard" },
  { name: "Appointment Booker", subdomain_url: "/dashboard" },
];

export async function MetricsBar() {
  // Fetch tools dynamically from database bypassing RLS using service role key
  let services: any[] = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase
        .from("platform_services")
        .select("name, subdomain_url")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (data && data.length > 0) {
        services = data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch platform services in MetricsBar:", err);
  }

  const activeItems =
    services.length > 0
      ? [
          { name: "Trinetra Shiksha", subdomain_url: "https://shiksha.trinetraedu-ai.com" },
          ...services.map((s) => ({
            name: s.name,
            subdomain_url: s.subdomain_url,
          })),
        ]
      : FALLBACK_SERVICES;

  // Repeat list items to comfortably fill width on large monitors
  const repeatedItems = Array(4).fill(activeItems).flat();

  return (
    <section className="w-full pt-4 sm:pt-6 md:pt-8 pb-10 sm:pb-14 bg-transparent overflow-hidden flex flex-col items-center relative group select-none z-10">
      <style>{`
        @keyframes marqueeContinuous {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* Marquee with smooth edge feathering mask */}
      <div
        className="flex w-full relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      >
        {/* Single animated track that translates -50% with two static sibling blocks */}
        <div
          className="flex w-max shrink-0 items-center group-hover:[animation-play-state:paused]"
          style={{
            animation: "marqueeContinuous 100s linear infinite",
            willChange: "transform",
          }}
        >
          {/* Track 1: First continuous set */}
          <div className="flex shrink-0 items-center">
            {repeatedItems.map((item, idx) => {
              const hasExternalLink = item.subdomain_url && item.subdomain_url.trim() !== "";
              const href = formatLink(item.subdomain_url);

              return (
                <Fragment key={`track-1-${idx}`}>
                  <a
                    href={href}
                    target={hasExternalLink ? "_blank" : undefined}
                    rel={hasExternalLink ? "noopener noreferrer" : undefined}
                    className="shrink-0 whitespace-nowrap mx-6 sm:mx-10 font-[family-name:var(--font-cal-sans)] font-semibold text-[15px] sm:text-[17px] md:text-[18px] tracking-[0.08em] uppercase transition-colors duration-200 cursor-pointer text-[#334155] hover:text-[#2563EB]"
                  >
                    {item.name}
                  </a>
                  <span
                    className="text-[10px] mx-2 shrink-0 select-none text-[#2563EB]/60"
                  >
                    ◆
                  </span>
                </Fragment>
              );
            })}
          </div>

          {/* Track 2: Identical sibling set ensuring seamless infinite loop with zero overlap */}
          <div className="flex shrink-0 items-center" aria-hidden="true">
            {repeatedItems.map((item, idx) => {
              const hasExternalLink = item.subdomain_url && item.subdomain_url.trim() !== "";
              const href = formatLink(item.subdomain_url);

              return (
                <Fragment key={`track-2-${idx}`}>
                  <a
                    href={href}
                    target={hasExternalLink ? "_blank" : undefined}
                    rel={hasExternalLink ? "noopener noreferrer" : undefined}
                    className="shrink-0 whitespace-nowrap mx-6 sm:mx-10 font-[family-name:var(--font-cal-sans)] font-semibold text-[15px] sm:text-[17px] md:text-[18px] tracking-[0.08em] uppercase transition-colors duration-200 cursor-pointer text-[#334155] hover:text-[#2563EB]"
                  >
                    {item.name}
                  </a>
                  <span
                    className="text-[10px] mx-2 shrink-0 select-none text-[#2563EB]/60"
                  >
                    ◆
                  </span>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
