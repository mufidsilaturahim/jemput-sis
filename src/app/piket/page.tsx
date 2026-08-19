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
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
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

  const availableClasses = useMemo(
    () => Array.from(new Set(students.map((student) => student.class))).sort(),
    [students]
  )

  const classStudents = useMemo(
    () =>
      students
        .filter((student) => student.class === selectedClass)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, selectedClass]
  )

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

  function toggleClass(className: string) {
    setSelectedClass((current) => (current === className ? null : className))
  }

  return (
    <main className={styles.counter}>
      <div className={styles.window}>
        <p className={styles.eyebrow}>Loket Jemputan</p>
        <h1 className={styles.title}>Panggil Siswa</h1>
        <StudentAutocomplete
          students={students}
          onSelect={submitting ? () => {} : handleSelect}
          disabled={submitting}
        />

        {availableClasses.length > 0 && (
          <>
            <p className={styles.divider}>atau pilih kelas</p>
            <div className={styles.classPicker}>
              {availableClasses.map((className) => (
                <button
                  key={className}
                  type="button"
                  className={
                    selectedClass === className
                      ? `${styles.classButton} ${styles.classButtonActive}`
                      : styles.classButton
                  }
                  onClick={() => toggleClass(className)}
                >
                  {className}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedClass && (
          <ul className={styles.classResults}>
            {classStudents.length === 0 ? (
              <li className={styles.classResultsEmpty}>Belum ada siswa di kelas ini.</li>
            ) : (
              classStudents.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    className={styles.classResult}
                    disabled={submitting}
                    onClick={() => {
                      if (!submitting) handleSelect(student)
                    }}
                  >
                    {student.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {submitting && (
          <p role="status" className={styles.submitting}>
            Mengirim…
          </p>
        )}
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
