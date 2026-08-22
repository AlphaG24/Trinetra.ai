'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bot, AlertTriangle, RefreshCw } from 'lucide-react'
import { ToolCard } from './ToolCard'

interface MarketplaceListingClientProps {
  initialTools: any[]
  errorOccurred?: boolean
  errorMessage?: string
  searchQuery?: string
  onSearchQueryChange?: (val: string) => void
  hideHeader?: boolean
}

export function MarketplaceListingClient({
  initialTools,
  errorOccurred = false,
  errorMessage = '',
  searchQuery,
  onSearchQueryChange,
  hideHeader = false,
}: MarketplaceListingClientProps) {
  const router = useRouter()
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const query = searchQuery !== undefined ? searchQuery : localSearchQuery
  const setQuery = onSearchQueryChange !== undefined ? onSearchQueryChange : setLocalSearchQuery

  // Derive unique categories dynamically
  const categories = ['All', ...Array.from(new Set(initialTools.map((t) => t.type).filter(Boolean)))]

  // Filter tools client-side
  const filteredTools = initialTools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || tool.type === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Error State
  if (errorOccurred) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-red-500 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-[var(--heading)]">Connection Failed</h2>
          <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
            {errorMessage || 'Unable to retrieve tools from the database.'}
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  // Loading or empty state (no tools populated in database)
  if (initialTools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] shadow-sm">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-[var(--heading)]">Marketplace Coming Soon</h2>
          <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
            No tools available yet. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-left">
      {/* Header & Subtitle */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-[var(--border)]">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold font-display text-[var(--heading)] tracking-tight leading-tight">
              Marketplace
            </h1>
            <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
              AI-powered tools to grow your business
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--heading)] placeholder-[var(--muted)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 transition-all shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 border-b border-[var(--border)]">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-[var(--border)] cursor-pointer whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-[var(--primary-bg)] text-[var(--heading)]'
                : 'bg-[var(--card-bg)] text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Search Empty State */}
      {filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] shadow-sm">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-montserrat text-[var(--heading)]">No tools match your query</h3>
            <p className="text-xs text-[var(--body)] font-merriweather">
              No tools match &ldquo;{query}&rdquo;. Try a different search.
            </p>
          </div>
        </div>
      ) : (
        /* Tools Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
