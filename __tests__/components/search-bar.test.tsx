import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchBar } from "../../components/search-bar"
import '@testing-library/jest-dom'

describe("SearchBar", () => {
  const mockOnSearch = jest.fn()

  beforeEach(() => {
    mockOnSearch.mockClear()
  })

  it("renders search input and button", () => {
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    expect(screen.getByPlaceholderText("Enter flight number UA3682")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument()
  })

  it("calls onSearch with flight number when form is submitted", async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    const submitButton = screen.getByRole("button", { name: /search/i })

    await act(async () => {
      await user.type(input, "ua3682")
    })
    
    await act(async () => {
      await user.click(submitButton)
    })

    expect(mockOnSearch).toHaveBeenCalledWith("UA3682")
    expect(mockOnSearch).toHaveBeenCalledTimes(1)
  })

  it("calls onSearch when form is submitted with Enter key", async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")

    await act(async () => {
      await user.type(input, "ua1234")
    })
    
    await act(async () => {
      await user.keyboard("{Enter}")
    })

    expect(mockOnSearch).toHaveBeenCalledWith("UA1234")
    expect(mockOnSearch).toHaveBeenCalledTimes(1)
  })

  it("converts flight number to uppercase", async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")

    await act(async () => {
      await user.type(input, "ua3682")
    })
    
    await act(async () => {
      await user.keyboard("{Enter}")
    })

    expect(mockOnSearch).toHaveBeenCalledWith("UA3682")
  })

  it("does not call onSearch with empty flight number", async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    const submitButton = screen.getByRole("button", { name: /search/i })

    await act(async () => {
      await user.click(submitButton)
    })

    expect(mockOnSearch).not.toHaveBeenCalled()
  })

  it("disables input and button when loading", () => {
    render(<SearchBar onSearch={mockOnSearch} loading={true} />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    const submitButton = screen.getByRole("button", { name: /search/i })

    expect(input).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it("shows loading spinner when loading", () => {
    render(<SearchBar onSearch={mockOnSearch} loading={true} />)

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
  })

  it("shows search icon when not loading", () => {
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    expect(screen.getByTestId("search-icon")).toBeInTheDocument()
  })

  it("disables button when input is empty", async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    const submitButton = screen.getByRole("button", { name: /search/i })

    // Initially disabled when empty
    expect(submitButton).toBeDisabled()

    // Type something to enable
    await act(async () => {
      await user.type(input, "UA123")
    })
    expect(submitButton).not.toBeDisabled()

    // Clear input to disable again
    await act(async () => {
      await user.clear(input)
    })
    expect(submitButton).toBeDisabled()
  })

  it("trims whitespace from flight number", async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} loading={false} />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")

    await act(async () => {
      await user.type(input, "  ua3682  ")
    })
    
    await act(async () => {
      await user.keyboard("{Enter}")
    })

    expect(mockOnSearch).toHaveBeenCalledWith("UA3682")
  })
})
