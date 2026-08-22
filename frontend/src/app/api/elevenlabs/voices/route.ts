import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY || ''
  
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  })
  
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: response.status })
  }
  
  const data = await response.json()
  return NextResponse.json(data)
}
