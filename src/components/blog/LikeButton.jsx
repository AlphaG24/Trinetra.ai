"use client";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import useLikes from "@/hooks/useLikes";

function makeParticles(count = 5) {
  const now = Date.now();
  return Array.from({ length: count }).map((_, idx) => ({
    id: `${now}_${idx}`,
    left: `${20 + Math.random() * 60}%`,
    size: 14 + Math.round(Math.random() * 10),
  }));
}

export default function LikeButton({ postId }) {
  const { likeCount, isLiked, toggleLike, loading } = useLikes(postId);
  const [particles, setParticles] = useState([]);

  const label = useMemo(() => (isLiked ? "Liked!" : "Like this article"), [isLiked]);

  const onClick = async () => {
    const wasLiked = isLiked;
    await toggleLike();

    if (!wasLiked) {
      setParticles(makeParticles(5));
      toast.success("Thanks for the like! ❤️");
      window.setTimeout(() => setParticles([]), 1100);
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-[260px] flex-col items-center justify-center py-8">
      <div className="relative">
        <motion.button
          type="button"
          onClick={onClick}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          className={[
            "relative grid h-20 w-20 place-items-center rounded-2xl border transition-colors",
            isLiked
              ? "border-red-500/30 bg-red-500/15 text-red-300"
              : "border-border-subtle bg-trinetra-bg-secondary text-trinetra-muted hover:border-border-medium hover:bg-trinetra-bg-tertiary",
            loading ? "cursor-not-allowed opacity-70" : "",
          ].join(" ")}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Heart size={34} className={isLiked ? "fill-current" : ""} />
          )}
        </motion.button>

        {particles.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-red-400 fly-heart"
            style={{ left: p.left, fontSize: `${p.size}px` }}
          >
            ❤️
          </div>
        ))}
      </div>

      <div className="mt-3 text-center">
        <div className="text-sm font-semibold text-trinetra-text">{label}</div>
        <div className="mt-1 text-sm text-trinetra-muted">{likeCount} like{likeCount === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}

