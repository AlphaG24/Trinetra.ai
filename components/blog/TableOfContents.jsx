"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronDown, List } from "lucide-react";

import { extractHeadings } from "@/utils/blogHelpers";

export default function TableOfContents({ content }) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState(headings[0]?.id || "");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const observerRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const height = doc.scrollHeight - window.innerHeight;
      const pct = height > 0 ? (scrollTop / height) * 100 : 0;
      setProgress(Math.max(0, Math.min(100, pct)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!headings.length) return undefined;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top || 0) - (b.boundingClientRect.top || 0));
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { root: null, rootMargin: "-20% 0px -70% 0px", threshold: [0.05, 0.2, 0.6] }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) io.observe(el);
    }

    observerRef.current = io;
    return () => {
      io.disconnect();
    };
  }, [headings]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!headings.length) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <List size={18} className="text-trinetra-muted" />
          <div className="text-sm font-semibold text-trinetra-text">Table of Contents</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-trinetra-muted">
          <span>{Math.round(progress)}% complete</span>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div className={`${open ? "mt-4" : "mt-4 hidden"} md:block`}>
        <ul className="space-y-2">
          {headings.map((h) => {
            const active = h.id === activeId;
            return (
              <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                <button
                  type="button"
                  onClick={() => scrollTo(h.id)}
                  className={[
                    "w-full rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-l-2 border-violet-400 bg-violet-500/10 text-violet-200"
                      : "text-trinetra-muted hover:bg-trinetra-bg-tertiary hover:text-trinetra-text",
                  ].join(" ")}
                >
                  {h.text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

