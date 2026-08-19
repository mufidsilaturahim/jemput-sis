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

  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/admin/session')
      const { authenticated } = await res.json()
      if (!authenticated) {
        router.push('/admin/login')
        return
      }
      setChecked(true)
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
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStudents((current) => current.filter((s) => s.id !== id))
    }
  }

  if (!checked) return null

  return (
    <main className={styles.ledger}>
      <div className={styles.ledgerInner}>
        <h1 className={styles.title}>Kelola Siswa</h1>
        <StudentForm submitLabel="Tambah" onSubmit={handleAdd} />
        <StudentList students={students} onUpdate={handleUpdate} onDelete={handleDelete} />
      </div>
    </main>
  )
}
