'use client'

import { motion } from 'framer-motion'

interface AnimatedSkeletonProps {
  count?: number
  type?: 'card' | 'line' | 'circle'
  className?: string
}

const shimmerVariants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export function AnimatedSkeleton({
  count = 1,
  type = 'card',
  className = '',
}: AnimatedSkeletonProps) {
  const skeletons = Array.from({ length: count })

  if (type === 'card') {
    return (
      <div className="space-y-4">
        {skeletons.map((_, i) => (
          <motion.div
            key={i}
            variants={shimmerVariants}
            animate="animate"
            className={`h-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg ${className}`}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        ))}
      </div>
    )
  }

  if (type === 'line') {
    return (
      <div className="space-y-3">
        {skeletons.map((_, i) => (
          <motion.div
            key={i}
            variants={shimmerVariants}
            animate="animate"
            className={`h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded ${className}`}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        ))}
      </div>
    )
  }

  if (type === 'circle') {
    return (
      <div className="flex gap-4">
        {skeletons.map((_, i) => (
          <motion.div
            key={i}
            variants={shimmerVariants}
            animate="animate"
            className={`w-12 h-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full ${className}`}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        ))}
      </div>
    )
  }

  return null
}
