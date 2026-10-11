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
    ...services.map((s) => ({
      name: s.name,
      subdomain_url: s.subdomain_url,
    })),
  ];

  // Repeat list items to comfortably fill width on large monitors
  const repeatedItems = Array(4).fill(listItems).flat();

  return (
    <section className="w-full pt-4 sm:pt-6 md:pt-8 pb-12 sm:pb-16 bg-transparent overflow-hidden flex flex-col items-center relative group select-none z-10">
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
            animation: "marqueeContinuous 130s linear infinite",
            willChange: "transform",
          }}
        >
          {/* Track 1: First continuous set */}
          <div className="flex shrink-0 items-center">
            {repeatedItems.map((item, idx) => {
              const hasExternalLink = item.subdomain_url && item.subdomain_url.trim() !== "";
              const href = formatLink(item.subdomain_url);

              return (
                <a
                  key={`track-1-${idx}`}
                  href={href}
                  target={hasExternalLink ? "_blank" : undefined}
                  rel={hasExternalLink ? "noopener noreferrer" : undefined}
                  className="shrink-0 whitespace-nowrap mx-8 sm:mx-12 font-[family-name:var(--font-playfair),Georgia,serif] font-bold text-[15px] sm:text-[16px] md:text-[17px] tracking-[0.12em] uppercase text-[#111827] hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
                >
                  {item.name}
                </a>
              );
            })}
          </div>

          {/* Track 2: Identical sibling set ensuring seamless infinite loop with zero overlap */}
          <div className="flex shrink-0 items-center" aria-hidden="true">
            {repeatedItems.map((item, idx) => {
              const hasExternalLink = item.subdomain_url && item.subdomain_url.trim() !== "";
              const href = formatLink(item.subdomain_url);

              return (
                <a
                  key={`track-2-${idx}`}
                  href={href}
                  target={hasExternalLink ? "_blank" : undefined}
                  rel={hasExternalLink ? "noopener noreferrer" : undefined}
                  className="shrink-0 whitespace-nowrap mx-8 sm:mx-12 font-[family-name:var(--font-playfair),Georgia,serif] font-bold text-[15px] sm:text-[16px] md:text-[17px] tracking-[0.12em] uppercase text-[#111827] hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
                >
                  {item.name}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
