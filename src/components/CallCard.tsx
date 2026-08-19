'use client'

import { useEffect, useRef, useState } from 'react'
import { ACTIVE_CALL_WINDOW_MS } from '@/lib/activeCalls'
import styles from './CallCard.module.css'

export interface CallCardProps {
  studentName: string
  studentClass: string
  onExpire: () => void
}

export function CallCard({ studentName, studentClass, onExpire }: CallCardProps) {
  const [audioBlocked, setAudioBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio('/call-notification.mp3')
    audioRef.current = audio
    setAudioBlocked(false)
    audio.play().catch(() => {
      // Autoplay bisa diblokir browser sebelum ada interaksi user;
      // beri tahu guru lewat affordance di kartu, jangan diam saja.
      setAudioBlocked(true)
    })
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(400)
    }

    const timer = setTimeout(onExpire, ACTIVE_CALL_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [studentName, studentClass, onExpire])

  function retryAudio() {
    audioRef.current
      ?.play()
      .then(() => setAudioBlocked(false))
      .catch(() => {
        // Still blocked; leave the affordance visible for another tap.
      })
  }

  return (
    <div className={styles.card}>
      <p className={styles.name}>{studentName}</p>
      <p className={styles.class}>{studentClass}</p>
      {audioBlocked && (
        <button type="button" className={styles.audioTag} onClick={retryAudio}>
          Ketuk untuk mengaktifkan suara
        </button>
      )}
    </div>
  )
}
