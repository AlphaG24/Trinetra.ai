"use client";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";
import {
  FacebookShareButton,
  LinkedinShareButton,
  TelegramShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "react-share";
import { Copy, Facebook, Linkedin, Send, Share2, Twitter } from "lucide-react";
import toast from "react-hot-toast";

function SharePill({ as: As, children, className, ...props }) {
  const Comp = As || "button";
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Comp
        {...props}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          className,
        ].join(" ")}
      >
        {children}
      </Comp>
    </motion.div>
  );
}

export default function ShareButtons({ post, orientation = "horizontal" }) {
  const [url] = useState(() => (typeof window !== "undefined" ? window.location.href : ""));
  const [copied, setCopied] = useState(false);

  const title = useMemo(() => post?.title || "Trinetra AI Blog", [post?.title]);
  const layout = orientation === "vertical" ? "flex-col items-stretch" : "flex-row flex-wrap items-center";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const onNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, url });
    } catch {
      // ignore user cancellation
    }
  };

  if (!url) return null;

  return (
    <div className={`flex gap-2 ${layout}`}>
      <SharePill
        as={TwitterShareButton}
        url={url}
        title={title}
        className="border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text hover:bg-[#111827] hover:text-white"
      >
        <Twitter size={16} />
        X
      </SharePill>
      <SharePill
        as={LinkedinShareButton}
        url={url}
        title={title}
        className="border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text hover:bg-[#0A66C2] hover:text-white"
      >
        <Linkedin size={16} />
        LinkedIn
      </SharePill>
      <SharePill
        as={FacebookShareButton}
        url={url}
        quote={title}
        className="border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text hover:bg-[#1877F2] hover:text-white"
      >
        <Facebook size={16} />
        Facebook
      </SharePill>
      <SharePill
        as={WhatsappShareButton}
        url={url}
        title={title}
        className="border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text hover:bg-[#25D366] hover:text-black"
      >
        <Send size={16} />
        WhatsApp
      </SharePill>
      <SharePill
        as={TelegramShareButton}
        url={url}
        title={title}
        className="border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text hover:bg-[#229ED9] hover:text-white"
      >
        <Send size={16} />
        Telegram
      </SharePill>
      <SharePill
        type="button"
        onClick={onCopy}
        className={[
          "border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text",
          copied ? "bg-emerald-500/15 text-emerald-200" : "hover:bg-emerald-500/10 hover:text-emerald-200",
        ].join(" ")}
      >
        <Copy size={16} />
        {copied ? "Copied!" : "Copy Link"}
      </SharePill>
      {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
        <SharePill
          type="button"
          onClick={onNativeShare}
          className="border border-border-subtle bg-trinetra-bg-secondary text-trinetra-text hover:bg-violet-500/20 hover:text-violet-100"
        >
          <Share2 size={16} />
          Share
        </SharePill>
      ) : null}
    </div>
  );
}
