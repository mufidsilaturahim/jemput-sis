import { describe, it, expect } from 'vitest'
import { searchStudents, type Student } from './studentSearch'

const students: Student[] = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Sasi', class: '2A' },
  { id: '3', name: 'Budi', class: '1A' },
]

describe('searchStudents', () => {
  it('returns an empty list for an empty query', () => {
    expect(searchStudents(students, '')).toEqual([])
  })

  it('matches a case-insensitive substring of the name', () => {
    expect(searchStudents(students, 'sas')).toEqual([students[0], students[1]])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchStudents(students, 'zzz')).toEqual([])
  })
})
