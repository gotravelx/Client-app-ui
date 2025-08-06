import { render, screen, fireEvent } from "@testing-library/react"
import { Navbar } from "@/components/navbar"

// Mock the theme toggle component
jest.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button>Theme Toggle</button>,
}))

describe("Navbar", () => {
  const defaultProps = {
    isConnected: false,
    lastUpdate: null,
    onRefresh: jest.fn(),
    refreshing: false,
    showRefresh: false,
    lastRefresh: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.location.href
    window.location.href = ""
  })

  it("renders the GoTravelX logo and title", () => {
    render(<Navbar {...defaultProps} />)

    expect(screen.getByText("GoTravelX")).toBeInTheDocument()
    expect(screen.getByText("Client-realtime-app")).toBeInTheDocument()
  })

  it("shows connected status when isConnected is true", () => {
    render(<Navbar {...defaultProps} isConnected={true} />)

    expect(screen.getByText("Connected")).toBeInTheDocument()
    // Check for Wifi icon by looking for svg with specific class
    const wifiIcon = document.querySelector(".lucide-wifi")
    expect(wifiIcon).toBeInTheDocument()
  })

  it("shows disconnected status when isConnected is false", () => {
    render(<Navbar {...defaultProps} isConnected={false} />)

    expect(screen.getByText("Disconnected")).toBeInTheDocument()
    // Check for WifiOff icon
    const wifiOffIcon = document.querySelector(".lucide-wifi-off")
    expect(wifiOffIcon).toBeInTheDocument()
  })

  it("displays last update time when provided", () => {
    const lastUpdate = new Date("2024-01-15T10:30:00Z")
    render(<Navbar {...defaultProps} lastUpdate={lastUpdate} />)

    expect(screen.getByText(/Last:/)).toBeInTheDocument()
  })

  it("shows refresh button when showRefresh is true", () => {
    render(<Navbar {...defaultProps} showRefresh={true} />)

    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument()
  })

  it("calls onRefresh when refresh button is clicked", () => {
    const mockOnRefresh = jest.fn()
    render(<Navbar {...defaultProps} showRefresh={true} onRefresh={mockOnRefresh} />)

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    fireEvent.click(refreshButton)

    expect(mockOnRefresh).toHaveBeenCalledTimes(1)
  })

  it("disables refresh button when refreshing", () => {
    render(<Navbar {...defaultProps} showRefresh={true} refreshing={true} />)

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    expect(refreshButton).toBeDisabled()
  })

  it("shows spinning icon when refreshing", () => {
    render(<Navbar {...defaultProps} showRefresh={true} refreshing={true} />)

    const refreshIcon = document.querySelector(".animate-spin")
    expect(refreshIcon).toBeInTheDocument()
  })

  it("displays contract address link", () => {
    render(<Navbar {...defaultProps} />)

    const contractLink = screen.getByRole("link")
    expect(contractLink).toHaveAttribute("href", expect.stringContaining("caminoscan.com"))
    expect(contractLink).toHaveAttribute("target", "_blank")
  })

  it("displays last refresh time when provided", () => {
    const lastRefresh = new Date("2024-01-15T10:35:00Z")
    render(<Navbar {...defaultProps} showRefresh={true} lastRefresh={lastRefresh} />)

    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
  })

  it("redirects to main app when logo is clicked", () => {
    render(<Navbar {...defaultProps} />)

    const logo = screen.getByText("GoTravelX")
    fireEvent.click(logo)

    expect(window.location.href).toBe("https://dev.gotravelx.com")
  })

  it("renders theme toggle component", () => {
    render(<Navbar {...defaultProps} />)

    expect(screen.getByText("Theme Toggle")).toBeInTheDocument()
  })
})
