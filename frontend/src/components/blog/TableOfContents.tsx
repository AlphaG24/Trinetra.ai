'use client'

import { useEffect, useState } from 'react'

interface HeadingItem {
  id: string
  text: string
  level: number
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // Find headings inside article content
    const contentElement = document.querySelector('.blog-content')
    if (!contentElement) return

    const headingElements = contentElement.querySelectorAll('h2, h3, h4')
    const items: HeadingItem[] = []

    headingElements.forEach((el, index) => {
      // Ensure element has an ID, if not, generate one
      if (!el.id) {
        const generatedId = el.textContent
          ? el.textContent
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          : `heading-${index}`
        el.id = generatedId
      }

      items.push({
        id: el.id,
        text: el.textContent || '',
        level: parseInt(el.tagName.replace('H', ''), 10),
      })
    })

    setHeadings(items)

    // Set up intersection observer to track active section
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -40% 0px',
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id)
        }
      })
    }, observerOptions)

    headingElements.forEach((el) => observer.observe(el))

    return () => {
      headingElements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  if (headings.length === 0) return null

  return (
    <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md">
      <h3 className="font-display text-sm font-extrabold uppercase tracking-[0.1em] text-white mb-4">
        Table Of Contents
      </h3>
      <nav className="space-y-3">
        {headings.map((heading) => {
          const isActive = activeId === heading.id
          return (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(heading.id)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }}
              style={{ paddingLeft: `${(heading.level - 2) * 12}px` }}
              className={`block text-[13px] font-medium leading-relaxed transition-all duration-200 hover:text-white ${
                isActive
                  ? 'text-violet-400 font-bold border-l-2 border-violet-500 pl-2 -ml-2'
                  : 'text-zinc-400 border-l border-transparent'
              }`}
            >
              {heading.text}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
