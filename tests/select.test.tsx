import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '@/components/ui/select'

describe('custom Select', () => {
  it('opens, selects an option and closes', async () => {
    const user = userEvent.setup()
    let selected = 'dark'
    const options = [
      { value: 'dark', label: 'Modalità scura' },
      { value: 'light', label: 'Modalità chiara' },
    ]
    const { rerender } = render(<Select value={selected} options={options} onChange={(value) => { selected = value }} />)

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('option', { name: 'Modalità chiara' })).toBeVisible()
    await user.click(screen.getByRole('option', { name: 'Modalità chiara' }))
    rerender(<Select value={selected} options={options} onChange={(value) => { selected = value }} />)

    expect(selected).toBe('light')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})
