import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import FlightTrackingDashboard from "@/app/page";

// Mock data
const mockFlightData = {
  flightDetails: [
    {
      flightNumber: "UA3682",
      airline: "United Airlines",
      departure: "2025-09-11T14:00:00Z",
      arrival: "2025-09-11T17:00:00Z",
      status: "Scheduled",
      marketedFlightSegments: [
        {
          marketingAirlineCode: "UA",
          flightNumber: "3682",
        },
      ],
    },
  ],
};

const mockFlightDataWithEncryption = {
  flightDetails: [
    {
      flightNumber: "DL1234",
      airline: "Delta Airlines",
      marketedFlightSegments: [
        {
          marketingAirlineCode: "encrypted_code",
          flightNumber: "encrypted_flight",
        },
      ],
    },
  ],
};

const mockEvents = [
  {
    flightNumber: "UA3682",
    description: "Flight delayed",
    timestamp: "2025-09-11T13:00:00Z",
  },
];

// Create mock functions
const mockFetchHistoricalFlightData = jest.fn();
const mockDecryptFlightData = jest.fn();
const mockUseBlockchainConnection = jest.fn();
const mockPush = jest.fn();

// Mock modules
jest.mock("@/lib/api", () => ({
  fetchHistoricalFlightData: (...args: any[]) => mockFetchHistoricalFlightData(...args),
  decryptFlightData: (...args: any[]) => mockDecryptFlightData(...args),
}));

jest.mock("@/hooks/use-blockchain-connection", () => ({
  useBlockchainConnection: () => mockUseBlockchainConnection(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    forward: jest.fn(),
  }),
}));

// Mock components using simple functional components
jest.mock("@/components/flight-card", () => ({
  FlightCard: ({ flight, events }: { flight: any; events: any[] }) => (
    <div data-testid="flight-card">
      <div data-testid="flight-number">{flight.flightNumber}</div>
      <div data-testid="airline">{flight.airline}</div>
      <div data-testid="filtered-events">{events?.length || 0} events</div>
    </div>
  ),
}));

jest.mock("@/components/search-bar", () => ({
  SearchBar: ({ onSearch, loading }: { onSearch: (query: string) => void; loading: boolean }) => {
    const [value, setValue] = React.useState("");
    
    const handleSubmit = () => {
      if (value.trim()) {
        onSearch(value.trim());
      }
    };

    return (
      <div data-testid="search-bar">
        <input
          data-testid="search-input"
          placeholder="Enter flight number"
          disabled={loading}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
        <button
          data-testid="search-button"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        {loading && <div data-testid="loading-spinner">Loading...</div>}
      </div>
    );
  },
}));

jest.mock("@/components/navbar", () => ({
  Navbar: ({ 
    isConnected, 
    onRefresh, 
    refreshing, 
    showRefresh, 
    lastRefresh 
  }: {
    isConnected: boolean;
    onRefresh: () => void;
    refreshing: boolean;
    showRefresh: boolean;
    lastRefresh: Date | null;
  }) => (
    <div data-testid="navbar">
      <div data-testid="connection-status">Connected: {isConnected.toString()}</div>
      {showRefresh && (
        <button
          data-testid="refresh-button"
          disabled={refreshing}
          onClick={onRefresh}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      )}
      {lastRefresh && <div data-testid="last-refresh">{lastRefresh.toISOString()}</div>}
    </div>
  ),
}));

describe("FlightTrackingDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Set default mock return values
    mockFetchHistoricalFlightData.mockResolvedValue(mockFlightData);
    mockDecryptFlightData.mockResolvedValue(["UA", "3682"]);
    mockUseBlockchainConnection.mockReturnValue({
      isConnected: true,
      lastUpdate: new Date(),
      events: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders initial components correctly", () => {
    render(<FlightTrackingDashboard />);
    
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    expect(screen.getByText("Search flights and track real-time updates from blockchain")).toBeInTheDocument();
  });

  it("displays flight card after successful search", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("flight-number")).toHaveTextContent("UA3682");
    expect(screen.getByText("View Historical Data (Last 30 Days)")).toBeInTheDocument();
  });

  it("shows loading state during search", async () => {
    let resolvePromise: (value: any) => void;
    mockFetchHistoricalFlightData.mockImplementation(() => {
      return new Promise(resolve => {
        resolvePromise = resolve;
      });
    });

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.getByText("Searching...")).toBeInTheDocument();

    // Resolve the promise
    act(() => {
      resolvePromise!(mockFlightData);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
  });

  it("handles empty search input gracefully", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "   ");
    await user.keyboard("{Enter}");

    // Should not make API call or show flight card
    expect(mockFetchHistoricalFlightData).not.toHaveBeenCalled();
    expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    mockFetchHistoricalFlightData.mockRejectedValue(new Error("API Error"));

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
    });
  });

  it("handles no flight data found", async () => {
    mockFetchHistoricalFlightData.mockResolvedValue({ flightDetails: [] });

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "NOTFOUND123");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
    });
  });

  it("extracts carrier code and flight number correctly", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "DAL1234");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalledWith(
        "1234",
        "DAL",
        expect.any(String),
        expect.any(String)
      );
    });
  });

  it("falls back to blockchain event date when today's data not found", async () => {
    mockUseBlockchainConnection.mockReturnValue({
      isConnected: true,
      lastUpdate: new Date(),
      events: mockEvents,
    });

    mockFetchHistoricalFlightData
      .mockResolvedValueOnce({ flightDetails: [] })
      .mockResolvedValueOnce(mockFlightData);

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });
  });

  it("falls back to yesterday when today fails", async () => {
    mockFetchHistoricalFlightData
      .mockResolvedValueOnce({ flightDetails: [] })
      .mockResolvedValueOnce(mockFlightData);

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });
  });

  it("handles flight data decryption successfully", async () => {
    mockFetchHistoricalFlightData.mockResolvedValue(mockFlightDataWithEncryption);
    mockDecryptFlightData.mockResolvedValue(["DL", "1234"]);

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "DL1234");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockDecryptFlightData).toHaveBeenCalledWith(["encrypted_code", "encrypted_flight"]);
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });
  });

  it("handles decryption error gracefully", async () => {
    mockFetchHistoricalFlightData.mockResolvedValue(mockFlightDataWithEncryption);
    mockDecryptFlightData.mockRejectedValue(new Error("Decryption failed"));

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "DL1234");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });
  });

  it("refreshes flight data when refresh button is clicked", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    // First search
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });

    // Clear and setup for refresh
    mockFetchHistoricalFlightData.mockClear();

    // Click refresh
    const refreshButton = screen.getByTestId("refresh-button");
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalled();
    });
  });

  it("does not show refresh button when no flight number is set", () => {
    render(<FlightTrackingDashboard />);
    
    expect(screen.queryByTestId("refresh-button")).not.toBeInTheDocument();
  });

  it("redirects to historical data page", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("View Historical Data (Last 30 Days)")).toBeInTheDocument();
    });

    const historicalButton = screen.getByText("View Historical Data (Last 30 Days)");
    await user.click(historicalButton);

    expect(mockPush).toHaveBeenCalledWith("/history?flightNumber=UA3682");
  });

  it("handles search using search button", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    const searchButton = screen.getByTestId("search-button");
    
    await user.type(input, "UA3682");
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });
  });

  it("shows refresh state correctly", async () => {
    let resolveRefresh: (value: any) => void;
    
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    // Initial search
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });

    // Setup delayed response for refresh
    mockFetchHistoricalFlightData.mockImplementation(() => {
      return new Promise(resolve => {
        resolveRefresh = resolve;
      });
    });

    // Click refresh
    const refreshButton = screen.getByTestId("refresh-button");
    await user.click(refreshButton);

    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
    expect(refreshButton).toBeDisabled();

    // Resolve refresh
    act(() => {
      resolveRefresh!(mockFlightData);
    });

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });
  });

  it("handles blockchain connection state correctly", () => {
    mockUseBlockchainConnection.mockReturnValue({
      isConnected: false,
      lastUpdate: new Date("2025-09-11T12:00:00Z"),
      events: [],
    });
    
    render(<FlightTrackingDashboard />);
    
    expect(screen.getByTestId("connection-status")).toHaveTextContent("Connected: false");
  });

  it("filters events correctly for flight card", async () => {
    mockUseBlockchainConnection.mockReturnValue({
      isConnected: true,
      lastUpdate: new Date(),
      events: mockEvents,
    });
    
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
      expect(screen.getByTestId("filtered-events")).toHaveTextContent("1 events");
    });
  });

  it("handles 2-letter carrier codes", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "AA1234");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockFetchHistoricalFlightData).toHaveBeenCalledWith(
        "1234",
        "AA",
        expect.any(String),
        expect.any(String)
      );
    });
  });

  it("handles null API response", async () => {
    mockFetchHistoricalFlightData.mockResolvedValue(null);

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
    });
  });

  it("handles flight data without marketedFlightSegments", async () => {
    const simpleFlightData = {
      flightDetails: [
        {
          flightNumber: "UA3682",
          airline: "United Airlines",
          departure: "2025-09-11T14:00:00Z",
          arrival: "2025-09-11T17:00:00Z",
          status: "Scheduled",
        },
      ],
    };

    mockFetchHistoricalFlightData.mockResolvedValue(simpleFlightData);

    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
    });

    expect(mockDecryptFlightData).not.toHaveBeenCalled();
  });

  it("sets last refresh time after successful search", async () => {
    const user = userEvent.setup();
    render(<FlightTrackingDashboard />);
    
    const input = screen.getByTestId("search-input");
    
    await user.type(input, "UA3682");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("flight-card")).toBeInTheDocument();
      expect(screen.getByTestId("last-refresh")).toBeInTheDocument();
    });
  });
});