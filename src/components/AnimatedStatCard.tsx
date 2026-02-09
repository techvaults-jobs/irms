'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AnimatedStatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple'
  trend?: {
    value: number
    isPositive: boolean
  }
  delay?: number
}

const colorMap = {
  red: {
    bg: 'bg-brand-gray-light',
    text: 'text-brand-primary',
    icon: 'bg-brand-primary bg-opacity-10',
    border: 'border-brand-primary border-opacity-20',
  },
  blue: {
    bg: 'bg-brand-gray-light',
    text: 'text-brand-primary',
    icon: 'bg-brand-primary bg-opacity-10',
    border: 'border-brand-primary border-opacity-20',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    icon: 'bg-green-100',
    border: 'border-green-200',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    icon: 'bg-yellow-100',
    border: 'border-yellow-200',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'bg-purple-100',
    border: 'border-purple-200',
  },
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
  hover: {
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    transition: {
      duration: 0.2,
    },
  },
}

const iconVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
    },
  },
  hover: {
    scale: 1.1,
    rotate: 5,
  },
}

const numberVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.2, duration: 0.3 },
  },
}

export function AnimatedStatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  delay = 0,
}: AnimatedStatCardProps) {
  const colors = colorMap[color]
  const [displayValue, setDisplayValue] = useState(0)

  // Animate number counting
  useEffect(() => {
    if (typeof value !== 'number') return

    let start = 0
    const end = value
    const duration = 1000
    const increment = end / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setDisplayValue(end)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return (
    <motion.div
      custom={delay}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`${colors.bg} border ${colors.border} rounded-lg p-6 cursor-pointer transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <motion.p
            variants={numberVariants}
            initial="hidden"
            animate="visible"
            className="text-sm font-medium text-brand-gray mb-2"
          >
            {title}
          </motion.p>

          <motion.div
            variants={numberVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className={`${colors.text} text-3xl font-bold`}
          >
            {typeof value === 'number' ? displayValue : value}
          </motion.div>

          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-xs font-medium mt-2 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </motion.div>
          )}
        </div>

        <motion.div
          variants={iconVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          className={`${colors.icon} p-3 rounded-lg flex-shrink-0`}
        >
          <Icon size={24} className={colors.text} />
        </motion.div>
      </div>
    </motion.div>
  )
}
