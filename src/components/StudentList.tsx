'use client'

import { useState } from 'react'
import type { Student } from '@/lib/studentSearch'
import { StudentForm } from './StudentForm'
import styles from './StudentList.module.css'

export interface StudentListProps {
  students: Student[]
  onDelete: (id: string) => void
  onUpdate: (id: string, name: string, className: string) => void
}

export function StudentList({ students, onDelete, onUpdate }: StudentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <ul className={styles.list}>
      {students.map((student) => (
        <li key={student.id} className={editingId === student.id ? undefined : styles.row}>
          {editingId === student.id ? (
            <StudentForm
              submitLabel="Simpan"
              initialName={student.name}
              initialClass={student.class}
              onSubmit={(name, className) => {
                onUpdate(student.id, name, className)
                setEditingId(null)
              }}
            />
          ) : (
            <>
              <span className={styles.name}>
                {student.name} — {student.class}
              </span>
              <span className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setEditingId(student.id)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => onDelete(student.id)}
                >
                  Hapus
                </button>
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
