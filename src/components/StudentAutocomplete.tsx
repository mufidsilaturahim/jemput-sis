'use client'

import { useState } from 'react'
import { searchStudents, type Student } from '@/lib/studentSearch'
import styles from './StudentAutocomplete.module.css'

export interface StudentAutocompleteProps {
  students: Student[]
  onSelect: (student: Student) => void
  disabled?: boolean
}

export function StudentAutocomplete({ students, onSelect, disabled }: StudentAutocompleteProps) {
  const [query, setQuery] = useState('')
  const results = searchStudents(students, query)

  return (
    <div className={styles.field}>
      <input
        type="text"
        className={styles.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari nama siswa..."
        aria-label="Cari nama siswa"
        disabled={disabled}
      />
      {results.length > 0 && (
        <ul className={styles.results}>
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                className={styles.result}
                onClick={() => {
                  onSelect(student)
                  setQuery('')
                }}
              >
                {student.name} — {student.class}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
