import { FlightDetails } from "@/components/flight-details";
import { render, screen } from "@testing-library/react";

describe("FlightDetails branches", () => {
  it("returns null when no flight is provided", () => {
    const { container } = render(<FlightDetails flight={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders status details when flight.status is provided", () => {
    const flight = {
      carrierCode: "AI",
      flightNumber: "202",
      status: {
        statusDescription: "Departed",
        currentStatus: "Departed",
        departureState: "On Time",
        arrivalState: "Expected",
      },
    };

    render(<FlightDetails flight={flight} />);

    expect(screen.getByText("Status Details")).toBeInTheDocument();

    // FIX: "Departed" appears twice
    const departedTexts = screen.getAllByText("Departed");
    expect(departedTexts).toHaveLength(2);

    expect(screen.getByText("On Time")).toBeInTheDocument();
    expect(screen.getByText("Expected")).toBeInTheDocument();
  });

  it("renders status details when flight.status is provided", () => {
    const flight = {
      carrierCode: "AI",
      flightNumber: "202",
      status: {
        statusDescription: "Departed",
        departureState: "On Time",
        arrivalState: "Expected",
      },
    };
    render(<FlightDetails flight={flight} />);
    expect(screen.getByText("Status Details")).toBeInTheDocument();
    // FIX: multiple "Departed" values → assert count
    expect(screen.getAllByText("Departed")).toHaveLength(2);
    expect(screen.getByText("On Time")).toBeInTheDocument();
    expect(screen.getByText("Expected")).toBeInTheDocument();
  });

  it("renders without delay badge when delay = 0", () => {
    const flight = {
      carrierCode: "AI",
      flightNumber: "202",
      utcTimes: {
        estimatedDeparture: "10:00",
        departureDelayMinutes: "0",
      },
    };
    render(<FlightDetails flight={flight} />);
    expect(screen.queryByText(/delay/)).not.toBeInTheDocument();
  });

  it("renders with delay badge when delay > 0", () => {
    const flight = {
      carrierCode: "AI",
      flightNumber: "202",
      utcTimes: {
        estimatedDeparture: "10:30",
        departureDelayMinutes: "30",
      },
    };
    render(<FlightDetails flight={flight} />);
    expect(screen.getByText(/30min delay/)).toBeInTheDocument();
  });

  it("renders flight times with fallback values", () => {
    const flight = {
      carrierCode: "AI",
      flightNumber: "202",
      utcTimes: {}, // No times → fallback
    };
    render(<FlightDetails flight={flight} />);
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TBD").length).toBeGreaterThan(0);
  });

 it("renders status details when flight.status is provided", () => {
  const flight = {
    carrierCode: "AI",
    flightNumber: "202",
    status: {
      statusDescription: "Departed",
      currentStatus: "Departed",
      departureState: "On Time",
      arrivalState: "Expected",
    },
  }

  render(<FlightDetails flight={flight} />)

  expect(screen.getByText("Status Details")).toBeInTheDocument()

  // FIX: multiple "Departed" values → use getAllByText
  const departed = screen.getAllByText("Departed")
  expect(departed).toHaveLength(2)

  expect(screen.getByText("On Time")).toBeInTheDocument()
  expect(screen.getByText("Expected")).toBeInTheDocument()
})


  it("renders marketed flight segments when provided", () => {
    const flight = {
      carrierCode: "AI",
      flightNumber: "202",
      marketedFlightSegments: [
        { marketingAirlineCode: "UA", flightNumber: "101" },
        { marketingAirlineCode: "LH", flightNumber: "404" },
      ],
    };
    render(<FlightDetails flight={flight} />);
    expect(screen.getByText("Marketed Flight Segments")).toBeInTheDocument();
    expect(screen.getByText("UA")).toBeInTheDocument();
    expect(screen.getByText("LH")).toBeInTheDocument();
  });
});
