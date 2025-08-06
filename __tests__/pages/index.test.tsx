import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import FlightTrackingDashboard from "@/app/page"

// Mock the API functions
const mockFetchHistoricalFlightData = jest.fn()
const mockDecryptFlightData = jest.fn()

jest.mock("@/lib/api", () => ({
  fetchHistoricalFlightData: mockFetchHistoricalFlightData,
  decryptFlightData: mockDecryptFlightData,
}))

// Mock the blockchain connection hook
jest.mock("@/hooks/use-blockchain-connection", () => ({
  useBlockchainConnection: () => ({
    isConnected: false,
    lastUpdate: null,
    events: [],
  }),
}))

describe("FlightTrackingDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchHistoricalFlightData.mockClear()
    mockDecryptFlightData.mockClear()
  })

  it("renders the main dashboard components", () => {
    render(<FlightTrackingDashboard />)

    expect(screen.getByText("GoTravelX")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Enter flight number UA3682")).toBeInTheDocument()
    expect(screen.getByText("Search flights and track real-time updates from blockchain")).toBeInTheDocument()
  })

  it("searches for flight data when form is submitted", async () => {
    const mockFlightData = {
      flightDetails: [
        {
          flightNumber: "3682",
          carrierCode: "UA",
          departureAirport: "SFO",
          arrivalAirport: "LAX",
          departureCity: "San Francisco",
          arrivalCity: "Los Angeles",
          scheduledDepartureDate: "2024-01-15",
          utcTimes: {
            scheduledDeparture: "2024-01-15T10:00:00Z",
            scheduledArrival: "2024-01-15T12:00:00Z",
          },
          status: {
            statusCode: "ONT",
          },
        },
      ],
    }

    mockFetchHistoricalFlightData.mockResolvedValueOnce(mockFlightData)
    mockDecryptFlightData.mockResolvedValueOnce([])

    const user = userEvent.setup()
    render(<FlightTrackingDashboard />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    const searchButton = screen.getByRole("button", { type: "submit" })

    await user.type(input, "UA3682")
    await user.click(searchButton)

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalledWith("3682", "UA", expect.any(String), expect.any(String))
    })
  })

  it("displays flight card when flight data is found", async () => {
    const mockFlightData = {
      flightDetails: [
        {
          flightNumber: "3682",
          carrierCode: "UA",
          departureAirport: "SFO",
          arrivalAirport: "LAX",
          departureCity: "San Francisco",
          arrivalCity: "Los Angeles",
          scheduledDepartureDate: "2024-01-15",
          utcTimes: {
            scheduledDeparture: "2024-01-15T10:00:00Z",
            scheduledArrival: "2024-01-15T12:00:00Z",
          },
          status: {
            statusCode: "ONT",
          },
        },
      ],
    }

    mockFetchHistoricalFlightData.mockResolvedValueOnce(mockFlightData)
    mockDecryptFlightData.mockResolvedValueOnce([])

    const user = userEvent.setup()
    render(<FlightTrackingDashboard />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    await user.type(input, "UA3682")

    const searchButton = screen.getByRole("button", { type: "submit" })
    await user.click(searchButton)

    await waitFor(() => {
      expect(screen.getByText("UA 3682")).toBeInTheDocument()
      expect(screen.getByText("SFO")).toBeInTheDocument()
      expect(screen.getByText("LAX")).toBeInTheDocument()
    })
  })

  it("shows loading state during search", async () => {
    mockFetchHistoricalFlightData.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

    const user = userEvent.setup()
    render(<FlightTrackingDashboard />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    await user.type(input, "UA3682")

    const searchButton = screen.getByRole("button", { type: "submit" })
    await user.click(searchButton)

    expect(searchButton).toBeDisabled()
    expect(input).toBeDisabled()
  })

  it("handles search errors gracefully", async () => {
    mockFetchHistoricalFlightData.mockRejectedValueOnce(new Error("API Error"))

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    const user = userEvent.setup()
    render(<FlightTrackingDashboard />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    await user.type(input, "UA3682")

    const searchButton = screen.getByRole("button", { type: "submit" })
    await user.click(searchButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Search failed:", expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it("handles empty search results", async () => {
    mockFetchHistoricalFlightData.mockResolvedValueOnce({ flightDetails: [] })
    mockDecryptFlightData.mockResolvedValueOnce([])

    const user = userEvent.setup()
    render(<FlightTrackingDashboard />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    await user.type(input, "UA3682")

    const searchButton = screen.getByRole("button", { type: "submit" })
    await user.click(searchButton)

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalled()
    })

    // Should not display flight card for empty results
    expect(screen.queryByText("UA 3682")).not.toBeInTheDocument()
  })

  it("displays historical data button when flight is found", async () => {
    const mockFlightData = {
      flightDetails: [
        {
          flightNumber: "3682",
          carrierCode: "UA",
          departureAirport: "SFO",
          arrivalAirport: "LAX",
          departureCity: "San Francisco",
          arrivalCity: "Los Angeles",
          scheduledDepartureDate: "2024-01-15",
          utcTimes: {
            scheduledDeparture: "2024-01-15T10:00:00Z",
            scheduledArrival: "2024-01-15T12:00:00Z",
          },
          status: {
            statusCode: "ONT",
          },
        },
      ],
    }

    mockFetchHistoricalFlightData.mockResolvedValueOnce(mockFlightData)
    mockDecryptFlightData.mockResolvedValueOnce([])

    const user = userEvent.setup()
    render(<FlightTrackingDashboard />)

    const input = screen.getByPlaceholderText("Enter flight number UA3682")
    await user.type(input, "UA3682")

    const searchButton = screen.getByRole("button", { type: "submit" })
    await user.click(searchButton)

    await waitFor(() => {
      expect(screen.getByText("View Historical Data (Last 30 Days)")).toBeInTheDocument()
    })
  })
})
