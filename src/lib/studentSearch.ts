export interface Student {
  id: string
  name: string
  class: string
}

export function searchStudents(students: Student[], query: string): Student[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  return students.filter((student) => student.name.toLowerCase().includes(trimmed))
}
