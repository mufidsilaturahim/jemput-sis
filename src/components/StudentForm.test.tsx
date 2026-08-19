import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentForm } from './StudentForm'

describe('StudentForm', () => {
  it('shows an error and does not submit when fields are empty', () => {
    const onSubmit = vi.fn()
    render(<StudentForm submitLabel="Tambah" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByText('Tambah'))
    expect(screen.getByRole('alert')).toHaveTextContent('Nama dan kelas wajib diisi')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed name and class', () => {
    const onSubmit = vi.fn()
    render(<StudentForm submitLabel="Tambah" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: '  Sasa  ' } })
    fireEvent.change(screen.getByLabelText('Kelas'), { target: { value: ' 1B ' } })
    fireEvent.click(screen.getByText('Tambah'))
    expect(onSubmit).toHaveBeenCalledWith('Sasa', '1B')
  })

  it('pre-fills initial values for editing', () => {
    render(
      <StudentForm
        submitLabel="Simpan"
        initialName="Sasa"
        initialClass="1B"
        onSubmit={() => {}}
      />
    )
    expect((screen.getByLabelText('Nama') as HTMLInputElement).value).toBe('Sasa')
    expect((screen.getByLabelText('Kelas') as HTMLInputElement).value).toBe('1B')
  })
})
