'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { ACTIVE_CALL_WINDOW_MS, filterActiveCalls, type CallRow } from '@/lib/activeCalls'
import { subscribeToClassCalls } from '@/lib/classCallsChannel'
import { CallCard } from '@/components/CallCard'
import styles from './kelas.module.css'

const CLASS_STORAGE_KEY = 'jemput-sis:selected-class'

export default function KelasPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [calls, setCalls] = useState<CallRow[]>([])

  // Cache a single stable onExpire handler per call id so CallCard's
  // internal useEffect (which depends on onExpire) doesn't re-run every
  // time this component re-renders — e.g. from the 1s prune interval below,
  // which produces a new `calls` array reference even when nothing expired.
  const expireHandlers = useRef(new Map<string, () => void>())

  function getExpireHandler(id: string) {
    const existing = expireHandlers.current.get(id)
    if (existing) return existing
    const handler = () => {
      setCalls((current) => current.filter((c) => c.id !== id))
    }
    expireHandlers.current.set(id, handler)
    return handler
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(CLASS_STORAGE_KEY)
    if (stored) setSelectedClass(stored)
  }, [])

  useEffect(() => {
    async function loadClasses() {
      const { data } = await supabase.from('students').select('class')
      if (data) {
        const unique = Array.from(
          new Set(data.map((row: { class: string }) => row.class))
        ).sort()
        setAvailableClasses(unique)
      }
    }
    loadClasses()
  }, [supabase])

  useEffect(() => {
    if (!selectedClass) return

    let active = true

    async function loadActiveCalls() {
      const since = new Date(Date.now() - ACTIVE_CALL_WINDOW_MS).toISOString()
      const { data } = await supabase
        .from('calls')
        .select('*')
        .eq('class', selectedClass)
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (active && data) setCalls(data as CallRow[])
    }

    loadActiveCalls()

    const channel = subscribeToClassCalls(supabase, selectedClass, (call) => {
      setCalls((current) => [call, ...current])
    })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [selectedClass, supabase])

  useEffect(() => {
    if (!selectedClass) return
    const interval = setInterval(() => {
      setCalls((current) => {
        const pruned = filterActiveCalls(current, Date.now(), ACTIVE_CALL_WINDOW_MS)
        const activeIds = new Set(pruned.map((c) => c.id))
        for (const id of expireHandlers.current.keys()) {
          if (!activeIds.has(id)) expireHandlers.current.delete(id)
        }
        return pruned
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [selectedClass])

  function selectClass(className: string) {
    window.localStorage.setItem(CLASS_STORAGE_KEY, className)
    setSelectedClass(className)
  }

  if (!selectedClass) {
    return (
      <main className={styles.picker}>
        <h1 className={styles.pickerTitle}>Pilih Kelas</h1>
        <ul className={styles.gateGrid}>
          {availableClasses.map((className) => (
            <li key={className}>
              <button
                type="button"
                className={styles.gateButton}
                onClick={() => selectClass(className)}
              >
                {className}
              </button>
            </li>
          ))}
        </ul>
      </main>
    )
  }

  return (
    <main className={styles.board}>
      <header className={styles.gateHeader}>
        <span className={styles.gateLabel}>Antrian Jemputan</span>
        <h1 className={styles.gateClass}>{selectedClass}</h1>
      </header>
      <div className={styles.queue}>
        {calls.length === 0 ? (
          <p className={styles.empty}>Menunggu panggilan pertama hari ini.</p>
        ) : (
          calls.map((call) => (
            <CallCard
              key={call.id}
              studentName={call.student_name}
              className={call.class}
              onExpire={getExpireHandler(call.id)}
            />
          ))
        )}
      </div>
    </main>
  )
}
