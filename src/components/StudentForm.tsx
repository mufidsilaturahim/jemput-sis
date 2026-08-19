'use client'

import { useState, type FormEvent } from 'react'
import styles from './StudentForm.module.css'

export interface StudentFormProps {
  onSubmit: (name: string, className: string) => void
  submitLabel: string
  initialName?: string
  initialClass?: string
}

export function StudentForm({
  onSubmit,
  submitLabel,
  initialName = '',
  initialClass = '',
}: StudentFormProps) {
  const [name, setName] = useState(initialName)
  const [className, setClassName] = useState(initialClass)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !className.trim()) {
      setError('Nama dan kelas wajib diisi')
      return
    }
    setError(null)
    onSubmit(name.trim(), className.trim())
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Nama
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={styles.field}>
        Kelas
        <input
          className={styles.input}
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button type="submit" className={styles.submit}>
        {submitLabel}
      </button>
    </form>
  )
}
