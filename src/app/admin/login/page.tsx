'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../admin.module.css'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Gagal login')
    }
  }

  return (
    <main className={styles.login}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Login Admin</h1>
        <form onSubmit={handleSubmit}>
          <label className={styles.field}>
            Password
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button type="submit" className={styles.submit}>
            Masuk
          </button>
        </form>
      </div>
    </main>
  )
}
