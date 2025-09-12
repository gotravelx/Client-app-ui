// __tests__/components/ThemeToggle.test.tsx
import { ThemeToggle } from "@/components/theme-toggle"
import { render, screen, fireEvent } from "@testing-library/react"

// Create a mock for setTheme
const setThemeMock = jest.fn()

// Mock next-themes once
jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}))

import { useTheme } from "next-themes"

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders Sun and Moon icons", () => {
    // Mock theme as light
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      setTheme: setThemeMock,
    })

    render(<ThemeToggle />)
    expect(screen.getByRole("button")).toBeInTheDocument()
    expect(screen.getByText("Toggle theme")).toBeInTheDocument()
  })

  it("calls setTheme with 'dark' when current theme is 'light'", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      setTheme: setThemeMock,
    })

    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button"))
    expect(setThemeMock).toHaveBeenCalledWith("dark")
  })

  it("calls setTheme with 'light' when current theme is 'dark'", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      setTheme: setThemeMock,
    })

    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button"))
    expect(setThemeMock).toHaveBeenCalledWith("light")
  })
})
