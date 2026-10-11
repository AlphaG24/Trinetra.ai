"use client";

import { LogOut, ExternalLink } from "lucide-react";
import AdminBrand from "./AdminBrand";

export default function AdminNavbar({ currentView, onLogout, autoSaveStatus }) {
  const getBreadcrumb = () => {
    switch (currentView) {
      case "dashboard": return "Dashboard";
      case "create": return "New Post";
      case "edit": return "Edit Post";
      default: return "Dashboard";
    }
  };

  return (
    <nav className="sticky top-0 z-50 flex h-28 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]/95 px-12 backdrop-blur-2xl">
      <div className="flex items-center gap-6">
        <div className="flex select-none items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/5 p-3 shadow-sm border border-[var(--border)]">
            <img 
              src="/trident.png"
              alt="Trinetra AI"
              className="h-full w-full object-contain dynamic-logo"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold tracking-tight text-[var(--heading)] font-playfair">
              Trinetra
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-playfair">
              Admin Console
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        {(currentView === "create" || currentView === "edit") && autoSaveStatus && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <div className={`h-1.5 w-1.5 rounded-full ${autoSaveStatus.includes('Saving') ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
            {autoSaveStatus}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <a 
          href="/blog" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-gray-300 outline-none transition-colors hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
        >
          <ExternalLink size={14} />
          View Blog
        </a>
        <div className="h-4 w-px bg-white/10" />
        <button 
          onClick={() => {
            if (window.confirm("Are you sure you want to logout?")) {
              onLogout();
            }
          }}
          className="flex items-center gap-2 text-[13px] font-medium text-gray-500 outline-none transition-colors hover:text-red-400"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </nav>
  );
}
