'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedListItemProps {
  children: ReactNode
  index: number
  onClick?: () => void
  className?: string
}

const listItemVariants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
  hover: {
    x: 4,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.98,
  },
}

export function AnimatedListItem({
  children,
  index,
  onClick,
  className = '',
}: AnimatedListItemProps) {
  return (
    <motion.div
      custom={index}
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  )
}
