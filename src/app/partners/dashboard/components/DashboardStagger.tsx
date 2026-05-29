'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

const container: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function DashboardStagger({ children }: { children: ReactNode[] | ReactNode }) {
  // If children is an array, map over them and wrap in motion.div items
  const childrenArray = Array.isArray(children) ? children : [children]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
    >
      {childrenArray.map((child, index) => (
        <motion.div key={index} variants={item} className="w-full">
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
