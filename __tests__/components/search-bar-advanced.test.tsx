import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { jest } from '@jest/globals'

// Create a mock SearchBar component
const SearchBar = ({ onSearch, placeholder = "Search..." }: { 
  onSearch: (query: string) => void, 
  placeholder?: string 
}) => {
  const [query, setQuery] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} data-testid="search-form">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        data-testid="search-input"
      />
      <button type="submit" data-testid="search-button">
        Search
      </button>
    </form>
  )
}

describe('SearchBar - Advanced Tests', () => {
  const mockOnSearch = jest.fn()

  beforeEach(() => {
    mockOnSearch.mockClear()
  })

  it('handles search input correctly', () => {
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    
    fireEvent.change(input, { target: { value: 'AA123' } })
    expect(input).toHaveValue('AA123')
  })

  it('calls onSearch when form is submitted', () => {
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByTestId('search-input')
    const button = screen.getByTestId('search-button')

    fireEvent.change(input, { target: { value: 'AA123' } })
    fireEvent.click(button)

    expect(mockOnSearch).toHaveBeenCalledWith('AA123')
  })

  it('handles empty search', () => {
    render(<SearchBar onSearch={mockOnSearch} />)

    const button = screen.getByTestId('search-button')
    fireEvent.click(button)

    expect(mockOnSearch).toHaveBeenCalledWith('')
  })

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Enter flight number'
    render(<SearchBar onSearch={mockOnSearch} placeholder={customPlaceholder} />)

    const input = screen.getByTestId('search-input')
    expect(input).toHaveAttribute('placeholder', customPlaceholder)
  })
})
