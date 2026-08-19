import type { Student } from './studentSearch'

export function filterStudents(students: Student[], query: string): Student[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return students
  return students.filter(
    (student) =>
      student.name.toLowerCase().includes(trimmed) ||
      student.class.toLowerCase().includes(trimmed)
  )
}

export interface StudentClassGroup {
  className: string
  students: Student[]
}

export function groupByClass(students: Student[]): StudentClassGroup[] {
  const byClass = new Map<string, Student[]>()
  for (const student of students) {
    const group = byClass.get(student.class)
    if (group) {
      group.push(student)
    } else {
      byClass.set(student.class, [student])
    }
  }
  return Array.from(byClass.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([className, groupStudents]) => ({ className, students: groupStudents }))
}
