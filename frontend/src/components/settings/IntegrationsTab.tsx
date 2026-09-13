'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Send, MessageCircle, MessageSquare, Mail, Webhook, Calendar, Loader2, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export function IntegrationsTab() {
  const [openSection, setOpenSection] = useState<string | null>('telegram')
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Form states
  const [telegram, setTelegram] = useState({ token: '', chatId: '', connected: false })
  const [whatsapp, setWhatsapp] = useState({ sid: '', token: '', from: '', connected: false })
  const [testWhatsappPhone, setTestWhatsappPhone] = useState('')
  const [testingWhatsapp, setTestingWhatsapp] = useState(false)
  const [email, setEmail] = useState({ smtpHost: '', smtpPort: '587', smtpUsername: '', smtpPassword: '', smtpFrom: '', connected: false })
  const [webhook, setWebhook] = useState({ url: '', secret: '', connected: false })
  const [calendar, setCalendar] = useState({ apiKey: '', eventTypeId: '', connected: false })
  const [testingCalendar, setTestingCalendar] = useState(false)

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/integrations/global')
      if (!res.ok) throw new Error('Failed to fetch global integrations')
      const data = await res.json()

      if (data.telegram) {
        setTelegram({
          token: data.telegram.bot_token || '',
          chatId: data.telegram.chat_id || '',
          connected: data.telegram.connected
        })
      }
      if (data.whatsapp) {
        setWhatsapp({
          sid: data.whatsapp.twilio_sid || '',
          token: data.whatsapp.auth_token || '',
          from: data.whatsapp.phone_number || '',
          connected: data.whatsapp.connected
        })
      }
      if (data.email) {
        setEmail({
          smtpHost: data.email.smtp_host || '',
          smtpPort: data.email.smtp_port || '587',
          smtpUsername: data.email.smtp_username || '',
          smtpPassword: data.email.smtp_password || '',
          smtpFrom: data.email.smtp_from || '',
          connected: data.email.connected
        })
      }
      if (data.crm) {
        setWebhook({
          url: data.crm.webhook_url || '',
          secret: '', // keep secret display masked/hidden
          connected: data.crm.connected
        })
      }
      if (data.calendar) {
        setCalendar({
          apiKey: data.calendar.cal_api_key || '',
          eventTypeId: data.calendar.event_type_id || '',
          connected: data.calendar.connected
        })
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load global integrations configuration.')
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  const handleSave = async (type: string) => {
    let configPayload: any = {}

    if (type === 'telegram') {
      if (!telegram.token || !telegram.chatId) {
        toast.error('Please enter Bot Token and Chat ID')
        return
      }
      configPayload = { bot_token: telegram.token, chat_id: telegram.chatId }
    } else if (type === 'whatsapp') {
      if (!whatsapp.sid || !whatsapp.token || !whatsapp.from) {
        toast.error('Please enter Twilio SID, Auth Token, and From number')
        return
      }
      configPayload = { twilio_sid: whatsapp.sid, auth_token: whatsapp.token, phone_number: whatsapp.from }
    } else if (type === 'email') {
      if (!email.smtpHost || !email.smtpUsername || !email.smtpPassword || !email.smtpFrom) {
        toast.error('Please fill in SMTP Host, Username, Password, and From email')
        return
      }
      configPayload = {
        smtp_host: email.smtpHost,
        smtp_port: email.smtpPort,
        smtp_username: email.smtpUsername,
        smtp_password: email.smtpPassword,
        smtp_from: email.smtpFrom
      }
    } else if (type === 'crm') {
      if (!webhook.url) {
        toast.error('Please enter Webhook URL')
        return
      }
      configPayload = { webhook_url: webhook.url }
    } else if (type === 'calendar') {
      if (!calendar.apiKey || !calendar.eventTypeId) {
        toast.error('Please enter Cal.com API key and event type ID')
        return
      }
      configPayload = { cal_api_key: calendar.apiKey, event_type_id: calendar.eventTypeId }
    }

    try {
      setLoadingSection(type)
      const res = await fetch('/api/integrations/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config: configPayload })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save integration config')

      toast.success(`${type.toUpperCase()} integration updated successfully!`)
      fetchConfig()
    } catch (err: any) {
      console.error(err)
      toast.error('Save failed: ' + err.message)
    } finally {
      setLoadingSection(null)
    }
  }

  const handleTestWhatsapp = async () => {
    if (!whatsapp.sid || !whatsapp.token || !whatsapp.from) {
      toast.error('Please enter Twilio SID, Auth Token, and From number first')
      return
    }
    const target = testWhatsappPhone.trim() || prompt('Enter recipient phone number to test (e.g. +919876543210):')
    if (!target) return

    try {
      setTestingWhatsapp(true)
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'whatsapp',
          config: {
            twilio_sid: whatsapp.sid,
            auth_token: whatsapp.token,
            from_number: whatsapp.from,
            target_phone: target
          }
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'Test WhatsApp message sent!')
      } else {
        toast.error(data.error || 'Test failed. Please check your Twilio credentials.')
      }
    } catch (err: any) {
      toast.error('Test failed: ' + err.message)
    } finally {
      setTestingWhatsapp(false)
    }
  }

  const handleTestCalendar = async () => {
    if (!calendar.apiKey) {
      toast.error('Please enter your Cal.com API key first')
      return
    }

    try {
      setTestingCalendar(true)
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'calendar',
          config: {
            cal_api_key: calendar.apiKey,
            event_type_id: calendar.eventTypeId
          }
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'Cal.com verified successfully!')
      } else {
        toast.error(data.error || 'Cal.com verification failed.')
      }
    } catch (err: any) {
      toast.error('Test failed: ' + err.message)
    } finally {
      setTestingCalendar(false)
    }
  }

  const handleDisconnect = async (type: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${type.toUpperCase()}?`)) {
      return
    }

    try {
      setLoadingSection(type)
      const res = await fetch('/api/integrations/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config: {} }) // send empty config to disconnect
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect')

      toast.success(`${type.toUpperCase()} integration disconnected.`)
      fetchConfig()
    } catch (err: any) {
      console.error(err)
      toast.error('Disconnect failed: ' + err.message)
    } finally {
      setLoadingSection(null)
    }
  }

  const getStatusBadge = (connected: boolean) => {
    return connected ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
        Connected
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500">
        <span className="w-1 h-1 rounded-full bg-zinc-350 dark:bg-zinc-650" />
        Not Connected
      </span>
    )
  }

  const accordionItem = (
    id: string,
    title: string,
    description: string,
    Icon: any,
    connected: boolean,
    children: React.ReactNode
  ) => {
    const isOpen = openSection === id
    return (
      <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div
          onClick={() => toggleSection(id)}
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-150 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold font-montserrat text-sm text-zinc-900 dark:text-white">{title}</h4>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-merriweather mt-0.5">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {getStatusBadge(connected)}
            <span className="text-zinc-500 dark:text-zinc-400">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
        </div>

        {/* Content Panel */}
        {isOpen && (
          <div className="p-6 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#0D0120]/40 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    )
  }

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Initializing integrations hub...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-left">
      <div className="bg-gradient-to-r from-violet-600/10 to-indigo-600/5 border border-violet-500/10 rounded-2xl p-4 flex items-start gap-3 mb-2">
        <ShieldAlert className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Global System Integrations</h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            These credentials apply organization-wide across all your agents. Connect once, and use them on any virtual assistant workspace.
          </p>
        </div>
      </div>

      {/* 1. Telegram */}
      {accordionItem(
        'telegram',
        'Telegram Messenger Alerts',
        'Push real-time call telemetry and transcripts to your channel',
        MessageCircle,
        telegram.connected,
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Bot Token
            </label>
            <input
              type="password"
              value={telegram.token}
              onChange={e => setTelegram({ ...telegram, token: e.target.value })}
              placeholder="e.g. 123456:ABC-def1234ghIkl-zyx"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Default Chat ID
            </label>
            <input
              type="text"
              value={telegram.chatId}
              onChange={e => setTelegram({ ...telegram, chatId: e.target.value })}
              placeholder="e.g. -100123456789"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="md:col-span-2 pt-2 flex justify-end gap-3">
            {telegram.connected && (
              <button
                onClick={() => handleDisconnect('telegram')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => handleSave('telegram')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border border-violet-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'telegram' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loadingSection === 'telegram' ? 'Connecting...' : 'Save & Connect'}
            </button>
          </div>
        </div>
      )}

      {/* 2. WhatsApp Twilio */}
      {accordionItem(
        'whatsapp',
        'WhatsApp Business via Twilio',
        'Deploy chat agents and auto-reminders to customer cell phones',
        MessageSquare,
        whatsapp.connected,
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Twilio Account SID
            </label>
            <input
              type="text"
              value={whatsapp.sid}
              onChange={e => setWhatsapp({ ...whatsapp, sid: e.target.value })}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Twilio Auth Token
            </label>
            <input
              type="password"
              value={whatsapp.token}
              onChange={e => setWhatsapp({ ...whatsapp, token: e.target.value })}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              From Twilio Number
            </label>
            <input
              type="text"
              value={whatsapp.from}
              onChange={e => setWhatsapp({ ...whatsapp, from: e.target.value })}
              placeholder="whatsapp:+14155238886"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="md:col-span-3 pt-2 pb-1 border-t border-zinc-100 dark:border-white/5">
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Send Test Message To Number
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={testWhatsappPhone}
                onChange={e => setTestWhatsappPhone(e.target.value)}
                placeholder="+919876543210"
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleTestWhatsapp}
                disabled={testingWhatsapp || !whatsapp.sid || !whatsapp.token}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
              >
                {testingWhatsapp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                <span>{testingWhatsapp ? 'Sending Test...' : 'Send Test WhatsApp'}</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              ℹ️ Note: If using a Twilio Sandbox number, ensure the recipient phone has sent your sandbox keyword to your Twilio number first.
            </p>
          </div>

          <div className="md:col-span-3 pt-2 flex justify-end gap-3">
            {whatsapp.connected && (
              <button
                onClick={() => handleDisconnect('whatsapp')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => handleSave('whatsapp')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border border-violet-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'whatsapp' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loadingSection === 'whatsapp' ? 'Connecting...' : 'Save & Connect'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Email SMTP */}
      {accordionItem(
        'email',
        'SMTP Email Integration',
        'Send custom email reports and lead notification alerts',
        Mail,
        email.connected,
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                SMTP Host Server
              </label>
              <input
                type="text"
                value={email.smtpHost}
                onChange={e => setEmail({ ...email, smtpHost: e.target.value })}
                placeholder="smtp.sendgrid.net or mail.mybusiness.com"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                SMTP Port
              </label>
              <input
                type="text"
                value={email.smtpPort}
                onChange={e => setEmail({ ...email, smtpPort: e.target.value })}
                placeholder="587"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                SMTP Username
              </label>
              <input
                type="text"
                value={email.smtpUsername}
                onChange={e => setEmail({ ...email, smtpUsername: e.target.value })}
                placeholder="apikey or username"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                SMTP Password
              </label>
              <input
                type="password"
                value={email.smtpPassword}
                onChange={e => setEmail({ ...email, smtpPassword: e.target.value })}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Sender Email (From)
              </label>
              <input
                type="email"
                value={email.smtpFrom}
                onChange={e => setEmail({ ...email, smtpFrom: e.target.value })}
                placeholder="no-reply@mybusiness.com"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            {email.connected && (
              <button
                onClick={() => handleDisconnect('email')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => handleSave('email')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border border-violet-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loadingSection === 'email' ? 'Connecting...' : 'Save & Connect'}
            </button>
          </div>
        </div>
      )}

      {/* 4. CRM Webhooks */}
      {accordionItem(
        'webhook',
        'CRM Developer Webhooks',
        'Stream real-time leads captures to Zapier, Make, or custom REST APIs',
        Webhook,
        webhook.connected,
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhook.url}
                onChange={e => setWebhook({ ...webhook, url: e.target.value })}
                placeholder="https://api.mycrm.com/v1/leads"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            {webhook.connected && (
              <button
                onClick={() => handleDisconnect('crm')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => handleSave('crm')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border border-violet-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'crm' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loadingSection === 'crm' ? 'Connecting...' : 'Save & Connect'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Calendar */}
      {accordionItem(
        'calendar',
        'Cal.com Scheduler Integration',
        'Allow call agents to book meetings directly on your Calendar',
        Calendar,
        calendar.connected,
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Cal.com API Key
            </label>
            <input
              type="password"
              value={calendar.apiKey}
              onChange={e => setCalendar({ ...calendar, apiKey: e.target.value })}
              placeholder="cal_live_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Default Event Type ID
            </label>
            <input
              type="text"
              value={calendar.eventTypeId}
              onChange={e => setCalendar({ ...calendar, eventTypeId: e.target.value })}
              placeholder="e.g. 123456"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="md:col-span-2 pt-2 flex justify-end gap-3">
            {calendar.connected && (
              <button
                onClick={() => handleDisconnect('calendar')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              onClick={handleTestCalendar}
              disabled={testingCalendar || !calendar.apiKey}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-violet-500/40 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {testingCalendar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 text-violet-500" />}
              <span>{testingCalendar ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={() => handleSave('calendar')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border border-violet-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'calendar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loadingSection === 'calendar' ? 'Connecting...' : 'Save & Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
