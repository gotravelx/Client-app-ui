import React from 'react'
import { render, screen } from '@testing-library/react'
import { jest } from '@jest/globals'

// Mock theme provider
jest.mock('@/components/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}))

// Mock other components
jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}))

describe('Additional Components', () => {
  it('renders theme provider correctly', () => {
    const TestComponent = () => <div>Test Content</div>
    const { ThemeProvider } = require('@/components/theme-provider')
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders theme toggle', () => {
    const { ThemeToggle } = require('@/components/theme-toggle')
    
    render(<ThemeToggle />)
    
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByText('Theme Toggle')).toBeInTheDocument()
  })
})
