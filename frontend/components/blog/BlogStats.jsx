"use client";

import { useEffect, useMemo, useState } from "react";

import { animate, motion, useMotionValue } from "framer-motion";
import { Calendar, Clock, Flame, Eye, Heart, MessageCircle } from "lucide-react";

import { createBrowserClient } from "@/lib/supabase/client";

import useLikes from "@/hooks/useLikes";
import useComments from "@/hooks/useComments";
import { formatDate } from "@/utils/formatDate";

const supabase = createBrowserClient();

function StatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="inline-flex items-center gap-2 text-sm text-trinetra-muted">
        <Icon size={16} />
        {label}
      </div>
      <div className="text-sm font-semibold text-trinetra-text">{value}</div>
    </div>
  );
}

function AnimatedNumber({ value }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, Number(value || 0), {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [mv, value]);

  return <motion.span>{display}</motion.span>;
}

export default function BlogStats({ post }) {
  const postId = post?.id;
  const { likeCount } = useLikes(postId);
  const { commentCount } = useComments(postId);

  const [views24h, setViews24h] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!postId) return;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("blog_views")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId)
        .gte("viewed_at", since);

      if (error) return;
      if (!cancelled) setViews24h(count || 0);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const trending = views24h > 100;
  const views = post?.views ?? 0;
  const readTime = post?.read_time || 1;

  const published = useMemo(() => formatDate(post?.created_at), [post?.created_at]);

  return (
    <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-trinetra-text">Stats</div>
        {trending ? (
          <div className="inline-flex items-center gap-1 rounded-full border border-gold-500/25 bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300">
            <Flame size={14} />
            Trending
          </div>
        ) : null}
      </div>

      <div className="mt-3 divide-y divide-border-subtle">
        <StatRow icon={Eye} label="Views" value={<AnimatedNumber value={views} />} />
        <StatRow icon={Heart} label="Likes" value={<AnimatedNumber value={likeCount} />} />
        <StatRow icon={MessageCircle} label="Comments" value={<AnimatedNumber value={commentCount} />} />
        <StatRow icon={Clock} label="Read time" value={`${readTime} min`} />
        <StatRow icon={Calendar} label="Published" value={published} />
      </div>
    </div>
  );
}

