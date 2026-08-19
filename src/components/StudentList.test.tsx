import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentList } from './StudentList'

const students = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Budi', class: '1A' },
]

describe('StudentList', () => {
  it('renders each student with Edit and Hapus buttons', () => {
    render(<StudentList students={students} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('Sasa — 1B')).toBeInTheDocument()
    expect(screen.getAllByText('Edit')).toHaveLength(2)
    expect(screen.getAllByText('Hapus')).toHaveLength(2)
  })

  it('calls onDelete with the student id', () => {
    const onDelete = vi.fn()
    render(<StudentList students={students} onDelete={onDelete} onUpdate={() => {}} />)
    fireEvent.click(screen.getAllByText('Hapus')[0])
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('shows a pre-filled form on Edit and calls onUpdate on save', () => {
    const onUpdate = vi.fn()
    render(<StudentList students={students} onDelete={() => {}} onUpdate={onUpdate} />)
    fireEvent.click(screen.getAllByText('Edit')[0])
    const nameInput = screen.getByLabelText('Nama') as HTMLInputElement
    expect(nameInput.value).toBe('Sasa')
    fireEvent.change(nameInput, { target: { value: 'Sasa Baru' } })
    fireEvent.click(screen.getByText('Simpan'))
    expect(onUpdate).toHaveBeenCalledWith('1', 'Sasa Baru', '1B')
  })
})
