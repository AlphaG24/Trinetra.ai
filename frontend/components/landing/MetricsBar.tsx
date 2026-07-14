import { Fragment } from "react";
import { createClient } from "@supabase/supabase-js";

function formatLink(url: string | null) {
  if (!url || url.trim() === "") return "/login";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

export async function MetricsBar() {
  // Fetch tools dynamically from database bypassing RLS using service role key
  let services: any[] = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from("platform_services")
      .select("name, subdomain_url")
      .eq("is_active", true)
      .order("name", { ascending: true });
    
    if (data) {
      services = data;
    }
  } catch (err) {
    console.error("Failed to fetch platform services in MetricsBar:", err);
  }

  // Hardcode Trinetra Shiksha since it is a separate platform
  const listItems = [
    { name: "Trinetra Shiksha", subdomain_url: "https://shiksha.trinetraedu-ai.com" },
    ...services.map(s => ({
      name: s.name,
      subdomain_url: s.subdomain_url
    }))
  ];

  // Repeat list items to make sure it fills the screen even on very large displays
  const repeatedItems = Array(6).fill(listItems).flat();

  const content = (
    <div className="flex items-center w-max pr-[20px] animate-marquee group-hover:[animation-play-state:paused]">
      {repeatedItems.map((item, idx) => {
        const hasExternalLink = item.subdomain_url && item.subdomain_url.trim() !== "";
        const href = formatLink(item.subdomain_url);
        
        return (
          <Fragment key={idx}>
            <a
              href={href}
              target={hasExternalLink ? "_blank" : undefined}
              rel={hasExternalLink ? "noopener noreferrer" : undefined}
              className="font-sans text-[16px] font-medium tracking-[0.05em] text-[#B8B0D1] hover:text-[#F59E0B] transition-all duration-300 hover:scale-105 whitespace-nowrap"
            >
              {item.name}
            </a>
            <span className="text-[#8B5CF6] text-[12px] mx-[32px] shrink-0 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
              ◆
            </span>
          </Fragment>
        );
      })}
    </div>
  );

  return (
    <section className="w-full bg-[#0C0118] border-y border-[rgba(139,92,246,0.08)] py-[26px] overflow-hidden flex relative group">
      <div 
        className="flex w-full"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        }}
      >
        <div className="flex w-max">
          {/* We render the row twice side-by-side to allow seamless infinite scrolling */}
          {content}
          {content}
        </div>
      </div>
    </section>
  );
}
