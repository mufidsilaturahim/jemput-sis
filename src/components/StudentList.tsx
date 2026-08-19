'use client'

import { useState } from 'react'
import type { Student } from '@/lib/studentSearch'
import { filterStudents, groupByClass } from '@/lib/studentAdminView'
import { StudentForm } from './StudentForm'
import styles from './StudentList.module.css'

export interface StudentListProps {
  students: Student[]
  onDelete: (id: string) => void
  onUpdate: (id: string, name: string, className: string) => void
  classOptions?: string[]
}

export function StudentList({ students, onDelete, onUpdate, classOptions }: StudentListProps) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set())

  const groups = groupByClass(filterStudents(students, query))

  function toggleCollapsed(className: string) {
    setCollapsedClasses((current) => {
      const next = new Set(current)
      if (next.has(className)) {
        next.delete(className)
      } else {
        next.add(className)
      }
      return next
    })
  }

  return (
    <div>
      <label className={styles.searchField}>
        Cari nama atau kelas
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau kelas..."
        />
      </label>
      {groups.map((group) => {
        const collapsed = collapsedClasses.has(group.className)
        return (
          <section key={group.className} className={styles.group}>
            <button
              type="button"
              className={styles.groupHeader}
              onClick={() => toggleCollapsed(group.className)}
              aria-expanded={!collapsed}
            >
              {group.className} · {group.students.length} siswa
            </button>
            {!collapsed && (
              <ul className={styles.list}>
                {group.students.map((student) => (
                  <li
                    key={student.id}
                    className={editingId === student.id ? undefined : styles.row}
                  >
                    {editingId === student.id ? (
                      <StudentForm
                        submitLabel="Simpan"
                        initialName={student.name}
                        initialClass={student.class}
                        classOptions={classOptions}
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
                        {pendingDeleteId === student.id ? (
                          <span className={styles.actions}>
                            <span className={styles.confirmLabel}>Yakin?</span>
                            <button
                              type="button"
                              className={styles.actionButton}
                              onClick={() => {
                                setPendingDeleteId(null)
                                onDelete(student.id)
                              }}
                            >
                              Ya
                            </button>
                            <button
                              type="button"
                              className={styles.actionButton}
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Batal
                            </button>
                          </span>
                        ) : (
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
                              onClick={() => setPendingDeleteId(student.id)}
                            >
                              Hapus
                            </button>
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
