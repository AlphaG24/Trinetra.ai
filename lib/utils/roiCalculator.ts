// lib/utils/roiCalculator.ts

interface ROIMetrics {
  voice_minutes?: number
  chat_count?: number
  appointments?: number
  leads?: number
}

/**
 * Calculates ROI value in INR based on interactions.
 * Formula: (voice_minutes × 15) + (chat_count × 20) + (appointments × 200) + (leads × 280)
 */
export function calculateROI(metrics: ROIMetrics): number {
  const voiceValue = (metrics.voice_minutes || 0) * 15
  const chatValue = (metrics.chat_count || 0) * 20
  const appointmentValue = (metrics.appointments || 0) * 200
  const leadValue = (metrics.leads || 0) * 280

  return voiceValue + chatValue + appointmentValue + leadValue
}
