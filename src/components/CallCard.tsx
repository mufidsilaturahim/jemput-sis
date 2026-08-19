'use client'

import { useEffect } from 'react'
import { ACTIVE_CALL_WINDOW_MS } from '@/lib/activeCalls'
import styles from './CallCard.module.css'

export interface CallCardProps {
  studentName: string
  className: string
  onExpire: () => void
}

export function CallCard({ studentName, className, onExpire }: CallCardProps) {
  useEffect(() => {
    const audio = new Audio('/call-notification.mp3')
    audio.play().catch(() => {
      // Autoplay bisa diblokir browser sebelum ada interaksi user; abaikan.
    })
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(400)
    }

    const timer = setTimeout(onExpire, ACTIVE_CALL_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [studentName, className, onExpire])

  return (
    <div className={styles.card}>
      <p className={styles.name}>{studentName}</p>
      <p className={styles.class}>{className}</p>
    </div>
  )
}
