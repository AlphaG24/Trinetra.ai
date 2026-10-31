'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Send, MessageCircle, MessageSquare, Mail, Webhook, Calendar, Loader2, CheckCircle2, ShieldAlert, PhoneCall, Phone, Radio, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function IntegrationsTab() {
  const [openSection, setOpenSection] = useState<string | null>('sarvam')
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Carrier (BYON) states
  const [exotel, setExotel] = useState({ accountSid: '', apiKey: '', apiToken: '', subdomain: 'api.exotel.com', callerId: '', connected: false })
  const [twilio, setTwilio] = useState({ accountSid: '', authToken: '', apiKeyOrSid: '', connected: false })
  const [sarvam, setSarvam] = useState({ apiKey: '', callerId: '+919513886363', connected: false })
  const [testingCarrier, setTestingCarrier] = useState<string | null>(null)
  const [exotelNumbers, setExotelNumbers] = useState<any[]>([])
  const [fetchingExotelNumbers, setFetchingExotelNumbers] = useState(false)
  const [linkingExotelNumber, setLinkingExotelNumber] = useState<string | null>(null)
  const [manualExotelNumber, setManualExotelNumber] = useState('')
  const [manualExotelName, setManualExotelName] = useState('')
  const [linkingManualNumber, setLinkingManualNumber] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

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

      // Also fetch BYON carrier credentials
      try {
        const byonRes = await fetch('/api/integrations/byon')
        if (byonRes.ok) {
          const byonData = await byonRes.json()
          if (byonData.sarvam) {
            setSarvam({
              apiKey: '',
              callerId: byonData.sarvam.caller_id || byonData.sarvam.account_sid || '+919513886363',
              connected: !!byonData.sarvam.connected,
            })
          }
          if (byonData.exotel) {
            setExotel({
              accountSid: byonData.exotel.account_sid || '',
              apiKey: byonData.exotel.api_key_or_sid || '',
              apiToken: '',
              subdomain: byonData.exotel.subdomain || 'api.exotel.com',
              callerId: '',
              connected: !!byonData.exotel.connected,
            })
            if (byonData.exotel.connected) {
              // Automatically fetch and display Exotel numbers
              fetch('/api/integrations/byon/exotel/numbers')
                .then(r => r.json())
                .then(d => { if (d.numbers) setExotelNumbers(d.numbers) })
                .catch(() => {})
            }
          }
          if (byonData.twilio) {
            setTwilio({
              accountSid: byonData.twilio.account_sid || '',
              authToken: '',
              apiKeyOrSid: byonData.twilio.api_key_or_sid || '',
              connected: !!byonData.twilio.connected,
            })
          }
        }
      } catch (byonErr) {
        console.warn('Failed to load BYON configs:', byonErr)
      }

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

  const handleSaveByon = async (carrier: 'exotel' | 'twilio' | 'sarvam') => {
    if (carrier === 'exotel') {
      if (!exotel.accountSid || !exotel.apiToken) {
        toast.error('Please enter Exotel Account SID and API Token')
        return
      }
    } else if (carrier === 'twilio') {
      if (!twilio.accountSid || !twilio.authToken) {
        toast.error('Please enter Twilio Account SID and Auth Token')
        return
      }
    } else if (carrier === 'sarvam') {
      if (!sarvam.apiKey) {
        toast.error('Please enter your Sarvam AI API Key')
        return
      }
    }

    try {
      setLoadingSection(carrier)
      const payload = carrier === 'exotel' ? {
        carrier: 'exotel',
        account_sid: exotel.accountSid,
        auth_token: exotel.apiToken,
        api_key_or_sid: exotel.apiKey,
        subdomain: exotel.subdomain || 'api.exotel.com',
      } : carrier === 'twilio' ? {
        carrier: 'twilio',
        account_sid: twilio.accountSid,
        auth_token: twilio.authToken,
        api_key_or_sid: twilio.apiKeyOrSid,
      } : {
        carrier: 'sarvam',
        account_sid: sarvam.callerId || '+919513886363',
        auth_token: sarvam.apiKey,
        api_key_or_sid: sarvam.callerId || '+919513886363',
      }

      const res = await fetch('/api/integrations/byon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to vault carrier credentials')

      toast.success(`${carrier.toUpperCase()} credentials encrypted & saved!`)
      fetchConfig()
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setLoadingSection(null)
    }
  }

  const handleDisconnectByon = async (carrier: 'exotel' | 'twilio' | 'sarvam') => {
    if (!window.confirm(`Are you sure you want to disconnect ${carrier.toUpperCase()} integration?`)) {
      return
    }
    try {
      setLoadingSection(carrier)
      const res = await fetch(`/api/integrations/byon?carrier=${carrier}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect carrier')
      }
      toast.success(`${carrier.toUpperCase()} integration disconnected`)
      fetchConfig()
    } catch (err: any) {
      toast.error('Disconnect failed: ' + err.message)
    } finally {
      setLoadingSection(null)
    }
  }

  const handleTestCarrier = async (carrier: 'exotel' | 'twilio' | 'sarvam') => {
    try {
      setTestingCarrier(carrier)
      const payload = carrier === 'exotel' ? {
        carrier: 'exotel',
        account_sid: exotel.accountSid,
        api_key: exotel.apiKey,
        auth_token: exotel.apiToken,
        subdomain: exotel.subdomain || 'api.exotel.com'
      } : carrier === 'twilio' ? {
        carrier: 'twilio',
        account_sid: twilio.accountSid,
        auth_token: twilio.authToken,
        api_key_or_sid: twilio.apiKeyOrSid
      } : {
        carrier: 'sarvam',
        account_sid: sarvam.callerId,
        auth_token: sarvam.apiKey,
        api_key_or_sid: sarvam.apiKey
      }

      const res = await fetch('/api/integrations/byon/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection test failed')
      }
      toast.success(data.message || `${carrier.toUpperCase()} connection verified!`)
    } catch (err: any) {
      toast.error(err.message || `Carrier test failed`)
    } finally {
      setTestingCarrier(null)
    }
  }

  const handleCopyWebhook = () => {
    const url = 'https://api.vaakriti.com/webhooks/voice/exotel'
    navigator.clipboard.writeText(url)
    setCopiedWebhook(true)
    toast.success('Call Forwarding URL copied to clipboard!')
    setTimeout(() => setCopiedWebhook(false), 2500)
  }

  const handleFetchExotelNumbers = async () => {
    try {
      setFetchingExotelNumbers(true)
      const res = await fetch('/api/integrations/byon/exotel/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: exotel.accountSid,
          apiKey: exotel.apiKey,
          apiToken: exotel.apiToken,
          subdomain: exotel.subdomain || 'api.exotel.com'
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch Exotel numbers')
      }
      setExotelNumbers(data.numbers || [])
      if ((data.numbers || []).length === 0) {
        toast.info(data.message || 'No virtual numbers found via API. You can link your ExoPhone directly below.')
      } else {
        toast.success(`Found ${data.numbers.length} Exotel number(s)!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching numbers from Exotel')
    } finally {
      setFetchingExotelNumbers(false)
    }
  }

  const handleLinkManualExotelNumber = async () => {
    const rawNumber = manualExotelNumber.trim()
    if (!rawNumber) {
      toast.error('Please enter an ExoPhone number to link')
      return
    }
    try {
      setLinkingManualNumber(true)
      const res = await fetch('/api/integrations/byon/exotel/link-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: rawNumber,
          friendly_name: manualExotelName.trim() || 'Exotel BYON Number',
          sid: `manual_${Date.now()}`
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to link number')
      }
      toast.success(data.message || 'ExoPhone linked to your Vaakriti workspace successfully!')
      setManualExotelNumber('')
      setManualExotelName('')
      handleFetchExotelNumbers()
    } catch (err: any) {
      toast.error(err.message || 'Error linking number')
    } finally {
      setLinkingManualNumber(false)
    }
  }

  const handleLinkExotelNumber = async (num: any) => {
    try {
      setLinkingExotelNumber(num.phone_number)
      const res = await fetch('/api/integrations/byon/exotel/link-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: num.phone_number,
          friendly_name: num.friendly_name,
          sid: num.sid
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to link number')
      }
      toast.success(data.message || 'ExoPhone linked successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Error linking number')
    } finally {
      setLinkingExotelNumber(null)
    }
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
        <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Initializing integrations hub...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-left">
      <div className="bg-zinc-100/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3 mb-2">
        <ShieldAlert className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Global System Integrations</h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            These credentials apply organization-wide across all your agents. Connect once, and use them on any virtual assistant workspace.
          </p>
        </div>
      </div>

      {/* 0. Sarvam AI Telephony & Indian Voice (Individual KYC Compliant) */}
      {accordionItem(
        'sarvam',
        'Sarvam AI Voice & Indian Telephony',
        'Native Indian multilingual voice pipeline, individual DigiLocker KYC compliant, and direct DID provisioning',
        Radio,
        sarvam.connected,
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-bold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Individual KYC & Native Indian Voice Pipeline
            </span>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Enables instant outbound calls and inbound routing without requiring corporate business registration. Uses individual Aadhaar/PAN verification for full telecom compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Sarvam API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={sarvam.apiKey}
                onChange={e => setSarvam({ ...sarvam, apiKey: e.target.value })}
                placeholder="sk-srv-..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Verified Caller ID / Outbound DID
              </label>
              <input
                type="text"
                value={sarvam.callerId}
                onChange={e => setSarvam({ ...sarvam, callerId: e.target.value })}
                placeholder="+919513886363"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {sarvam.connected && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDisconnectByon('sarvam')}
                    disabled={loadingSection !== null}
                    className="px-3.5 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestCarrier('sarvam')}
                    disabled={testingCarrier === 'sarvam'}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    {testingCarrier === 'sarvam' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>Test Ping</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => handleSaveByon('sarvam')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'sarvam' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{loadingSection === 'sarvam' ? 'Saving...' : sarvam.connected ? 'Update Sarvam' : 'Save & Connect'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 0.1 Exotel Telephony (India) */}
      {accordionItem(
        'exotel',
        'Exotel Telephony (India BYON)',
        'Connect your own Exotel Indian DID numbers for low-latency national calling & DLT routing',
        PhoneCall,
        exotel.connected,
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Exotel Account SID
              </label>
              <input
                type="text"
                value={exotel.accountSid}
                onChange={e => setExotel({ ...exotel, accountSid: e.target.value })}
                placeholder="e.g. your_exotel_sid"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Exotel API Key
              </label>
              <input
                type="text"
                value={exotel.apiKey}
                onChange={e => setExotel({ ...exotel, apiKey: e.target.value })}
                placeholder="e.g. 9a8b7c6d5e4f"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Exotel API Token / Secret
              </label>
              <input
                type="password"
                value={exotel.apiToken}
                onChange={e => setExotel({ ...exotel, apiToken: e.target.value })}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Subdomain (Cluster Endpoint)
              </label>
              <input
                type="text"
                value={exotel.subdomain}
                onChange={e => setExotel({ ...exotel, subdomain: e.target.value })}
                placeholder="api.exotel.com or api.in.exotel.com"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-wrap justify-end gap-3">
            {exotel.connected && (
              <button
                onClick={() => handleDisconnectByon('exotel')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              onClick={() => handleTestCarrier('exotel')}
              disabled={testingCarrier !== null || !exotel.accountSid}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {testingCarrier === 'exotel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
              <span>{testingCarrier === 'exotel' ? 'Testing Ping...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={() => handleSaveByon('exotel')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'exotel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{loadingSection === 'exotel' ? 'Saving...' : 'Save & Connect'}</span>
            </button>
          </div>

          {/* Webhook & Call Forwarding Setup Guidance */}
          <div className="mt-4 p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Connect Incoming Calls (Call Forwarding URL)</span>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied URL' : 'Copy Forwarding URL'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 select-all overflow-x-auto">
              https://api.vaakriti.com/webhooks/voice/exotel
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-2">
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <strong>What is this URL?</strong> This link tells Exotel to forward any incoming call straight to your Vaakriti AI voice assistant. (In Exotel&apos;s call flow editor, this call-forwarding connector is officially called a <em>&quot;Passthru Applet&quot;</em>).
              </p>
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/5 space-y-1">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Easy 4-Step Setup in Exotel:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Open your <strong>Exotel Dashboard</strong> &rarr; click on <strong>App Bazaar</strong>.</li>
                  <li>Create or edit your call flow and drag in the <strong>Passthru</strong> (Call Forwarding) widget.</li>
                  <li>Paste the URL above into the <strong>HTTP URL</strong> field and set the method to <strong>POST</strong>.</li>
                  <li>Under <strong>ExoPhones</strong> in Exotel, attach your phone number to this flow. Done!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Sync Numbers Section */}
          <div className="mt-4 p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Exotel Account Numbers (ExoPhones)</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Discover and link virtual phone numbers from your Exotel account to your Vaakriti workspace.</p>
              </div>
              <button
                type="button"
                onClick={handleFetchExotelNumbers}
                disabled={fetchingExotelNumbers || !exotel.accountSid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/15 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {fetchingExotelNumbers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{fetchingExotelNumbers ? 'Syncing...' : 'Sync Numbers'}</span>
              </button>
            </div>

            {exotelNumbers.length > 0 && (
              <div className="divide-y divide-zinc-200 dark:divide-white/5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 overflow-hidden">
                {exotelNumbers.map((num, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{num.phone_number}</span>
                        {num.circle && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {num.circle}
                          </span>
                        )}
                        {num.operator && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {num.operator}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{num.friendly_name || num.sid}</div>
                    </div>
                    {num.is_linked ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Linked &amp; Active
                        </span>
                        <a
                          href="/dashboard/phone-numbers"
                          className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLinkExotelNumber(num)}
                        disabled={linkingExotelNumber === num.phone_number}
                        className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        {linkingExotelNumber === num.phone_number ? 'Linking...' : 'Link to Vaakriti'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Direct Number Link Input */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                Link Number Directly (for trial or admin-added virtual numbers):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={manualExotelNumber}
                  onChange={e => setManualExotelNumber(e.target.value)}
                  placeholder="e.g. 08047483921 or +918047483921"
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                />
                <input
                  type="text"
                  value={manualExotelName}
                  onChange={e => setManualExotelName(e.target.value)}
                  placeholder="Label (e.g. Support Line)"
                  className="sm:w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                />
                <button
                  type="button"
                  onClick={handleLinkManualExotelNumber}
                  disabled={linkingManualNumber || !manualExotelNumber.trim()}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-[0.98]"
                >
                  {linkingManualNumber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{linkingManualNumber ? 'Linking...' : 'Link to Vaakriti'}</span>
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                If your Exotel number was added to your pool via admin or doesn&apos;t appear in auto-sync, enter it above to link it immediately to your workspace.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 0.1 Twilio Telephony (Global BYON) */}
      {accordionItem(
        'twilio',
        'Twilio Telephony & SIP Trunking',
        'Bring your own Twilio numbers for global calling coverage with enterprise-grade encrypted vault storage',
        Phone,
        twilio.connected,
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Twilio Account SID
              </label>
              <input
                type="text"
                value={twilio.accountSid}
                onChange={e => setTwilio({ ...twilio, accountSid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Twilio Auth Token
              </label>
              <input
                type="password"
                value={twilio.authToken}
                onChange={e => setTwilio({ ...twilio, authToken: e.target.value })}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold font-montserrat text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              API Key SID (Optional Subaccount / Key)
            </label>
            <input
              type="text"
              value={twilio.apiKeyOrSid}
              onChange={e => setTwilio({ ...twilio, apiKeyOrSid: e.target.value })}
              placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Optional)"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            {twilio.connected && (
              <button
                onClick={() => handleDisconnectByon('twilio')}
                disabled={loadingSection !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              onClick={() => handleTestCarrier('twilio')}
              disabled={testingCarrier !== null || !twilio.accountSid}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {testingCarrier === 'twilio' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
              <span>{testingCarrier === 'twilio' ? 'Testing Ping...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={() => handleSaveByon('twilio')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingSection === 'twilio' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{loadingSection === 'twilio' ? 'Saving...' : 'Save & Connect'}</span>
            </button>
          </div>
        </div>
      )}

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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
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
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
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
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 text-xs font-semibold font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {testingCalendar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
              <span>{testingCalendar ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={() => handleSave('calendar')}
              disabled={loadingSection !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 shadow-sm active:scale-[0.98] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
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
