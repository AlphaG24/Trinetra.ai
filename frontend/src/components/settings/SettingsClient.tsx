'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ShieldCheck, Bell, Sparkles } from 'lucide-react'

// Tabs
import { ProfileTab } from '@/src/components/settings/ProfileTab'
import { SecurityTab } from '@/src/components/settings/SecurityTab'
import { KYCTab } from '@/src/components/settings/KYCTab'
import { NotificationsTab } from '@/src/components/settings/NotificationsTab'
import { IntegrationsTab } from '@/src/components/settings/IntegrationsTab'

type TabType = 'profile' | 'security' | 'kyc' | 'notifications' | 'integrations'

interface SettingsClientProps {
  initialTab?: string
}

export function SettingsClient({ initialTab = 'profile' }: SettingsClientProps) {
  const validInitialTab: TabType = ['profile', 'security', 'kyc', 'notifications', 'integrations'].includes(initialTab)
    ? (initialTab as TabType)
    : 'profile'

  const [activeTab, setActiveTab] = useState<TabType>(validInitialTab)

  useEffect(() => {
    if (initialTab && ['profile', 'security', 'kyc', 'notifications', 'integrations'].includes(initialTab)) {
      setActiveTab(initialTab as TabType)
    }
  }, [initialTab])

  const tabs = [
    { id: 'profile' as const, label: 'Profile Settings', icon: User },
    { id: 'security' as const, label: 'Security & Access', icon: ShieldCheck },
    { id: 'kyc' as const, label: 'KYC & Compliance', icon: ShieldCheck },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'integrations' as const, label: 'Integrations', icon: Sparkles },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />
      case 'security':
        return <SecurityTab />
      case 'kyc':
        return <KYCTab />
      case 'notifications':
        return <NotificationsTab />
      case 'integrations':
        return <IntegrationsTab />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold font-display text-[var(--heading)] tracking-tight leading-tight">
          System Settings
        </h1>
        <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed">
          Configure profile details, security access, integrations, and preferences.
        </p>
      </div>

      {/* Sticky Tab Bar */}
      <div className="sticky top-0 bg-[var(--background)] z-30 pt-2 pb-1 border-b border-[var(--border)]">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                suppressHydrationWarning
                className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium font-montserrat transition-all cursor-pointer select-none rounded-t-xl hover:bg-[var(--hover-bg)]/25 ${
                  isActive ? 'text-[var(--heading)]' : 'text-[var(--muted)] hover:text-[var(--heading)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--heading)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area with Animation */}
      <div className="pt-4 min-h-[400px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SettingsClient
