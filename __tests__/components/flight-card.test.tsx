// __tests__/flight-card.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlightCard } from "@/components/flight-card";
import { jest } from "@jest/globals";

// Mock moment-timezone to avoid timezone issues
jest.mock("moment-timezone", () => {
  const moment = jest.requireActual("moment") as any;
  const mockMoment = (date?: any) => {
    const m = moment(date);
    return {
      ...m,
      tz: jest.fn(() => ({
        ...m,
        format: jest.fn((format) => {
          if (format === "h:mm A") return "2:15 AM";
          if (format === "dddd DD-MMM-YYYY") return "Monday 01-Jan-2024";
          if (format === "z") return "PST";
          return "2024-01-01T02:15:00-08:00";
        }),
        isValid: jest.fn(() => true),
      })),
      utc: jest.fn(() => ({
        ...m,
        tz: jest.fn(() => ({
          ...m,
          format: jest.fn(() => "2:15 AM"),
          isValid: jest.fn(() => true),
        })),
        isValid: jest.fn(() => true),
        diff: jest.fn(() => 120), // 2 hours difference
        add: jest.fn(() => m),
        isAfter: jest.fn(() => false),
      })),
      duration: jest.fn(() => ({
        asHours: jest.fn(() => 2),
        minutes: jest.fn(() => 0),
      })),
      isValid: jest.fn(() => true),
    };
  };

  mockMoment.utc = jest.fn((date) => mockMoment(date));
  mockMoment.duration = jest.fn(() => ({
    asHours: jest.fn(() => 2),
    minutes: jest.fn(() => 0),
  }));

  return mockMoment;
});

describe("FlightCard", () => {
  const mockFlight = {
    flightNumber: "3682",
    carrierCode: "UA",
    departureAirport: "SFO",
    arrivalAirport: "LAX",
    departureCity: "San Francisco",
    arrivalCity: "Los Angeles",
    departureGate: "A12",
    arrivalGate: "B34",
    equipmentModel: "Boeing 737",
    status: {
      statusCode: "ONT",
      outUtc: "2024-01-01T10:15:00Z",
      offUtc: "2024-01-01T10:30:00Z",
      onUtc: "",
      inUtc: "",
    },
    utcTimes: {
      scheduledDeparture: "2024-01-01T10:00:00Z",
      scheduledArrival: "2024-01-01T12:00:00Z",
      estimatedDeparture: "2024-01-01T10:15:00Z",
      estimatedArrival: "2024-01-01T12:15:00Z",
    },
  };

  const mockEvents = [
    {
      type: "Flight Event",
      flightNumber: "UA3682",
      timestamp: "2024-01-01T10:00:00Z",
      description: "Flight departed gate",
    },
  ];

  it("renders flight information correctly", () => {
    render(<FlightCard flight={mockFlight} events={mockEvents} />);

    // Flight number
    expect(screen.getByText(/UA\s*3682/)).toBeInTheDocument();

    // Airports
    expect(screen.getAllByText("SFO")).toHaveLength(2);
    expect(screen.getAllByText("LAX")).toHaveLength(2);

    // Cities
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getAllByText("Los Angeles")).toHaveLength(3);
  });

  it("displays gate information", () => {
    render(<FlightCard flight={mockFlight} />);
    expect(screen.getByText(/Gate\s*A12/)).toBeInTheDocument();
    expect(screen.getByText(/Gate\s*B34/)).toBeInTheDocument();
  });

  it("shows flight status badge", () => {
    render(<FlightCard flight={mockFlight} />);
    expect(screen.getByText("On Time")).toBeInTheDocument();
  });

  it("displays departure and arrival times", () => {
    render(<FlightCard flight={mockFlight} />);
    expect(screen.getByText("Departure Times")).toBeInTheDocument();
    expect(screen.getByText("Arrival Times")).toBeInTheDocument();
    expect(screen.getAllByText("2:15 AM")).toHaveLength(2);
  });

  it("expands to show detailed timeline when clicked", async () => {
    const user = userEvent.setup();
    render(<FlightCard flight={mockFlight} />);

    const detailsButton = screen.getByText("See Details");
    await user.click(detailsButton);

    await waitFor(() =>
      expect(
        screen.getByText("Flight Timeline Events (OUT → OFF → ON → IN)")
      ).toBeInTheDocument()
    );
  });

  it("shows blockchain events when provided", async () => {
    const user = userEvent.setup();
    render(<FlightCard flight={mockFlight} events={mockEvents} />);

    const detailsButton = screen.getByText("See Details");
    await user.click(detailsButton);

    await waitFor(() =>
      expect(screen.getByText("Live Blockchain Updates")).toBeInTheDocument()
    );
  });

  it("handles cancelled flights correctly", () => {
    const cancelledFlight = {
      ...mockFlight,
      status: { statusCode: "CNCL" },
    };

    render(<FlightCard flight={cancelledFlight} />);
    expect(screen.getByText(/Cancelled/i)).toBeInTheDocument();
  });

  it("displays upcoming events badge", () => {
    const flightWithUpcomingEvents = {
      ...mockFlight,
      status: {
        statusCode: "NDPT",
        outUtc: "",
        offUtc: "",
        onUtc: "",
        inUtc: "",
      },
    };

    render(<FlightCard flight={flightWithUpcomingEvents} />);
    expect(screen.getByText("Not Departed")).toBeInTheDocument();
  });

  it("shows TBD for missing gate information", () => {
    const flightWithoutGates = {
      ...mockFlight,
      departureGate: null,
      arrivalGate: null,
    };

    render(<FlightCard flight={flightWithoutGates} />);
    expect(screen.getAllByText("Gate TBD")).toHaveLength(2);
  });
});
