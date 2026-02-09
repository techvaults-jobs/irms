import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/Button'

describe('Button Component', () => {
  it('renders with primary variant by default', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toHaveClass('bg-primary-500')
  })

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button', { name: /secondary/i })
    expect(button).toHaveClass('bg-secondary-100')
  })

  it('renders with outlined variant', () => {
    render(<Button variant="outlined">Outlined</Button>)
    const button = screen.getByRole('button', { name: /outlined/i })
    expect(button).toHaveClass('border-2')
    expect(button).toHaveClass('border-primary-500')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button', { name: /small/i })
    expect(button).toHaveClass('px-3')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button', { name: /large/i })
    expect(button).toHaveClass('px-8')
  })

  it('renders full width when specified', () => {
    render(<Button fullWidth>Full Width</Button>)
    const button = screen.getByRole('button', { name: /full width/i })
    expect(button).toHaveClass('w-full')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: /disabled/i })
    expect(button).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with icon', () => {
    render(<Button icon={<span data-testid="icon">🎯</span>}>With Icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    const button = screen.getByRole('button', { name: /click/i })
    await userEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveClass('bg-red-500')
  })

  it('renders success variant', () => {
    render(<Button variant="success">Confirm</Button>)
    const button = screen.getByRole('button', { name: /confirm/i })
    expect(button).toHaveClass('bg-green-500')
  })
})
