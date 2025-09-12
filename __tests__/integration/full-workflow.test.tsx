import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Declare as let (not const) so we can assign before each test
let mockFetchHistoricalFlightData: jest.Mock;
let mockDecryptFlightData: jest.Mock;

jest.mock("@/lib/api", () => ({
  fetchHistoricalFlightData: (...args: any[]) =>
    mockFetchHistoricalFlightData?.(...args),
  decryptFlightData: (...args: any[]) =>
    mockDecryptFlightData?.(...args),
}));

let mockUseBlockchainConnection: jest.Mock;

jest.mock("@/hooks/use-blockchain-connection", () => ({
  useBlockchainConnection: (...args: any[]) =>
    mockUseBlockchainConnection?.(...args),
}));

describe("Full Application Workflow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchHistoricalFlightData = jest.fn();
    mockDecryptFlightData = jest.fn();

    mockUseBlockchainConnection = jest.fn().mockReturnValue({
      isConnected: true,
      lastUpdate: new Date(),
      events: [],
    });

    mockFetchHistoricalFlightData.mockResolvedValue({
      flightDetails: [
        {
          flightNumber: "3682",
          carrierCode: "UA",
          departureAirport: "SFO",
          arrivalAirport: "LAX",
          departureCity: "San Francisco",
          arrivalCity: "Los Angeles",
          status: { statusCode: "ONT" },
          utcTimes: {
            scheduledDeparture: "2024-01-01T10:00:00Z",
            scheduledArrival: "2024-01-01T12:00:00Z",
          },
        },
      ],
    });
  });

  it("completes full flight search and display workflow", async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<Home />);
    });

    // 1. User sees initial page
    expect(screen.getByText("GoTravelX")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter flight number UA3682")
    ).toBeInTheDocument();

    // 2. User searches for a flight
    const searchInput = screen.getByPlaceholderText(
      "Enter flight number UA3682"
    );
    
    await act(async () => {
      await user.type(searchInput, "UA3682");
    });
    
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // 3. API is called with correct parameters
    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalledWith(
        "3682",
        "UA",
        expect.any(String),
        expect.any(String)
      );
    });

    // 4. Flight information is displayed
    await waitFor(() => {
      expect(screen.getByText("UA 3682")).toBeInTheDocument();
      expect(screen.getAllByText("SFO").length).toBeGreaterThan(0);
      expect(screen.getAllByText("LAX").length).toBeGreaterThan(0);
    });

    // 5. Historical data button appears
    expect(
      screen.getByText("View Historical Data (Last 30 Days)")
    ).toBeInTheDocument();

    // 6. User can navigate to historical data
    const historyButton = screen.getByText(
      "View Historical Data (Last 30 Days)"
    );
    
    await act(async () => {
      await user.click(historyButton);
    });

    expect(mockPush).toHaveBeenCalledWith("/history?flightNumber=UA3682");
  });

  it("handles blockchain events during flight tracking", async () => {
    const user = userEvent.setup();

    // Mock blockchain events
    mockUseBlockchainConnection.mockReturnValue({
      isConnected: true,
      lastUpdate: new Date(),
      events: [
        {
          flightNumber: "UA3682",
          type: "Flight Event",
          timestamp: new Date().toISOString(),
          description: "Flight departed gate",
        },
      ],
    });

    await act(async () => {
      render(<Home />);
    });

    // Search for flight
    const searchInput = screen.getByPlaceholderText(
      "Enter flight number UA3682"
    );
    
    await act(async () => {
      await user.type(searchInput, "UA3682");
    });
    
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Wait for flight data to load
    await waitFor(() => {
      expect(screen.getByText("UA 3682")).toBeInTheDocument();
    });

    // Expand details to see blockchain events
    const detailsButton = screen.getByText("See Details");
    
    await act(async () => {
      await user.click(detailsButton);
    });

    // Should show blockchain updates
    await waitFor(() => {
      expect(screen.getByText("Live Blockchain Updates")).toBeInTheDocument();
    });
  });

  it("handles search errors gracefully", async () => {
    const user = userEvent.setup();
    mockFetchHistoricalFlightData.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<Home />);
    });

    const searchInput = screen.getByPlaceholderText(
      "Enter flight number UA3682"
    );
    
    await act(async () => {
      await user.type(searchInput, "INVALID");
    });
    
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Should handle error without crashing
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /search/i })
      ).not.toBeDisabled();
    });

    // Should not show flight card
    expect(screen.queryByText("INVALID")).not.toBeInTheDocument();
  });

  // it("supports multiple flight searches in sequence", async () => {
  //   const user = userEvent.setup();
    
  //   await act(async () => {
  //     render(<Home />);
  //   });

  //   // First search
  //   const searchInput = screen.getByPlaceholderText(
  //     "Enter flight number UA3682"
  //   );
    
  //   await act(async () => {
  //     await user.type(searchInput, "UA3682");
  //   });
    
  //   await act(async () => {
  //     await user.keyboard("{Enter}");
  //   });

  //   await waitFor(() => {
  //     expect(screen.getByText("UA 3682")).toBeInTheDocument();
  //   });

  //   // Clear and search again
  //   await act(async () => {
  //     await user.clear(searchInput);
  //   });

  //   // Mock different flight data
  //   mockFetchHistoricalFlightData.mockResolvedValue({
  //     flightDetails: [
  //       {
  //         flightNumber: "123",
  //         carrierCode: "AA",
  //         departureAirport: "JFK",
  //         arrivalAirport: "LAX",
  //         status: { statusCode: "DLY" },
  //         utcTimes: {
  //           scheduledDeparture: "2024-01-01T14:00:00Z",
  //           scheduledArrival: "2024-01-01T17:00:00Z",
  //         },
  //       },
  //     ],
  //   });

  //   await act(async () => {
  //     await user.type(searchInput, "AA123");
  //   });
    
  //   await act(async () => {
  //     await user.keyboard("{Enter}");
  //   });

  //   await waitFor(() => {
  //     expect(screen.getByText("AA 123")).toBeInTheDocument();
  //     expect(screen.getAllByText("JFK").length).toBeGreaterThan(0);
  //   });
  // });

  it("maintains connection status throughout workflow", async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<Home />);
    });

    // Should show connected status
    expect(screen.getByText("Connected")).toBeInTheDocument();

    // Perform search
    const searchInput = screen.getByPlaceholderText(
      "Enter flight number UA3682"
    );
    
    await act(async () => {
      await user.type(searchInput, "UA3682");
    });
    
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Connection status should persist
    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });
});