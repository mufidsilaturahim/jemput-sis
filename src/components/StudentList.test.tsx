import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentList } from './StudentList'

const students = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Budi', class: '1A' },
]

describe('StudentList', () => {
  it('groups students under class headings, sorted by class name', () => {
    render(<StudentList students={students} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('1A · 1 siswa')).toBeInTheDocument()
    expect(screen.getByText('1B · 1 siswa')).toBeInTheDocument()
  })

  it('renders each student with Edit and Hapus buttons', () => {
    render(<StudentList students={students} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('Sasa — 1B')).toBeInTheDocument()
    expect(screen.getByText('Budi — 1A')).toBeInTheDocument()
    expect(screen.getAllByText('Edit')).toHaveLength(2)
    expect(screen.getAllByText('Hapus')).toHaveLength(2)
  })

  it('filters students by name or class as the search query changes', () => {
    render(<StudentList students={students} onDelete={() => {}} onUpdate={() => {}} />)
    fireEvent.change(screen.getByLabelText('Cari nama atau kelas'), { target: { value: '1a' } })
    expect(screen.queryByText('Sasa — 1B')).not.toBeInTheDocument()
    expect(screen.getByText('Budi — 1A')).toBeInTheDocument()
  })

  it('collapses and expands a class section', () => {
    render(<StudentList students={students} onDelete={() => {}} onUpdate={() => {}} />)
    fireEvent.click(screen.getByText('1A · 1 siswa'))
    expect(screen.queryByText('Budi — 1A')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('1A · 1 siswa'))
    expect(screen.getByText('Budi — 1A')).toBeInTheDocument()
  })

  it('requires confirmation before deleting', () => {
    const onDelete = vi.fn()
    render(<StudentList students={students} onDelete={onDelete} onUpdate={() => {}} />)
    // 1A (Budi) group renders first
    fireEvent.click(screen.getAllByText('Hapus')[0])
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Yakin?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Batal'))
    expect(screen.queryByText('Yakin?')).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('deletes after confirming', () => {
    const onDelete = vi.fn()
    render(<StudentList students={students} onDelete={onDelete} onUpdate={() => {}} />)
    fireEvent.click(screen.getAllByText('Hapus')[0])
    fireEvent.click(screen.getByText('Ya'))
    expect(onDelete).toHaveBeenCalledWith('2')
  })

  it('shows a pre-filled form on Edit and calls onUpdate on save', () => {
    const onUpdate = vi.fn()
    render(<StudentList students={students} onDelete={() => {}} onUpdate={onUpdate} />)
    fireEvent.click(screen.getAllByText('Edit')[0])
    const nameInput = screen.getByLabelText('Nama') as HTMLInputElement
    expect(nameInput.value).toBe('Budi')
    fireEvent.change(nameInput, { target: { value: 'Budi Baru' } })
    fireEvent.click(screen.getByText('Simpan'))
    expect(onUpdate).toHaveBeenCalledWith('2', 'Budi Baru', '1A')
  })

  it('passes classOptions through to the inline edit form', () => {
    render(
      <StudentList
        students={students}
        onDelete={() => {}}
        onUpdate={() => {}}
        classOptions={['1A', '1B']}
      />
    )
    fireEvent.click(screen.getAllByText('Edit')[0])
    const input = screen.getByLabelText('Kelas') as HTMLInputElement
    expect(input.getAttribute('list')).toBeTruthy()
  })
})
