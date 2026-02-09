import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/Input'

describe('Input Component', () => {
  it('renders basic input', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows required indicator when required', () => {
    render(<Input label="Email" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('displays helper text', () => {
    render(<Input helperText="Enter a valid email" />)
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
  })

  it('shows error styling when error prop is set', () => {
    render(<Input error="Error message" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-500')
  })

  it('shows focus styling', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('focus:border-primary-500')
    expect(input).toHaveClass('focus:ring-primary-100')
  })

  it('accepts input value', async () => {
    render(<Input />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    await userEvent.type(input, 'test value')
    expect(input.value).toBe('test value')
  })

  it('renders with icon', () => {
    render(<Input icon={<span data-testid="icon">📧</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })

  it('handles placeholder', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
  })

  it('handles disabled state', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('prefers error text over helper text', () => {
    render(<Input error="Error" helperText="Helper" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.queryByText('Helper')).not.toBeInTheDocument()
  })
})
