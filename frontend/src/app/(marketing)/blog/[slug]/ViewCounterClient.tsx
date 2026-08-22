'use client'

import { useEffect, useRef } from 'react'

interface ViewCounterClientProps {
  slug: string
}

export default function ViewCounterClient({ slug }: ViewCounterClientProps) {
  const incremented = useRef(false)

  useEffect(() => {
    if (incremented.current) return
    incremented.current = true

    // Call the slug API to trigger view increment
    const sessionKey = `trinetra_viewed_${slug}`
    try {
      if (window.sessionStorage.getItem(sessionKey)) return
    } catch {
      // ignore sessionStorage blockages
    }

    fetch(`/api/blog/${slug}`)
      .then((res) => {
        if (res.ok) {
          try {
            window.sessionStorage.setItem(sessionKey, '1')
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.error('Failed to increment views:', err)
      })
  }, [slug])

  return null
}
