'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'

interface Pixel {
  originX: number
  originY: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  isBright: boolean
}

export interface LivingGlobeCanvasProps {
  isActive?: boolean
}

export function LivingGlobeCanvas({ isActive = true }: LivingGlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false })
  const pixelsRef = useRef<Pixel[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const isActiveRef = useRef(isActive)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  // Sample image naturally with high fidelity and zero horizontal streak distortions
  const initPixels = useCallback((width: number, height: number, img: HTMLImageElement) => {
    // 2.8px to 3.0px step ensures ultra-crisp pixel definition with zero blur
    const step = width < 500 ? 2.5 : 2.8
    
    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true })
    if (!offCtx) return []

    const imgAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = width / height
    let renderW = width
    let renderH = height
    let renderX = 0
    let renderY = 0

    if (containerAspect > imgAspect) {
      renderW = width
      renderH = width / imgAspect
      renderY = (height - renderH) / 2
    } else {
      renderH = height
      renderW = height * imgAspect
      renderX = (width - renderW) / 2
    }

    offCtx.fillStyle = '#030712'
    offCtx.fillRect(0, 0, width, height)
    offCtx.drawImage(img, renderX, renderY, renderW, renderH)

    const imageData = offCtx.getImageData(0, 0, width, height)
    const data = imageData.data
    const newPixels: Pixel[] = []

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const px = Math.floor(x)
        const py = Math.floor(y)
        const index = (py * width + px) * 4

        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]
        const a = data[index + 3]

        // Skip completely dark outer space pixels to optimize performance & visual clarity
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
        if (a < 15 || brightness < 10) continue

        const isBright = brightness > 140
        const blockSize = Math.ceil(step)

        newPixels.push({
          originX: px,
          originY: py,
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          color: `rgb(${r},${g},${b})`,
          size: blockSize,
          isBright,
        })
      }
    }

    return newPixels
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let isRunning = true
    let isVisible = true

    // Pause physics & rendering when scrolled away from viewport
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isVisible = entry.isIntersecting
      }
    }, { threshold: 0.05 })
    observer.observe(container)

    // Preload image
    const img = new Image()
    img.src = '/images/auth-concept-globe.jpg'
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      setImageLoaded(true)
      resizeAndSample()
    }

    const resizeAndSample = () => {
      if (!container || !canvas || !img.complete) return
      const rect = container.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      if (width <= 0 || height <= 0) return

      // High-DPI support: eliminate blurriness on Retina & 1080p+ screens
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Disable image smoothing on context for ultra-crisp digital pixel edges
      ctx.imageSmoothingEnabled = false

      pixelsRef.current = initPixels(width, height, img)
    }

    const resizeObserver = new ResizeObserver(() => {
      resizeAndSample()
    })
    resizeObserver.observe(container)

    // Animation & Physics Loop
    let time = 0
    let lastTime = performance.now()

    const render = (now: number) => {
      if (!isRunning) return
      animationFrameRef.current = requestAnimationFrame(render)

      if (!isActiveRef.current || !isVisible) {
        lastTime = now
        return
      }

      time += 0.025
      lastTime = now

      const rect = container.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      // Set transform for High-DPI
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      
      // Clear with deep cosmic navy/black
      ctx.fillStyle = '#030712'
      ctx.fillRect(0, 0, width, height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const mouseActive = mouseRef.current.active
      const mouseRadius = 75
      const mouseRadiusSq = mouseRadius * mouseRadius

      const pixels = pixelsRef.current
      const len = pixels.length

      for (let i = 0; i < len; i++) {
        const p = pixels[i]

        // Interactive mouse repulsion
        if (mouseActive) {
          const dx = p.x - mx
          const dy = p.y - my
          const distSq = dx * dx + dy * dy

          if (distSq < mouseRadiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq)
            const force = (1 - dist / mouseRadius) * 4.5
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        // Fast spring physics returning pixel to origin
        const isDisplaced = p.x !== p.originX || p.y !== p.originY || p.vx !== 0 || p.vy !== 0
        if (isDisplaced) {
          const homeDx = p.originX - p.x
          const homeDy = p.originY - p.y
          p.vx += homeDx * 0.12
          p.vy += homeDy * 0.12

          // Damping / Friction
          p.vx *= 0.78
          p.vy *= 0.78

          p.x += p.vx
          p.y += p.vy

          // Snap to resting state when velocity is infinitesimal to stop CPU cycles
          if (Math.abs(p.vx) < 0.01 && Math.abs(p.vy) < 0.01 && Math.abs(homeDx) < 0.05 && Math.abs(homeDy) < 0.05) {
            p.x = p.originX
            p.y = p.originY
            p.vx = 0
            p.vy = 0
          }
        }

        // Subtle celestial micro-float when resting
        let drawX = p.x
        let drawY = p.y
        if (!mouseActive && p.isBright) {
          const wave = Math.sin(time + p.originX * 0.04 + p.originY * 0.04) * 0.35
          drawY += wave
        }

        // Draw crisp pixel block with integer coordinates (zero antialias blur)
        ctx.fillStyle = p.color
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), p.size, p.size)
      }
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      isRunning = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [initPixels])

  // Mouse / Pointer Event Listeners with passive performance
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    }
  }

  const handlePointerLeave = () => {
    mouseRef.current = {
      x: -1000,
      y: -1000,
      active: false,
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full min-h-[340px] select-none overflow-hidden bg-[#030712] cursor-crosshair"
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full block transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Fallback loader */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#030712]">
          <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default LivingGlobeCanvas
