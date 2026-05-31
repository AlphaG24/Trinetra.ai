"use client";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";

import useReactions from "@/hooks/useReactions";

const REACTIONS = [
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
  { type: "fire", emoji: "🔥", label: "Fire" },
];

export default function ReactionBar({ postId }) {
  const { reactions, userReaction, toggleReaction, totalReactions } = useReactions(postId);
  const [expanded, setExpanded] = useState(false);

  const topThree = useMemo(() => {
    const rows = REACTIONS.map((r) => ({ ...r, count: reactions?.[r.type] || 0 }));
    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, 3);
  }, [reactions]);

  const visible = expanded ? REACTIONS : topThree;

  return (
    <div
      className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-trinetra-text">How did this make you feel?</div>
        <div className="text-xs font-medium text-trinetra-muted">{totalReactions} reactions</div>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        {visible.map((r) => {
          const selected = userReaction === r.type;
          const count = reactions?.[r.type] || 0;
          return (
            <button
              key={r.type}
              type="button"
              onClick={() => toggleReaction(r.type)}
              className={[
                "flex flex-col items-center justify-center rounded-xl border px-3 py-2 transition-colors",
                selected
                  ? "border-violet-500/30 bg-violet-500/15"
                  : "border-border-subtle bg-trinetra-bg-tertiary hover:border-border-medium hover:bg-trinetra-bg-primary",
              ].join(" ")}
              title={r.label}
            >
              <motion.div
                animate={selected ? { scale: 1.3, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="text-2xl"
              >
                {r.emoji}
              </motion.div>
              <div className="mt-1 text-xs font-semibold text-trinetra-muted">{count}</div>
              {expanded ? <div className="mt-1 text-[11px] font-medium text-trinetra-subtle">{r.label}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

