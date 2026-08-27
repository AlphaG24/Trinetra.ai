"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const supabase = createBrowserClient();

function safeLower(value) {
  return String(value || "").toLowerCase();
}

export default function AdminDashboard({ onCreateNew, onEdit }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | posts | comments | likes | reactions | subscribers

  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [subscribers, setSubscribers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    posts: 0,
    views: 0,
    likes: 0,
    comments: 0,
    pendingComments: 0,
    reactions: 0,
    subscribers: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [postFilter, setPostFilter] = useState("All"); // All | Published | Drafts | Featured
  const [commentFilter, setCommentFilter] = useState("all"); // all | approved | pending
  const [commentPostFilter, setCommentPostFilter] = useState("all"); // all | post_id
  const [likePostFilter, setLikePostFilter] = useState("all");
  const [reactionPostFilter, setReactionPostFilter] = useState("all");

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, post: null });
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const refreshTimerRef = useRef(null);

  const postsById = useMemo(() => {
    const map = new Map();
    for (const p of posts) map.set(p.id, p);
    return map;
  }, [posts]);

  const likeCountByPost = useMemo(() => {
    const map = new Map();
    for (const row of likes) map.set(row.post_id, (map.get(row.post_id) || 0) + 1);
    return map;
  }, [likes]);

  const commentCountByPost = useMemo(() => {
    const map = new Map();
    for (const row of comments) map.set(row.post_id, (map.get(row.post_id) || 0) + 1);
    return map;
  }, [comments]);

  const reactionsByType = useMemo(() => {
    const grouped = { love: 0, haha: 0, wow: 0, sad: 0, angry: 0, fire: 0 };
    for (const row of reactions) {
      if (row?.reaction_type && Object.prototype.hasOwnProperty.call(grouped, row.reaction_type)) {
        grouped[row.reaction_type] += 1;
      }
    }
    return grouped;
  }, [reactions]);

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: Eye, count: 0 },
      { key: "posts", label: "Posts", icon: FileText, count: stats.posts },
      { key: "comments", label: "Comments", icon: MessageCircle, count: stats.comments },
      { key: "likes", label: "Likes", icon: Heart, count: stats.likes },
      { key: "reactions", label: "Reactions", icon: Sparkles, count: stats.reactions },
      { key: "subscribers", label: "Subscribers", icon: Users, count: stats.subscribers },
    ],
    [stats.comments, stats.likes, stats.posts, stats.reactions, stats.subscribers]
  );

  useEffect(() => {
    void fetchDashboardData();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => void fetchDashboardData({ silent: true }), 350);
    };

    const uniqueChannelName = `admin-blog-dashboard-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_comments" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_likes" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_reactions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscribers" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

      const [
        postsRes,
        commentsRes,
        likesRes,
        reactionsRes,
        subscribersRes,
        likesCountRes,
        commentsCountRes,
        pendingCountRes,
        reactionsCountRes,
        subscribersCountRes,
      ] = await Promise.all([
        supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
        supabase
          .from("blog_comments")
          .select("id,post_id,parent_id,user_name,user_email,content,is_approved,likes,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("blog_likes")
          .select("id,post_id,user_identifier,created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("blog_reactions")
          .select("id,post_id,user_identifier,reaction_type,created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("subscribers").select("id,email,created_at").order("created_at", { ascending: false }).limit(2000),
        supabase.from("blog_likes").select("id", { count: "exact", head: true }),
        supabase.from("blog_comments").select("id", { count: "exact", head: true }),
        supabase.from("blog_comments").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("blog_reactions").select("id", { count: "exact", head: true }),
        supabase.from("subscribers").select("id", { count: "exact", head: true }),
      ]);

      if (postsRes.error) throw postsRes.error;
      if (commentsRes.error) throw commentsRes.error;
      if (likesRes.error) throw likesRes.error;
      if (reactionsRes.error) throw reactionsRes.error;
      if (subscribersRes.error) throw subscribersRes.error;

      const postsData = postsRes.data || [];
      const commentsData = commentsRes.data || [];
      const likesData = likesRes.data || [];
      const reactionsData = reactionsRes.data || [];
      const subscribersData = subscribersRes.data || [];

      setPosts(postsData);
      setComments(commentsData);
      setLikes(likesData);
      setReactions(reactionsData);
      setSubscribers(subscribersData);

      const totalViews = postsData.reduce((sum, p) => sum + (p.views || 0), 0);
      setStats({
        posts: postsData.length,
        views: totalViews,
        likes: likesCountRes.count ?? likesData.length,
        comments: commentsCountRes.count ?? commentsData.length,
        pendingComments: pendingCountRes.count ?? commentsData.filter((c) => !c.is_approved).length,
        reactions: reactionsCountRes.count ?? reactionsData.length,
        subscribers: subscribersCountRes.count ?? subscribersData.length,
      });
    } catch (err) {
      toast.error("Failed to load dashboard: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (post) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: newStatus } : p)));
      const { error } = await supabase.from("blog_posts").update({ status: newStatus }).eq("id", post.id);
      if (error) throw error;
      toast.success(`Post is now ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const toggleFeatured = async (post) => {
    const nextFeatured = !post.featured;
    try {
      if (nextFeatured) {
        await supabase.from("blog_posts").update({ featured: false }).eq("featured", true);
      }

      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, featured: nextFeatured } : p)));
      const { error } = await supabase.from("blog_posts").update({ featured: nextFeatured }).eq("id", post.id);
      if (error) throw error;
      toast.success(nextFeatured ? "Featured post set" : "Post unfeatured");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to update featured: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const toggleCommentApproval = async (comment) => {
    const nextApproved = !comment.is_approved;
    try {
      setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, is_approved: nextApproved } : c)));
      const { error } = await supabase.from("blog_comments").update({ is_approved: nextApproved }).eq("id", comment.id);
      if (error) throw error;
      toast.success(nextApproved ? "Comment approved" : "Comment hidden");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to update comment: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const deleteComment = async (comment) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    try {
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      const { error } = await supabase.from("blog_comments").delete().eq("id", comment.id);
      if (error) throw error;
      toast.success("Comment deleted");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to delete comment: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const deleteLike = async (like) => {
    if (!window.confirm("Remove this like?")) return;
    try {
      setLikes((prev) => prev.filter((l) => l.id !== like.id));
      const { error } = await supabase.from("blog_likes").delete().eq("id", like.id);
      if (error) throw error;
      toast.success("Like removed");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to remove like: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const deleteReaction = async (reaction) => {
    if (!window.confirm("Remove this reaction?")) return;
    try {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      const { error } = await supabase.from("blog_reactions").delete().eq("id", reaction.id);
      if (error) throw error;
      toast.success("Reaction removed");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to remove reaction: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const deleteSubscriber = async (sub) => {
    if (!window.confirm("Remove this subscriber?")) return;
    try {
      setSubscribers((prev) => prev.filter((s) => s.id !== sub.id));
      const { error } = await supabase.from("subscribers").delete().eq("id", sub.id);
      if (error) throw error;
      toast.success("Subscriber removed");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to remove subscriber: " + (err?.message || "Unknown error"));
      void fetchDashboardData({ silent: true });
    }
  };

  const handleDeletePost = async () => {
    if (!deleteModal.post || deleteConfirmText !== deleteModal.post.title) return;
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", deleteModal.post.id);
      if (error) throw error;
      toast.success("Post deleted");
      setDeleteModal({ isOpen: false, post: null });
      setDeleteConfirmText("");
      void fetchDashboardData({ silent: true });
    } catch (err) {
      toast.error("Failed to delete post: " + (err?.message || "Unknown error"));
    }
  };

  const filteredPosts = posts.filter((post) => {
    const q = safeLower(searchTerm);
    const matchesSearch = !q || safeLower(post.title).includes(q) || safeLower(post.excerpt).includes(q);
    if (!matchesSearch) return false;
    if (postFilter === "Published") return post.status === "published";
    if (postFilter === "Drafts") return post.status === "draft";
    if (postFilter === "Featured") return post.featured === true;
    return true;
  });

  const filteredComments = comments.filter((comment) => {
    const q = safeLower(searchTerm);
    const matchesSearch =
      !q ||
      safeLower(comment.user_name).includes(q) ||
      safeLower(comment.user_email).includes(q) ||
      safeLower(comment.content).includes(q);

    if (!matchesSearch) return false;
    if (commentFilter === "approved") return comment.is_approved === true;
    if (commentFilter === "pending") return comment.is_approved === false;
    if (commentPostFilter !== "all") return String(comment.post_id) === String(commentPostFilter);
    return true;
  });

  const filteredLikes = likes.filter((like) => {
    const q = safeLower(searchTerm);
    const postTitle = safeLower(postsById.get(like.post_id)?.title);
    const matchesSearch = !q || postTitle.includes(q) || safeLower(like.user_identifier).includes(q);
    if (!matchesSearch) return false;
    if (likePostFilter !== "all") return String(like.post_id) === String(likePostFilter);
    return true;
  });

  const filteredReactions = reactions.filter((reaction) => {
    const q = safeLower(searchTerm);
    const postTitle = safeLower(postsById.get(reaction.post_id)?.title);
    const matchesSearch =
      !q ||
      postTitle.includes(q) ||
      safeLower(reaction.user_identifier).includes(q) ||
      safeLower(reaction.reaction_type).includes(q);
    if (!matchesSearch) return false;
    if (reactionPostFilter !== "all") return String(reaction.post_id) === String(reactionPostFilter);
    return true;
  });

  const filteredSubscribers = subscribers.filter((sub) => {
    const q = safeLower(searchTerm);
    return !q || safeLower(sub.email).includes(q);
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] p-8 md:p-16 text-white text-lg">
      <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter">Admin Dashboard</h2>
          <p className="mt-4 text-xl text-gray-500">Premium high-resolution control center for Trinetra Blog.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
          >
            <Plus size={16} />
            New Post
          </button>
          <a
            href="/blog"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-[13px] font-semibold text-gray-200 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white transition-colors"
          >
            View Blog
          </a>
        </div>
      </div>

      <motion.div
        className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {[
          { label: "Articles", value: stats.posts, icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10", glow: "stat-glow-purple" },
          { label: "Total Reach", value: stats.views.toLocaleString(), icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/10", glow: "stat-glow-blue" },
          { label: "Community", value: stats.likes + stats.comments, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "stat-glow-green" },
          { label: "Subscribers", value: stats.subscribers, icon: CheckCircle2, color: "text-amber-400", bg: "bg-amber-500/10", glow: "stat-glow-pink" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className={`admin-card flex items-center gap-5 p-6 ${stat.glow}`}
          >
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} border border-white/5`}>
              <stat.icon size={26} className={stat.color} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500">{stat.label}</span>
              <span className="text-3xl font-black text-white">{stat.value}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-white/10 bg-[#0c0118]/60 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-6 text-[15px] text-white outline-none focus:border-violet-500 transition-all focus:bg-white/[0.08]"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => {
              const Icon = t.icon;
              const selected = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={[
                    "relative flex h-14 items-center gap-3 rounded-2xl border px-6 text-[15px] font-bold transition-all",
                    selected 
                      ? "bg-violet-600 border-violet-500 text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)]" 
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  <span className="capitalize">{t.label}</span>
                  {t.count ? (
                    <span className={`ml-1 rounded-full px-2.5 py-1 text-[11px] font-black ${selected ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}>
                      {t.count}
                    </span>
                  ) : null}
                  {selected && (
                    <motion.div
                      layoutId="activeAdminTab"
                      className="absolute inset-0 rounded-2xl border-2 border-white/20"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "posts" ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {["All", "Published", "Drafts", "Featured"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPostFilter(f)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors border",
                  postFilter === f ? "bg-violet-500/20 text-violet-200 border-violet-500/30" : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/30 hover:text-white",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === "comments" ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              {[
                { key: "all", label: "All" },
                { key: "approved", label: "Approved" },
                { key: "pending", label: `Pending (${stats.pendingComments})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setCommentFilter(f.key)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors border",
                    commentFilter === f.key ? "bg-violet-500/20 text-violet-200 border-violet-500/30" : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/30 hover:text-white",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={commentPostFilter}
              onChange={(e) => setCommentPostFilter(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-gray-200 outline-none focus:border-violet-500"
            >
              <option value="all">All posts</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeTab === "likes" ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <select
              value={likePostFilter}
              onChange={(e) => setLikePostFilter(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-gray-200 outline-none focus:border-violet-500"
            >
              <option value="all">All posts</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-white">{filteredLikes.length}</span> likes
            </div>
          </div>
        ) : null}

        {activeTab === "reactions" ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <select
              value={reactionPostFilter}
              onChange={(e) => setReactionPostFilter(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-gray-200 outline-none focus:border-violet-500"
            >
              <option value="all">All posts</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-white">{filteredReactions.length}</span> reactions
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">Loading dashboard...</div>
      ) : activeTab === "overview" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold text-white">Top posts (views)</div>
            <div className="mt-4 space-y-3">
              {posts
                .slice()
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-200">{p.title}</div>
                      <div className="mt-1 text-[12px] text-gray-500">
                        Likes: {likeCountByPost.get(p.id) || 0} | Comments: {commentCountByPost.get(p.id) || 0}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-gray-200">{p.views || 0} views</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold text-white">Reaction mix</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {Object.entries(reactionsByType).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="capitalize text-gray-300">{k}</span>
                  <span className="font-semibold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "posts" ? (
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-gray-400">No posts match your filters.</div>
          ) : (
            filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(0.2, idx * 0.03) }}
                className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-violet-500/20 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-1 items-start gap-4">
                  <div className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-black/40 md:block">
                    {post.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.cover_image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-violet-600/20 to-cyan-500/10" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={["rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider border", post.status === "published" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"].join(" ")}>
                        {post.status}
                      </span>
                      {post.featured ? (
                        <span className="rounded border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">Featured</span>
                      ) : null}
                    </div>

                    <h3 className="text-lg font-bold text-white leading-tight">{post.title}</h3>
                    {post.excerpt ? <p className="mt-1 text-sm text-gray-500 line-clamp-2">{post.excerpt}</p> : null}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
                      <span>{post.category || "Uncategorized"}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span>{post.read_time || 1} min read</span>
                      <span className="flex items-center gap-1"><Eye size={12} /> {post.views || 0}</span>
                      <span className="flex items-center gap-1"><Heart size={12} /> {likeCountByPost.get(post.id) || 0}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {commentCountByPost.get(post.id) || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <button type="button" onClick={() => onEdit(post)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white" title="Edit">
                    <Pencil size={15} />
                  </button>

                  <button type="button" onClick={() => toggleFeatured(post)} className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-[13px] font-medium text-gray-300 transition-colors hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white">
                    {post.featured ? "Unfeature" : "Feature"}
                  </button>

                  <button type="button" onClick={() => toggleStatus(post)} className={["flex h-9 items-center justify-center rounded-lg border px-3 text-[13px] font-medium transition-colors", post.status === "published" ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"].join(" ")}>
                    {post.status === "published" ? "Move to Draft" : "Publish"}
                  </button>

                  <button type="button" onClick={() => setDeleteModal({ isOpen: true, post })} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/10 bg-red-500/5 text-red-500/70 transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : activeTab === "comments" ? (
        <div className="space-y-3">
          {filteredComments.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-gray-400">No comments match your filters.</div>
          ) : (
            filteredComments.map((comment) => {
              const post = postsById.get(comment.post_id);
              const approved = Boolean(comment.is_approved);

              return (
                <div key={comment.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-violet-500/20">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-200">{comment.user_name || "Anonymous"}</span>
                        {comment.user_email ? <span className="text-[12px] text-gray-500">{comment.user_email}</span> : null}
                        <span className={["ml-auto md:ml-0 rounded-full border px-3 py-1 text-[12px] font-semibold", approved ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"].join(" ")}>
                          {approved ? "Approved" : "Pending"}
                        </span>
                        {comment.parent_id ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-gray-300">Reply</span> : null}
                      </div>

                      <div className="mt-2 text-[12px] text-gray-500">
                        {post?.title ? <span className="text-violet-300">On: {post.title}</span> : <span>Post: {comment.post_id}</span>}
                        <span className="mx-2 text-white/10">|</span>
                        <span>{new Date(comment.created_at).toLocaleString()}</span>
                        <span className="mx-2 text-white/10">|</span>
                        <span className="inline-flex items-center gap-1"><Heart size={12} /> {comment.likes || 0}</span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-200/90">{comment.content}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                      <button type="button" onClick={() => toggleCommentApproval(comment)} className={["inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-colors", approved ? "border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"].join(" ")}>
                        {approved ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        {approved ? "Hide" : "Approve"}
                      </button>
                      <button type="button" onClick={() => deleteComment(comment)} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[13px] font-semibold text-red-200 hover:bg-red-500/20">
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === "likes" ? (
        <div className="space-y-3">
          {filteredLikes.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-gray-400">No likes match your filters.</div>
          ) : (
            filteredLikes.map((like) => {
              const post = postsById.get(like.post_id);
              const identifier = String(like.user_identifier || "");
              return (
                <div key={like.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-violet-500/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-200">{post?.title || `Post: ${like.post_id}`}</div>
                      <div className="mt-2 text-[12px] text-gray-500">
                        <span>{new Date(like.created_at).toLocaleString()}</span>
                        <span className="mx-2 text-white/10">|</span>
                        <span className="font-mono">{identifier.slice(0, 28)}{identifier.length > 28 ? "..." : ""}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => deleteLike(like)} className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[13px] font-semibold text-red-200 hover:bg-red-500/20">
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === "reactions" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {Object.entries(reactionsByType).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                <div className="text-[12px] uppercase tracking-wider text-gray-500">{k}</div>
                <div className="mt-2 text-xl font-bold text-white">{v}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {filteredReactions.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-gray-400">No reactions match your filters.</div>
            ) : (
              filteredReactions.map((reaction) => {
                const post = postsById.get(reaction.post_id);
                const identifier = String(reaction.user_identifier || "");
                return (
                  <div key={reaction.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-violet-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-200">{post?.title || `Post: ${reaction.post_id}`}</div>
                        <div className="mt-2 text-[12px] text-gray-500">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">{reaction.reaction_type}</span>
                          <span className="mx-2 text-white/10">|</span>
                          <span>{new Date(reaction.created_at).toLocaleString()}</span>
                          <span className="mx-2 text-white/10">|</span>
                          <span className="font-mono">{identifier.slice(0, 28)}{identifier.length > 28 ? "..." : ""}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => deleteReaction(reaction)} className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[13px] font-semibold text-red-200 hover:bg-red-500/20">
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : activeTab === "subscribers" ? (
        <div className="space-y-3">
          {filteredSubscribers.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-gray-400">No subscribers match your filters.</div>
          ) : (
            filteredSubscribers.map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-violet-500/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-200">{sub.email}</div>
                    <div className="mt-2 text-[12px] text-gray-500">Subscribed: {new Date(sub.created_at).toLocaleString()}</div>
                  </div>
                  <button type="button" onClick={() => deleteSubscriber(sub)} className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[13px] font-semibold text-red-200 hover:bg-red-500/20">
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {deleteModal.isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0a0008] p-6 shadow-2xl"
          >
            <div className="mb-4 flex justify-center text-red-500">
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-white">Delete Post?</h3>
            <p className="mb-6 text-center text-sm leading-relaxed text-gray-400">
              This action cannot be undone. The post and all its likes, comments, and reactions will be permanently deleted.
            </p>

            <div className="mb-6">
              <label className="mb-2 block text-[13px] text-gray-400">
                Type <span className="font-semibold text-white">{deleteModal.post?.title}</span> to confirm:
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-red-500"
                placeholder="Post title"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModal({ isOpen: false, post: null });
                  setDeleteConfirmText("");
                }}
                className="h-11 flex-1 rounded-xl bg-white/5 text-sm font-medium text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={deleteConfirmText !== deleteModal.post?.title}
                className="h-11 flex-1 rounded-xl bg-gradient-to-br from-red-600 to-red-500 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

