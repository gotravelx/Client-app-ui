import { render, screen } from "@testing-library/react"
import { FlightStatusBadge } from "@/components/flight-status-badge"

describe("FlightStatusBadge", () => {
  it('renders "Not Departed" for NDPT status', () => {
    render(<FlightStatusBadge status="NDPT" />)
    expect(screen.getByText("Not Departed")).toBeInTheDocument()
  })

  it('renders "Departed Gate" for OUT status', () => {
    render(<FlightStatusBadge status="OUT" />)
    expect(screen.getByText("Departed Gate")).toBeInTheDocument()
  })

  it('renders "In Flight" for OFF status', () => {
    render(<FlightStatusBadge status="OFF" />)
    expect(screen.getByText("In Flight")).toBeInTheDocument()
  })

  it('renders "Landed" for ON status', () => {
    render(<FlightStatusBadge status="ON" />)
    expect(screen.getByText("Landed")).toBeInTheDocument()
  })

  it('renders "Arrived" for IN status', () => {
    render(<FlightStatusBadge status="IN" />)
    expect(screen.getByText("Arrived")).toBeInTheDocument()
  })

  it('renders "Cancelled" for CNCL status', () => {
    render(<FlightStatusBadge status="CNCL" />)
    expect(screen.getByText("Cancelled")).toBeInTheDocument()
  })

  it('renders "Delayed" for DLY status', () => {
    render(<FlightStatusBadge status="DLY" />)
    expect(screen.getByText("Delayed")).toBeInTheDocument()
  })

  it('renders "On Time" for ONT status', () => {
    render(<FlightStatusBadge status="ONT" />)
    expect(screen.getByText("On Time")).toBeInTheDocument()
  })

  it("renders the status as-is for unknown status codes", () => {
    render(<FlightStatusBadge status="UNKNOWN" />)
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument()
  })

  it("applies destructive variant for cancelled status", () => {
    render(<FlightStatusBadge status="CNCL" />)
    const badge = screen.getByText("Cancelled")
    expect(badge).toHaveClass("bg-destructive")
  })

  it("applies destructive variant for delayed status", () => {
    render(<FlightStatusBadge status="DLY" />)
    const badge = screen.getByText("Delayed")
    expect(badge).toHaveClass("bg-destructive")
  })

  it("applies default variant for normal statuses", () => {
    render(<FlightStatusBadge status="OUT" />)
    const badge = screen.getByText("Departed Gate")
    expect(badge).toHaveClass("bg-primary")
  })
})
