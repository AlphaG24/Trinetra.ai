'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import type { Step, EventData, Props as JoyrideProps } from 'react-joyride'

const Joyride = dynamic(() => import('react-joyride').then(mod => mod.Joyride), { ssr: false }) as React.ComponentType<JoyrideProps>

interface ProductTourProps {
  page: 'overview' | 'detail'
  run: boolean
  onTourComplete: () => void
}

export function ProductTour({ page, run: initialRun, onTourComplete }: ProductTourProps) {
  const [mounted, setMounted] = useState(false)
  const [run, setRun] = useState(initialRun)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setRun(initialRun)
  }, [initialRun])

  const overviewSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: '👋 Welcome to Trinetra AI!',
      content: "Let's take a quick 1-minute tour to help you get your AI voice agents configured and calling.",
      skipBeacon: true,
    },
    {
      target: '[data-tour="marketplace"]',
      title: '🛍️ AI Marketplace',
      content: 'Browse, trial, and buy pre-configured industry agents (such as Real Estate, Healthcare, or Custom agents) to automate your outbound calling.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="agent-card"]',
      title: '🤖 Voice Agent Cards',
      content: 'Each agent is listed here. Click on this first Agent Card to proceed to the configuration workspace.',
      placement: 'bottom',
    },
  ]

  const detailSteps: Step[] = [
    {
      target: '[data-tour="try-demo"]',
      title: '🎙️ Sandbox Browser Test',
      content: 'Test agent conversations instantly inside your browser using real-time Web-RTC without any telephony charges.',
      placement: 'top',
      skipBeacon: true,
    },
    {
      target: '[data-tour="make-test-call"]',
      title: '📞 Simulated Testing',
      content: 'Trigger instant demo calls directly to your testing phone to experience the latency and voice quality firsthand.',
      placement: 'top',
    },
    {
      target: '[data-tour="tab-analytics"]',
      title: '📊 Conversation Analytics',
      content: 'Analyze real-time KPIs, conversion ratios, sentiment indicators, and detailed call logs for every customer interaction.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tab-numbers"]',
      title: '📞 Virtual Phone Numbers',
      content: 'Purchase virtual phone numbers, manage caller ID assignments, and configure incoming call forwarding rules.',
      placement: 'bottom',
    },
    {
      target: 'body',
      placement: 'center',
      title: '🚀 You are all set!',
      content: "Onboarding completed! Start exploring and build your first voice agent campaigns to scale your outreach.",
    },
  ]

  const steps = page === 'overview' ? overviewSteps : detailSteps

  const handleJoyrideEvent = async (data: EventData) => {
    const { status } = data
    if (['finished', 'skipped'].includes(status)) {
      setRun(false)
      if (page === 'detail' || status === 'skipped') {
        try {
          const res = await fetch('/api/profiles', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tour_completed: true }),
          })
          if (res.ok) {
            toast.success("Onboarding tour completed!")
          }
        } catch (err) {
          console.error('Failed to update tour status:', err)
        }
      } else {
        toast.info("Step completed! Click on the first Agent Card to continue.")
      }
      onTourComplete()
    }
  }

  if (!mounted) return null

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleJoyrideEvent}
      options={{
        arrowColor: '#0F0326',
        backgroundColor: '#0F0326',
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        primaryColor: '#7c3aed',
        textColor: '#ffffff',
        zIndex: 10000,
        showProgress: true,
        buttons: ['back', 'primary', 'skip'],
      }}
      styles={{
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonClose: {
          display: 'none',
        },
        buttonPrimary: {
          backgroundColor: '#7c3aed',
          borderRadius: '8px',
          color: '#ffffff',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#a1a1aa',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          marginRight: '12px',
        },
        buttonSkip: {
          color: '#f43f5e',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
        },
      }}
    />
  )
}
