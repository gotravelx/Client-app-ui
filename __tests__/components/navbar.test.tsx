import { render, screen, fireEvent } from "@testing-library/react"
import { Navbar } from "@/components/navbar"
import { CONTRACT_ADDRESS } from "@/lib/constants"

describe("Navbar Component", () => {
  const originalLocation = window.location

  beforeAll(() => {
    delete (window as any).location
    ;(window as any).location = { href: "" }
  })

  afterAll(() => {
    (window as any).location = originalLocation
  })

  it("renders app title and redirects on click", () => {
    render(<Navbar />)
    const title = screen.getByText("GoTravelX")
    fireEvent.click(title)
    expect(window.location.href).toBe("https://dev.gotravelx.com")
  })

  it("shows connected status with Wifi icon", () => {
    render(<Navbar isConnected={true} />)
    expect(screen.getByText("Connected")).toBeInTheDocument()
  })

  it("shows disconnected status with WifiOff icon", () => {
    render(<Navbar isConnected={false} />)
    expect(screen.getByText("Disconnected")).toBeInTheDocument()
  })

  it("renders last update time correctly", () => {
    const date = new Date("2025-09-12T10:05:30")
    render(<Navbar lastUpdate={date} isConnected={true} />)

    const formatted = date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    expect(screen.getByText(`Last: ${formatted}`)).toBeInTheDocument()
  })

  it("renders refresh button and triggers onRefresh", () => {
    const onRefresh = jest.fn()
    render(<Navbar showRefresh={true} onRefresh={onRefresh} />)

    const btn = screen.getByRole("button", { name: /Refresh/ })
    fireEvent.click(btn)
    expect(onRefresh).toHaveBeenCalled()
  })

  it("disables refresh button when refreshing", () => {
    render(<Navbar showRefresh={true} refreshing={true} onRefresh={jest.fn()} />)
    const btn = screen.getByRole("button", { name: /Refresh/ })
    expect(btn).toBeDisabled()
  })

  it("renders last refresh time correctly", () => {
    const date = new Date("2025-09-12T15:45:10")
    render(<Navbar showRefresh={true} lastRefresh={date} onRefresh={jest.fn()} />)

    const formatted = date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    expect(screen.getByText(`Updated: ${formatted}`)).toBeInTheDocument()
  })

  it("renders contract link with shortened address", () => {
    render(<Navbar />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute(
      "href",
      `https://columbus.caminoscan.com/address/${CONTRACT_ADDRESS}`
    )

    expect(link.textContent).toContain(CONTRACT_ADDRESS.substring(0, 6))
    expect(link.textContent).toContain(
      CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)
    )
  })
})
