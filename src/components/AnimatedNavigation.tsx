'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface AnimatedNavigationProps {
  items: NavItem[]
  isOpen: boolean
  onToggle: () => void
}

const sidebarVariants = {
  open: {
    width: 256,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  closed: {
    width: 80,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
}

const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
  hover: {
    x: 4,
    transition: { duration: 0.2 },
  },
}

const labelVariants = {
  hidden: { opacity: 0, width: 0 },
  visible: {
    opacity: 1,
    width: 'auto',
    transition: { delay: 0.1, duration: 0.2 },
  },
}

export function AnimatedNavigation({ items, isOpen, onToggle }: AnimatedNavigationProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <motion.div
      variants={sidebarVariants}
      initial={isOpen ? 'open' : 'closed'}
      animate={isOpen ? 'open' : 'closed'}
      className="bg-brand-light border-r border-brand-gray-border flex flex-col shadow-sm h-screen"
    >
      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        <AnimatePresence>
          {items.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <motion.div
                key={item.href}
                custom={index}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
              >
                <Link href={item.href}>
                  <motion.div
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group',
                      active
                        ? 'bg-brand-primary bg-opacity-10 text-brand-primary'
                        : 'text-brand-gray hover:bg-brand-gray-light'
                    )}
                    whileHover={{ backgroundColor: active ? 'rgba(188, 0, 4, 0.1)' : '#f5f5f5' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active indicator */}
                    {active && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r-lg"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        exit={{ scaleY: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}

                    {/* Icon */}
                    <motion.div
                      className="flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <Icon size={20} />
                    </motion.div>

                    {/* Label */}
                    {isOpen && (
                      <motion.span
                        variants={labelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {!isOpen && (
                      <motion.div
                        className="absolute left-full ml-2 px-3 py-2 bg-brand-dark text-brand-light text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={{ opacity: 0, x: -10 }}
                        whileHover={{ opacity: 1, x: 0 }}
                      >
                        {item.name}
                      </motion.div>
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </nav>
    </motion.div>
  )
}
