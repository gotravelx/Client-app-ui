import { render, screen } from "@testing-library/react"
import { ConnectionStatus } from "@/components/connection-status"
import { jest } from "@jest/globals"

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Wifi: ({ className, ...props }: any) => <div className={className} {...props} />,
  WifiOff: ({ className, ...props }: any) => <div className={className} {...props} />,
  Clock: ({ className, ...props }: any) => <div className={className} {...props} />,
}))

describe("ConnectionStatus", () => {
  it("renders connected state correctly", () => {
    const lastUpdate = new Date("2024-01-01T10:00:00Z")
    render(<ConnectionStatus isConnected={true} lastUpdate={lastUpdate} />)

    expect(screen.getByText("Connected to Blockchain")).toBeInTheDocument()
  })

  it("renders disconnected state correctly", () => {
    render(<ConnectionStatus isConnected={false} lastUpdate={null} />)

    expect(screen.getByText("Disconnected")).toBeInTheDocument()
  })

  it("displays last update time when connected", () => {
    const lastUpdate = new Date("2024-01-01T10:00:00Z")
    render(<ConnectionStatus isConnected={true} lastUpdate={lastUpdate} />)

    expect(screen.getByText(/Last update:/)).toBeInTheDocument()
  })

  it("does not show last update when disconnected", () => {
    render(<ConnectionStatus isConnected={false} lastUpdate={null} />)

    expect(screen.queryByText(/Last update:/)).not.toBeInTheDocument()
  })

  it("handles null lastUpdate gracefully", () => {
    render(<ConnectionStatus isConnected={true} lastUpdate={null} />)

    expect(screen.getByText("Connected to Blockchain")).toBeInTheDocument()
    expect(screen.queryByText(/Last update:/)).not.toBeInTheDocument()
  })

  it("formats timestamp correctly", () => {
    const lastUpdate = new Date("2024-01-01T10:30:45Z")
    render(<ConnectionStatus isConnected={true} lastUpdate={lastUpdate} />)

    expect(screen.getByText(/Last update:/)).toBeInTheDocument()
  })

  it("displays connection status text correctly", () => {
    const lastUpdate = new Date("2024-01-01T10:00:00Z")
    render(<ConnectionStatus isConnected={true} lastUpdate={lastUpdate} />)

    expect(screen.getByText("Connected to Blockchain")).toBeInTheDocument()
  })

  it("displays disconnection status text correctly", () => {
    render(<ConnectionStatus isConnected={false} lastUpdate={null} />)

    expect(screen.getByText("Disconnected")).toBeInTheDocument()
  })
})
