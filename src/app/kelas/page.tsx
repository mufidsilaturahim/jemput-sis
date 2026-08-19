'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { ACTIVE_CALL_WINDOW_MS, filterActiveCalls, type CallRow } from '@/lib/activeCalls'
import { subscribeToClassCalls } from '@/lib/classCallsChannel'
import { CallCard } from '@/components/CallCard'
import styles from './kelas.module.css'

const CLASS_STORAGE_KEY = 'jemput-sis:selected-class'

// Merge freshly-fetched rows into current state, deduped by id, with the
// fetched data authoritative for any id it contains. This protects against
// the initial-fetch/realtime-insert race: a call that already arrived via
// the realtime handler while a fetch was in flight is never dropped just
// because that fetch's snapshot didn't (yet) include it.
function mergeCalls(current: CallRow[], incoming: CallRow[]): CallRow[] {
  const byId = new Map(current.map((call) => [call.id, call]))
  for (const call of incoming) byId.set(call.id, call)
  return Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

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

      if (active && data) {
        setCalls((current) => mergeCalls(current, data as CallRow[]))
      }
    }

    loadActiveCalls()

    // Re-fetch on every successful (re)subscribe — this fires once on the
    // initial subscribe AND again after supabase-js silently rejoins the
    // channel following a dropped socket, so calls made while offline
    // aren't lost.
    const channel = subscribeToClassCalls(
      supabase,
      selectedClass,
      (call) => {
        setCalls((current) => mergeCalls(current, [call]))
      },
      () => {
        loadActiveCalls()
      }
    )

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [selectedClass, supabase])

  useEffect(() => {
    if (!selectedClass) return
    const interval = setInterval(() => {
      setCalls((current) => filterActiveCalls(current, Date.now(), ACTIVE_CALL_WINDOW_MS))
    }, 1000)
    return () => clearInterval(interval)
  }, [selectedClass])

  // Prune the handler cache in its own effect, keyed on `calls`, so the
  // setCalls updater above (used both here and by the prune interval)
  // stays a pure function of state instead of reaching out to mutate a ref.
  useEffect(() => {
    const activeIds = new Set(calls.map((c) => c.id))
    for (const id of expireHandlers.current.keys()) {
      if (!activeIds.has(id)) expireHandlers.current.delete(id)
    }
  }, [calls])

  function selectClass(className: string) {
    window.localStorage.setItem(CLASS_STORAGE_KEY, className)
    setSelectedClass(className)
  }

  function changeClass() {
    window.localStorage.removeItem(CLASS_STORAGE_KEY)
    setSelectedClass(null)
    setCalls([])
  }

  if (!selectedClass) {
    return (
      <main className={styles.picker}>
        <h1 className={styles.pickerTitle}>Pilih Kelas</h1>
        {availableClasses.length === 0 ? (
          <p className={styles.pickerEmpty}>
            Belum ada data siswa — hubungi admin untuk menambahkan.
          </p>
        ) : (
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
        )}
      </main>
    )
  }

  return (
    <main className={styles.board}>
      <header className={styles.gateHeader}>
        <span className={styles.gateLabel}>Antrian Jemputan</span>
        <h1 className={styles.gateClass}>{selectedClass}</h1>
        <button type="button" className={styles.changeClass} onClick={changeClass}>
          Ganti kelas
        </button>
      </header>
      <div className={styles.queue}>
        {calls.length === 0 ? (
          <p className={styles.empty}>Belum ada panggilan aktif.</p>
        ) : (
          calls.map((call) => (
            <CallCard
              key={call.id}
              studentName={call.student_name}
              studentClass={call.class}
              onExpire={getExpireHandler(call.id)}
            />
          ))
        )}
      </div>
    </main>
  )
}
