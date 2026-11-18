import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { PhoneInput } from './PhoneInput'

function mount(initial = '', required = false) {
  const save = vi.fn()
  function Form() {
    const [value, setValue] = useState(initial)
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save(value)
        }}
      >
        <label htmlFor="phone">Phone number</label>
        <PhoneInput id="phone" value={value} onValueChange={setValue} required={required} />
        <button>Save</button>
      </form>
    )
  }
  render(<Form />)
  return save
}

it.each(['09171234567', '+639171234567', '639171234567'])(
  'displays %s with a fixed country code and ten national digits',
  (phone) => {
    mount(phone)
    expect(screen.getByText('+63')).toBeTruthy()
    expect((screen.getByLabelText('Phone number') as HTMLInputElement).value).toBe('9171234567')
  },
)

it.each([false, true])(
  'treats blank optional/required phones correctly (required=%s)',
  async (required) => {
    const save = mount('', required)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).toHaveBeenCalledTimes(required ? 0 : 1)
    await userEvent.type(screen.getByLabelText('Phone number'), '9171234567')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).toHaveBeenLastCalledWith('+639171234567')
  },
)

it.each([
  ['91712345678', '', 'Enter 10 digits after +63.'],
  ['917abc1234567', '', 'Enter a valid Philippine mobile number.'],
  ['91712', '91712', 'Enter 10 digits after +63.'],
])(
  'rejects invalid mobile input %s without manufacturing a valid number',
  async (value, displayed, message) => {
    const save = mount()
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value } })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Phone number') as HTMLInputElement).value).toBe(displayed)
    expect(screen.getByRole('alert').textContent).toBe(message)
  },
)

it('preserves a saved landline and permits entering a new landline explicitly', async () => {
  const save = mount('(02) 8123 4567')
  expect((screen.getByLabelText('Phone number') as HTMLInputElement).value).toBe('(02) 8123 4567')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(save).toHaveBeenLastCalledWith('(02) 8123 4567')
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '' } })
  await userEvent.type(screen.getByLabelText('Phone number'), '+1 (415) 555-2671')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(save).toHaveBeenLastCalledWith('+1 (415) 555-2671')
})

it('requires a nonblank phone in the alternate entry mode only when the caller requires it', async () => {
  const save = mount('', true)
  await userEvent.click(screen.getByRole('button', { name: 'Use landline / other number' }))
  await userEvent.type(screen.getByLabelText('Phone number'), '   ')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(save).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('required')
})
