'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { submitCall } from '@/lib/submitCall'
import { StudentAutocomplete } from '@/components/StudentAutocomplete'
import type { Student } from '@/lib/studentSearch'
import styles from './piket.module.css'

export default function PiketPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [students, setStudents] = useState<Student[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  })

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase.from('students').select('*')
      if (data) setStudents(data as Student[])
    }
    loadStudents()
  }, [supabase])

  async function handleSelect(student: Student) {
    setSubmitting(true)
    setStatus({ type: 'idle' })
    const result = await submitCall(supabase, student.name, student.class)
    setSubmitting(false)

    if (result.ok) {
      setStatus({
        type: 'success',
        message: `Berhasil memanggil ${student.name} — ${student.class}`,
      })
    } else {
      setStatus({ type: 'error', message: result.error ?? 'Gagal memanggil siswa' })
    }
  }

  return (
    <main className={styles.counter}>
      <div className={styles.window}>
        <p className={styles.eyebrow}>Loket Jemputan</p>
        <h1 className={styles.title}>Panggil Siswa</h1>
        <StudentAutocomplete
          students={students}
          onSelect={submitting ? () => {} : handleSelect}
        />
        {status.type === 'success' && (
          <p role="status" className={`${styles.stub} ${styles.stubSuccess}`}>
            {status.message}
          </p>
        )}
        {status.type === 'error' && (
          <p role="alert" className={`${styles.stub} ${styles.stubError}`}>
            {status.message}
          </p>
        )}
      </div>
    </main>
  )
}
