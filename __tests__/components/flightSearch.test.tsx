
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"


// Mock API
jest.mock("@/lib/api", () => ({
  fetchHistoricalFlightData: jest.fn(),
  decryptFlightData: jest.fn(),
}))

import { fetchHistoricalFlightData, decryptFlightData } from "@/lib/api"
import { FlightSearch } from "@/components/flight-search"

describe("FlightSearch Component", () => {
  const mockOnFlightSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders all input fields and search button", () => {
    render(<FlightSearch onFlightSelect={mockOnFlightSelect} />)

    expect(screen.getByLabelText(/Flight Number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Carrier Code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/From Date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/To Date/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Search Flights/i })).toBeInTheDocument()
  })

  it("does not call API if inputs are empty", async () => {
    render(<FlightSearch onFlightSelect={mockOnFlightSelect} />)

    const button = screen.getByRole("button", { name: /Search Flights/i })
    await userEvent.click(button)

    expect(fetchHistoricalFlightData).not.toHaveBeenCalled()
  })

  it("calls API with input values when all fields are filled", async () => {
    ;(fetchHistoricalFlightData as jest.Mock).mockResolvedValue({ flightDetails: [] })

    render(<FlightSearch onFlightSelect={mockOnFlightSelect} />)

    await userEvent.type(screen.getByLabelText(/Flight Number/i), "3682")
    await userEvent.type(screen.getByLabelText(/Carrier Code/i), "UA")
    fireEvent.change(screen.getByLabelText(/From Date/i), { target: { value: "2025-09-10" } })
    fireEvent.change(screen.getByLabelText(/To Date/i), { target: { value: "2025-09-11" } })

    await userEvent.click(screen.getByRole("button", { name: /Search Flights/i }))

    await waitFor(() => {
      expect(fetchHistoricalFlightData).toHaveBeenCalledWith("3682", "UA", "2025-09-10", "2025-09-11")
    })
  })

  it("decrypts encrypted fields if present", async () => {
    ;(fetchHistoricalFlightData as jest.Mock).mockResolvedValue({
      flightDetails: [
        {
          marketedFlightSegments: [
            { marketingAirlineCode: "enc-UA", flightNumber: "enc-3682" },
          ],
        },
      ],
    })
    ;(decryptFlightData as jest.Mock).mockResolvedValue(["UA", "3682"])

    render(<FlightSearch onFlightSelect={mockOnFlightSelect} />)

    await userEvent.type(screen.getByLabelText(/Flight Number/i), "3682")
    await userEvent.type(screen.getByLabelText(/Carrier Code/i), "UA")
    fireEvent.change(screen.getByLabelText(/From Date/i), { target: { value: "2025-09-10" } })
    fireEvent.change(screen.getByLabelText(/To Date/i), { target: { value: "2025-09-11" } })

    await userEvent.click(screen.getByRole("button", { name: /Search Flights/i }))

    await waitFor(() => {
      expect(decryptFlightData).toHaveBeenCalledWith(["enc-UA", "enc-3682"])
    })
  })

  it("renders results and calls onFlightSelect when a card is clicked", async () => {
    const mockFlight = {
      carrierCode: "UA",
      flightNumber: "3682",
      status: { statusCode: "ON_TIME" },
      departureCity: "New York",
      departureAirport: "JFK",
      arrivalCity: "San Francisco",
      arrivalAirport: "SFO",
      utcTimes: {
        scheduledDeparture: "2025-09-10T14:00:00Z",
        scheduledArrival: "2025-09-10T18:00:00Z",
      },
      departureGate: "A1",
      arrivalGate: "B2",
    }

    ;(fetchHistoricalFlightData as jest.Mock).mockResolvedValue({
      flightDetails: [mockFlight],
    })

    render(<FlightSearch onFlightSelect={mockOnFlightSelect} />)

    await userEvent.type(screen.getByLabelText(/Flight Number/i), "3682")
    await userEvent.type(screen.getByLabelText(/Carrier Code/i), "UA")
    fireEvent.change(screen.getByLabelText(/From Date/i), { target: { value: "2025-09-10" } })
    fireEvent.change(screen.getByLabelText(/To Date/i), { target: { value: "2025-09-11" } })

    await userEvent.click(screen.getByRole("button", { name: /Search Flights/i }))

    const card = await screen.findByText(/UA 3682/i)
    expect(card).toBeInTheDocument()

    await userEvent.click(card)
    expect(mockOnFlightSelect).toHaveBeenCalledWith(mockFlight)
  })
})
