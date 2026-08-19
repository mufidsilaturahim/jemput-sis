import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentAutocomplete } from './StudentAutocomplete'

const students = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Budi', class: '1A' },
]

describe('StudentAutocomplete', () => {
  it('shows matching students as the user types', () => {
    render(<StudentAutocomplete students={students} onSelect={() => {}} />)
    fireEvent.change(screen.getByLabelText('Cari nama siswa'), {
      target: { value: 'sas' },
    })
    expect(screen.getByText('Sasa — 1B')).toBeInTheDocument()
    expect(screen.queryByText('Budi — 1A')).not.toBeInTheDocument()
  })

  it('calls onSelect with the chosen student and clears the query', () => {
    const onSelect = vi.fn()
    render(<StudentAutocomplete students={students} onSelect={onSelect} />)
    const input = screen.getByLabelText('Cari nama siswa') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sas' } })
    fireEvent.click(screen.getByText('Sasa — 1B'))
    expect(onSelect).toHaveBeenCalledWith(students[0])
    expect(input.value).toBe('')
  })
})
