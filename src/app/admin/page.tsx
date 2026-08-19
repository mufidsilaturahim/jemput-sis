'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentForm } from '@/components/StudentForm'
import { StudentList } from '@/components/StudentList'
import type { Student } from '@/lib/studentSearch'
import styles from './admin.module.css'

export default function AdminPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session')
        const { authenticated } = await res.json()
        if (!authenticated) {
          router.push('/admin/login')
          return
        }
        setChecked(true)
      } catch {
        setError('Gagal memeriksa sesi — periksa koneksi lalu muat ulang halaman.')
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (!checked) return
    async function loadStudents() {
      const res = await fetch('/api/students')
      const { students: data } = await res.json()
      setStudents(data ?? [])
    }
    loadStudents()
  }, [checked])

  async function handleAdd(name: string, className: string) {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, class: className }),
    })
    if (res.ok) {
      const { student } = await res.json()
      setStudents((current) => [...current, student])
      setError(null)
    } else {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Gagal menambah siswa')
    }
  }

  async function handleUpdate(id: string, name: string, className: string) {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, class: className }),
    })
    if (res.ok) {
      const { student } = await res.json()
      setStudents((current) => current.map((s) => (s.id === id ? student : s)))
      setError(null)
    } else {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Gagal memperbarui siswa')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStudents((current) => current.filter((s) => s.id !== id))
      setError(null)
    } else {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Gagal menghapus siswa')
    }
  }

  if (!checked && !error) return null

  const classOptions = Array.from(new Set(students.map((s) => s.class))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  return (
    <main className={styles.ledger}>
      <div className={styles.ledgerInner}>
        <h1 className={styles.title}>Kelola Siswa</h1>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {checked && (
          <>
            <StudentForm submitLabel="Tambah" onSubmit={handleAdd} classOptions={classOptions} />
            <StudentList
              students={students}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              classOptions={classOptions}
            />
          </>
        )}
      </div>
    </main>
  )
}
