import React from 'react'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/Card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styles', () => {
      render(<Card>Card content</Card>)
      const card = screen.getByText('Card content').closest('div')
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('elevation-1')
    })

    it('renders with hoverable prop', () => {
      render(<Card hoverable>Hoverable card</Card>)
      const card = screen.getByText('Hoverable card').closest('div')
      expect(card).toHaveClass('hover:elevation-3')
      expect(card).toHaveClass('cursor-pointer')
    })

    it('renders with elevated prop', () => {
      render(<Card elevated>Elevated card</Card>)
      const card = screen.getByText('Elevated card').closest('div')
      expect(card).toHaveClass('elevation-2')
    })

    it('accepts custom className', () => {
      render(<Card className="custom-class">Custom card</Card>)
      const card = screen.getByText('Custom card').closest('div')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('CardHeader', () => {
    it('renders with border bottom', () => {
      render(<CardHeader>Header</CardHeader>)
      const header = screen.getByText('Header').closest('div')
      expect(header).toHaveClass('border-b')
      expect(header).toHaveClass('border-secondary-100')
    })
  })

  describe('CardTitle', () => {
    it('renders as h2 with correct styles', () => {
      render(<CardTitle>Title</CardTitle>)
      const title = screen.getByText('Title')
      expect(title.tagName).toBe('H2')
      expect(title).toHaveClass('text-xl')
      expect(title).toHaveClass('font-semibold')
    })
  })

  describe('CardContent', () => {
    it('renders with space-y-4', () => {
      render(<CardContent>Content</CardContent>)
      const content = screen.getByText('Content').closest('div')
      expect(content).toHaveClass('space-y-4')
    })
  })

  describe('CardFooter', () => {
    it('renders with flex layout and border top', () => {
      render(<CardFooter>Footer</CardFooter>)
      const footer = screen.getByText('Footer').closest('div')
      expect(footer).toHaveClass('flex')
      expect(footer).toHaveClass('border-t')
      expect(footer).toHaveClass('gap-3')
    })
  })

  describe('Card composition', () => {
    it('renders complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>Content here</CardContent>
          <CardFooter>Footer here</CardFooter>
        </Card>
      )

      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('Content here')).toBeInTheDocument()
      expect(screen.getByText('Footer here')).toBeInTheDocument()
    })
  })
})
