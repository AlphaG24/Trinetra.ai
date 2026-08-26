import { NextResponse } from 'next/server'

const SARVAM_VOICES = [
  // High-performance Low-latency Voices (bulbul:v2)
  { id: 'anushka', name: 'Anushka (Low Latency / Smooth)', gender: 'Female' },
  { id: 'karun', name: 'Karun (Low Latency / Smooth)', gender: 'Male' },
  { id: 'manisha', name: 'Manisha (Low Latency)', gender: 'Female' },
  { id: 'abhilash', name: 'Abhilash (Low Latency)', gender: 'Male' },
  { id: 'vidya', name: 'Vidya (Low Latency)', gender: 'Female' },
  { id: 'arya', name: 'Arya (Low Latency)', gender: 'Female' },
  { id: 'hitesh', name: 'Hitesh (Low Latency)', gender: 'Male' },
  
  // Standard Voices (bulbul:v3)
  { id: 'shubh', name: 'Shubh', gender: 'Male' },
  { id: 'aditya', name: 'Aditya', gender: 'Male' },
  { id: 'rahul', name: 'Rahul', gender: 'Male' },
  { id: 'rohan', name: 'Rohan', gender: 'Male' },
  { id: 'amit', name: 'Amit', gender: 'Male' },
  { id: 'dev', name: 'Dev', gender: 'Male' },
  { id: 'ratan', name: 'Ratan', gender: 'Male' },
  { id: 'varun', name: 'Varun', gender: 'Male' },
  { id: 'manan', name: 'Manan', gender: 'Male' },
  { id: 'sumit', name: 'Sumit', gender: 'Male' },
  { id: 'kabir', name: 'Kabir', gender: 'Male' },
  { id: 'aayan', name: 'Aayan', gender: 'Male' },
  { id: 'ashutosh', name: 'Ashutosh', gender: 'Male' },
  { id: 'advait', name: 'Advait', gender: 'Male' },
  { id: 'anand', name: 'Anand', gender: 'Male' },
  { id: 'tarun', name: 'Tarun', gender: 'Male' },
  { id: 'sunny', name: 'Sunny', gender: 'Male' },
  { id: 'mani', name: 'Mani', gender: 'Male' },
  { id: 'gokul', name: 'Gokul', gender: 'Male' },
  { id: 'vijay', name: 'Vijay', gender: 'Male' },
  { id: 'mohit', name: 'Mohit', gender: 'Male' },
  { id: 'rehan', name: 'Rehan', gender: 'Male' },
  { id: 'soham', name: 'Soham', gender: 'Male' },
  { id: 'ritu', name: 'Ritu', gender: 'Female' },
  { id: 'priya', name: 'Priya', gender: 'Female' },
  { id: 'neha', name: 'Neha', gender: 'Female' },
  { id: 'pooja', name: 'Pooja', gender: 'Female' },
  { id: 'simran', name: 'Simran', gender: 'Female' },
  { id: 'kavya', name: 'Kavya', gender: 'Female' },
  { id: 'ishita', name: 'Ishita', gender: 'Female' },
  { id: 'shreya', name: 'Shreya', gender: 'Female' },
  { id: 'roopa', name: 'Roopa', gender: 'Female' },
  { id: 'tanya', name: 'Tanya', gender: 'Female' },
  { id: 'shruti', name: 'Shruti', gender: 'Female' },
  { id: 'suhani', name: 'Suhani', gender: 'Female' },
  { id: 'kavitha', name: 'Kavitha', gender: 'Female' },
  { id: 'rupali', name: 'Rupali', gender: 'Female' }
]

export async function GET() {
  return NextResponse.json({ voices: SARVAM_VOICES })
}
