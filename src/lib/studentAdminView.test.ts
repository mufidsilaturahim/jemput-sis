import { describe, it, expect } from 'vitest'
import { filterStudents, groupByClass } from './studentAdminView'
import type { Student } from './studentSearch'

const students: Student[] = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Budi', class: '1A' },
  { id: '3', name: 'Sasi', class: '2A' },
]

describe('filterStudents', () => {
  it('returns all students for an empty query', () => {
    expect(filterStudents(students, '')).toEqual(students)
  })

  it('matches a case-insensitive substring of the name', () => {
    expect(filterStudents(students, 'sas')).toEqual([students[0], students[2]])
  })

  it('matches a case-insensitive substring of the class', () => {
    expect(filterStudents(students, '1a')).toEqual([students[1]])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterStudents(students, 'zzz')).toEqual([])
  })
})

describe('groupByClass', () => {
  it('groups students under their class, sorted by class name', () => {
    expect(groupByClass(students)).toEqual([
      { className: '1A', students: [students[1]] },
      { className: '1B', students: [students[0]] },
      { className: '2A', students: [students[2]] },
    ])
  })

  it('sorts class names numerically (10A after 2A, not before)', () => {
    const withTen: Student[] = [
      { id: '4', name: 'Zaki', class: '10A' },
      { id: '5', name: 'Wati', class: '2A' },
    ]
    expect(groupByClass(withTen).map((g) => g.className)).toEqual(['2A', '10A'])
  })

  it('returns an empty list for empty input', () => {
    expect(groupByClass([])).toEqual([])
  })
})
