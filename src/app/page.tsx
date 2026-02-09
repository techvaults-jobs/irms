'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

const FloatingLogo = ({ delay, direction }: { delay: number; direction: number }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipText, setTooltipText] = useState('')

  // Creative messages for each direction
  const messages = [
    '✨ Streamline Your Workflow',
    '🚀 Accelerate Approvals',
    '📊 Track Everything',
    '💼 Manage Requisitions',
    '🎯 Stay Organized',
    '⚡ Boost Efficiency',
    '🔒 Secure & Reliable',
    '🌟 Transform Your Process',
  ]

  // Define different entry/exit paths for each direction
  const paths = [
    // Left to Right (top)
    {
      initial: { x: '-100vw', y: '10vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '110vw', y: '15vh', opacity: [0, 0.8, 1, 0.8, 0], rotate: 360, scale: [0.8, 1, 1.1, 1, 0.8] },
    },
    // Right to Left (middle-top)
    {
      initial: { x: '110vw', y: '20vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '-100vw', y: '25vh', opacity: [0, 0.9, 1, 0.9, 0], rotate: -360, scale: [0.8, 1.1, 1, 1, 0.8] },
    },
    // Top to Bottom (left side)
    {
      initial: { x: '15vw', y: '-100vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '20vw', y: '110vh', opacity: [0, 0.8, 1, 0.8, 0], rotate: 720, scale: [0.8, 1, 1.1, 1, 0.8] },
    },
    // Bottom to Top (right side)
    {
      initial: { x: '85vw', y: '110vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '80vw', y: '-100vh', opacity: [0, 0.9, 1, 0.9, 0], rotate: -720, scale: [0.8, 1.1, 1, 1, 0.8] },
    },
    // Diagonal: Top-Left to Bottom-Right
    {
      initial: { x: '-100vw', y: '-100vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '110vw', y: '110vh', opacity: [0, 0.8, 1, 0.8, 0], rotate: 540, scale: [0.8, 1, 1.1, 1, 0.8] },
    },
    // Diagonal: Top-Right to Bottom-Left
    {
      initial: { x: '110vw', y: '-100vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '-100vw', y: '110vh', opacity: [0, 0.9, 1, 0.9, 0], rotate: -540, scale: [0.8, 1.1, 1, 1, 0.8] },
    },
    // Curved path: Left to Right (wavy)
    {
      initial: { x: '-100vw', y: '50vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '110vw', y: '30vh', opacity: [0, 0.8, 1, 0.8, 0], rotate: 360, scale: [0.8, 1, 1.1, 1, 0.8] },
    },
    // Curved path: Right to Left (wavy)
    {
      initial: { x: '110vw', y: '60vh', opacity: 0, rotate: 0, scale: 0.8 },
      animate: { x: '-100vw', y: '40vh', opacity: [0, 0.9, 1, 0.9, 0], rotate: -360, scale: [0.8, 1.1, 1, 1, 0.8] },
    },
  ]

  const selectedPath = paths[direction % paths.length]

  const handleHover = () => {
    setIsHovered(true)
    setTooltipText(messages[direction % messages.length])
    setShowTooltip(true)
  }

  const handleHoverEnd = () => {
    setIsHovered(false)
    setTimeout(() => setShowTooltip(false), 300)
  }

  const handleClick = () => {
    setTooltipText(messages[direction % messages.length])
    setShowTooltip(true)
    // Trigger a small animation burst
    setTimeout(() => setShowTooltip(false), 2000)
  }

  return (
    <motion.div
      initial={selectedPath.initial}
      animate={selectedPath.animate}
      transition={{
        duration: 20,
        ease: 'linear',
        delay,
        repeat: Infinity,
      }}
      className="fixed will-change-transform pointer-events-auto z-0"
      onMouseEnter={handleHover}
      onMouseLeave={handleHoverEnd}
      onClick={handleClick}
    >
      <motion.div
        className="relative w-24 h-24 drop-shadow-2xl filter brightness-110 contrast-125 cursor-pointer"
        animate={isHovered ? { scale: 1.3, rotate: 15 } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ boxShadow: '0 0 30px rgba(220, 38, 38, 0.6)' }}
      >
        <Image
          src="/logo-sm.png"
          alt="Floating logo"
          width={96}
          height={96}
          className="w-full h-full object-contain"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(220, 38, 38, 0.3)) brightness(1.2) contrast(1.1)',
          }}
        />
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: -60, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg pointer-events-none"
          >
            {tooltipText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-700"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click ripple effect */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 border-2 border-red-500 rounded-full pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Home() {
  const floatingLogos = [
    { delay: 0, direction: 0 },
    { delay: 2, direction: 1 },
    { delay: 4, direction: 2 },
    { delay: 6, direction: 3 },
    { delay: 8, direction: 4 },
    { delay: 10, direction: 5 },
    { delay: 12, direction: 6 },
    { delay: 14, direction: 7 },
    { delay: 16, direction: 0 },
    { delay: 18, direction: 1 },
    { delay: 20, direction: 2 },
    { delay: 22, direction: 3 },
  ]

  return (
    <main className="min-h-screen bg-brand-light flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating logos background - continuous stream */}
      {floatingLogos.map((logo, idx) => (
        <FloatingLogo key={idx} {...logo} />
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md relative z-10"
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="mb-8 flex justify-center"
        >
          <div className="relative w-32 h-32">
            <Image
              src="/logo.png"
              alt="IRMS Logo"
              width={128}
              height={128}
              className="w-full h-full object-contain drop-shadow-lg"
              priority
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl font-bold text-brand-dark mb-4"
        >
          IRMS
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-lg text-brand-gray mb-8"
        >
          Internal Requisition Management System
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link
            href="/auth/login"
            className="inline-block px-8 py-4 bg-brand-primary text-brand-light font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started
          </Link>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-sm text-brand-gray mt-12"
        >
          Powered by{' '}
          <Link
            href="https://techvaults.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-primary hover:opacity-80 transition-opacity"
          >
            Techvaults
          </Link>
        </motion.p>
      </motion.div>
    </main>
  )
}
