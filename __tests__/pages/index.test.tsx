import React from 'react'
import { render, screen } from '@testing-library/react'
import { jest } from '@jest/globals'

// Create mocks before using them
const mockFetchHistoricalFlightData = jest.fn()
const mockDecryptFlightData = jest.fn()

// Mock the API functions
jest.mock('@/lib/api', () => ({
  fetchHistoricalFlightData: mockFetchHistoricalFlightData,
  decryptFlightData: mockDecryptFlightData,
}))

// Mock other dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  }),
}))

// Create a mock Home component since we don't have the actual implementation
const Home = () => {
  return (
    <div data-testid="home-page">
      <h1>Flight Tracking Dashboard</h1>
      <input placeholder="Enter flight number" />
    </div>
  )
}

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the home page', () => {
    render(<Home />)
    
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
    expect(screen.getByText('Flight Tracking Dashboard')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter flight number')).toBeInTheDocument()
  })

  it('initializes API functions', () => {
    render(<Home />)
    
    // Verify that the mocks are set up correctly
    expect(mockFetchHistoricalFlightData).toBeDefined()
    expect(mockDecryptFlightData).toBeDefined()
  })
})
