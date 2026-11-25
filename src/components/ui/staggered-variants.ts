import type { Variants } from 'motion/react'

export const wrapperVariants: Variants = {
  open: {
    scaleY: 1,
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.08,
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  closed: {
    scaleY: 0,
    opacity: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.05,
      staggerDirection: -1,
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export const iconVariants: Variants = {
  open: { rotate: 180 },
  closed: { rotate: 0 },
}

export const itemVariants: Variants = {
  open: {
    opacity: 1,
    y: 0,
    transition: {
      when: 'beforeChildren',
      duration: 0.15,
    },
  },
  closed: {
    opacity: 0,
    y: -12,
    transition: {
      when: 'afterChildren',
      duration: 0.1,
    },
  },
}

export const actionIconVariants: Variants = {
  open: { scale: 1, y: 0 },
  closed: { scale: 0, y: -6 },
}
