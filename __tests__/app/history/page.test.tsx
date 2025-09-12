// import { render, screen, waitFor, fireEvent } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";
// import HistoryPage from "@/app/history/page";
// import { fetchHistoricalFlightData, decryptFlightData } from "@/lib/api";
// import { useRouter, useSearchParams } from "next/navigation";
// import moment from "moment-timezone";

// jest.mock("@/lib/api");
// jest.mock("next/navigation", () => ({
//   useRouter: jest.fn(),
//   useSearchParams: jest.fn(),
// }));

// describe("History Page - Extended Tests", () => {
//   const mockPush = jest.fn();
//   const mockBack = jest
//     .spyOn(window.history, "back")
//     .mockImplementation(() => {});

//   const mockFlightData = {
//     flightDetails: [
//       {
//         flightNumber: "3682",
//         carrierCode: "UA",
//         departureAirport: "SFO",
//         arrivalAirport: "LAX",
//         status: { statusCode: "ONT" },
//         scheduledDepartureDate: moment().format("YYYY-MM-DD"),
//         marketedFlightSegments: [
//           { marketingAirlineCode: "UA", flightNumber: "3682" },
//         ],
//       },
//       {
//         flightNumber: "3683",
//         carrierCode: "UA",
//         departureAirport: "SFO",
//         arrivalAirport: "JFK",
//         status: { statusCode: "DL" },
//         scheduledDepartureDate: moment()
//           .subtract(1, "day")
//           .format("YYYY-MM-DD"),
//         marketedFlightSegments: [
//           { marketingAirlineCode: "UA", flightNumber: "3683" },
//         ],
//       },
//     ],
//   };

//   beforeEach(() => {
//     (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
//     (useSearchParams as jest.Mock).mockReturnValue({
//       get: jest.fn().mockImplementation((key) => {
//         if (key === "flightNumber") return "UA3682";
//         return null;
//       }),
//     });
//     jest.clearAllMocks();
//   });

//   it("renders loading state initially", () => {
//     (fetchHistoricalFlightData as jest.Mock).mockReturnValue(
//       new Promise(() => {})
//     );
//     render(<HistoryPage />);
//     expect(
//       screen.getByText(/Loading historical flight data/i)
//     ).toBeInTheDocument();
//   });

//   it("renders flight cards and badges correctly", async () => {
//     (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
//       mockFlightData
//     );
//     (decryptFlightData as jest.Mock).mockResolvedValueOnce([
//       "UA",
//       "3682",
//       "UA",
//       "3683",
//     ]);

//     render(<HistoryPage />);

//     await waitFor(() =>
//       expect(
//         screen.getByText(/Historical Flight Data - UA3682/i)
//       ).toBeInTheDocument()
//     );

//     // Check Today / Yesterday badges
//     expect(screen.getByText(/Today/i)).toBeInTheDocument();
//     expect(screen.getByText(/Yesterday/i)).toBeInTheDocument();

//     // Check airports
//     expect(screen.getAllByText("SFO").length).toBeGreaterThan(0);
//     expect(screen.getAllByText("LAX").length).toBeGreaterThan(0);
//     expect(screen.getAllByText("JFK").length).toBeGreaterThan(0);

//     // Check flight count badge
//     expect(screen.getByText(/2 flights found/i)).toBeInTheDocument();
//   });

//   it("handles API error gracefully", async () => {
//     (fetchHistoricalFlightData as jest.Mock).mockRejectedValueOnce(
//       new Error("API Error")
//     );
//     render(<HistoryPage />);
//     await waitFor(() =>
//       expect(
//         screen.getByText(/No historical flight data available/i)
//       ).toBeInTheDocument()
//     );
//   });

//   it("handles back navigation button", async () => {
//     (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
//       mockFlightData
//     );
//     (decryptFlightData as jest.Mock).mockResolvedValueOnce([
//       "UA",
//       "3682",
//       "UA",
//       "3683",
//     ]);

//     render(<HistoryPage />);
//     await waitFor(() =>
//       expect(
//         screen.getByText(/Historical Flight Data - UA3682/i)
//       ).toBeInTheDocument()
//     );

//     const backButton = screen.getByRole("button", { name: /back/i });
//     await userEvent.click(backButton);
//     expect(mockBack).toHaveBeenCalled();
//   });

//   it("refreshes flights when handleRefresh is called", async () => {
//     (fetchHistoricalFlightData as jest.Mock).mockResolvedValue(mockFlightData);
//     (decryptFlightData as jest.Mock).mockResolvedValue([
//       "UA",
//       "3682",
//       "UA",
//       "3683",
//     ]);

//     render(<HistoryPage />);
//     await waitFor(() => screen.getByText(/Historical Flight Data - UA3682/i));

//     const refreshButton =
//       screen.getByRole("button", { name: /Refresh/i }) ||
//       screen.getAllByRole("button")[1];
//     fireEvent.click(refreshButton);

//     await waitFor(
//       () => expect(fetchHistoricalFlightData).toHaveBeenCalledTimes(2) // initial + refresh
//     );
//   });

//   it("renders empty state if no flights", async () => {
//     (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce({
//       flightDetails: [],
//     });
//     render(<HistoryPage />);
//     await waitFor(() =>
//       expect(
//         screen.getByText(/No historical flight data available/i)
//       ).toBeInTheDocument()
//     );
//   });

//   it("handles blockchain events triggering refresh", async () => {
//     const events = [{ flightNumber: "UA3682", description: "Flight updated" }];
//     jest.mock("@/hooks/use-blockchain-connection", () => ({
//       useBlockchainConnection: jest.fn().mockReturnValue({
//         isConnected: true,
//         lastUpdate: new Date(),
//         events,
//       }),
//     }));

//     (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
//       mockFlightData
//     );
//     (decryptFlightData as jest.Mock).mockResolvedValueOnce([
//       "UA",
//       "3682",
//       "UA",
//       "3683",
//     ]);

//     render(<HistoryPage />);
//     await waitFor(() =>
//       expect(
//         screen.getByText(/Historical Flight Data - UA3682/i)
//       ).toBeInTheDocument()
//     );
//     // Event triggers fetch
//     await waitFor(() => expect(fetchHistoricalFlightData).toHaveBeenCalled());
//   });

  
// });

// // it("filters flights by date and clears filter", async () => {
// //   render(<HistoryPage />);

// //   // Ensure initial state shows JFK and LAX
// //   const jfkElements = screen.getAllByText(/JFK/i);
// //   expect(jfkElements.length).toBeGreaterThan(0);
// //   expect(screen.getByText(/LAX/i)).toBeInTheDocument();

// //   // Open date filter
// //   const filterButton = screen.getByRole("button", { name: /Filter by Date/i });
// //   await userEvent.click(filterButton);

// //   // Select a date
// //   const sep10Button = screen.getByRole("button", { name: /Sep 10/i });
// //   await userEvent.click(sep10Button);

// //   // Check that after filtering, LAX disappears
// //   expect(screen.queryByText(/LAX/i)).not.toBeInTheDocument();
// //   expect(screen.getAllByText(/JFK/i).length).toBeGreaterThan(0);

// //   // Clear filter using data-testid
// //   const clearButton = screen.getByTestId("clear-filter");
// //   await userEvent.click(clearButton);

// //   // Now both airports should appear again
// //   expect(screen.getAllByText(/JFK/i).length).toBeGreaterThan(0);
// //   expect(screen.getByText(/LAX/i)).toBeInTheDocument();
// // });

// // it("filters flights by date", async () => {
// //   (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
// //     mockFlightData
// //   );
// //   (decryptFlightData as jest.Mock).mockResolvedValueOnce(["UA", "3682"]);

// //   render(<HistoryPage />);
// //   await waitFor(() => screen.getByText(/Historical Flight Data - UA3682/i));

// //   // Open the filter popover first
// //   const filterButton = screen.getByRole("button", {
// //     name: /Filter by Date/i,
// //   });
// //   await userEvent.click(filterButton);

// //   // Select the date (e.g., today or yesterday)
// //   const dateButton = screen
// //     .getAllByRole("button")
// //     .find((btn) =>
// //       btn.textContent?.includes(moment().subtract(1, "day").format("MMM DD"))
// //     );

// //   if (!dateButton) throw new Error("Date button not found");
// //   await userEvent.click(dateButton);

// //   // Assert that filtered flights are shown
// //   expect(screen.getByText(/Showing flights for/i)).toBeInTheDocument();

// //   // Assert that JFK exists (pick the first match)
// //   const departureAirports = screen.getAllByText(/JFK/i);
// //   expect(departureAirports.length).toBeGreaterThan(0);

// //   // Assert that LAX is not shown
// //   const arrivalAirports = screen.queryAllByText(/LAX/i);
// //   expect(arrivalAirports.length).toBe(0);

// //   // Clear filter
// //   // Clear filter
// //   const clearButton = screen.getByRole("button", { name: /clear/i }); // or use data-testid
// //   await userEvent.click(clearButton);

// //   // Now both airports should appear again
// //   expect(screen.getAllByText(/JFK/i).length).toBeGreaterThan(0);
// //   expect(screen.getAllByText(/LAX/i).length).toBeGreaterThan(0);
// // });


// __tests__/app/history/page.test.tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "@/app/history/page";
import { fetchHistoricalFlightData, decryptFlightData } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import moment from "moment-timezone";

jest.mock("@/lib/api");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("History Page - Extended Tests", () => {
  const mockPush = jest.fn();
  const mockBack = jest
    .spyOn(window.history, "back")
    .mockImplementation(() => {});

  const mockFlightData = {
    flightDetails: [
      {
        flightNumber: "3682",
        carrierCode: "UA",
        departureAirport: "SFO",
        arrivalAirport: "LAX",
        status: { statusCode: "ONT" },
        scheduledDepartureDate: moment().format("YYYY-MM-DD"),
        marketedFlightSegments: [
          { marketingAirlineCode: "UA", flightNumber: "3682" },
        ],
      },
      {
        flightNumber: "3683",
        carrierCode: "UA",
        departureAirport: "SFO",
        arrivalAirport: "JFK",
        status: { statusCode: "DL" },
        scheduledDepartureDate: moment()
          .subtract(1, "day")
          .format("YYYY-MM-DD"),
        marketedFlightSegments: [
          { marketingAirlineCode: "UA", flightNumber: "3683" },
        ],
      },
    ],
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === "flightNumber") return "UA3682";
        return null;
      }),
    });
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    (fetchHistoricalFlightData as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );
    render(<HistoryPage />);
    expect(
      screen.getByText(/Loading historical flight data/i)
    ).toBeInTheDocument();
  });

  it("renders flight cards and badges correctly", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
      mockFlightData
    );
    (decryptFlightData as jest.Mock).mockResolvedValueOnce([
      "UA",
      "3682",
      "UA",
      "3683",
    ]);

    render(<HistoryPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Historical Flight Data - UA3682/i)
      ).toBeInTheDocument()
    );

    // Check Today / Yesterday badges
    expect(screen.getByText(/Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Yesterday/i)).toBeInTheDocument();

    // Check airports
    expect(screen.getAllByText("SFO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LAX").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JFK").length).toBeGreaterThan(0);

    // Check flight count badge
    expect(screen.getByText(/2 flights found/i)).toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockRejectedValueOnce(
      new Error("API Error")
    );
    render(<HistoryPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/No historical flight data available/i)
      ).toBeInTheDocument()
    );
  });

  it("handles back navigation button", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
      mockFlightData
    );
    (decryptFlightData as jest.Mock).mockResolvedValueOnce([
      "UA",
      "3682",
      "UA",
      "3683",
    ]);

    render(<HistoryPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/Historical Flight Data - UA3682/i)
      ).toBeInTheDocument()
    );

    const backButton = screen.getByRole("button", { name: /back/i });
    await userEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });

  it("refreshes flights when handleRefresh is called", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValue(mockFlightData);
    (decryptFlightData as jest.Mock).mockResolvedValue([
      "UA",
      "3682",
      "UA",
      "3683",
    ]);

    render(<HistoryPage />);
    await waitFor(() => screen.getByText(/Historical Flight Data - UA3682/i));

    const refreshButton =
      screen.getByRole("button", { name: /Refresh/i }) ||
      screen.getAllByRole("button")[1];
    fireEvent.click(refreshButton);

    await waitFor(
      () => expect(fetchHistoricalFlightData).toHaveBeenCalledTimes(2) // initial + refresh
    );
  });

  it("renders empty state if no flights", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce({
      flightDetails: [],
    });
    render(<HistoryPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/No historical flight data available/i)
      ).toBeInTheDocument()
    );
  });

  it("handles blockchain events triggering refresh", async () => {
    const events = [{ flightNumber: "UA3682", description: "Flight updated" }];
    jest.mock("@/hooks/use-blockchain-connection", () => ({
      useBlockchainConnection: jest.fn().mockReturnValue({
        isConnected: true,
        lastUpdate: new Date(),
        events,
      }),
    }));

    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(
      mockFlightData
    );
    (decryptFlightData as jest.Mock).mockResolvedValueOnce([
      "UA",
      "3682",
      "UA",
      "3683",
    ]);

    render(<HistoryPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/Historical Flight Data - UA3682/i)
      ).toBeInTheDocument()
    );

    await waitFor(() => expect(fetchHistoricalFlightData).toHaveBeenCalled());
  });

  it("handles flight with no marketedFlightSegments", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce({
      flightDetails: [
        { flightNumber: "123", scheduledDepartureDate: moment().format("YYYY-MM-DD") },
      ],
    });
    (decryptFlightData as jest.Mock).mockResolvedValueOnce([]);

    render(<HistoryPage />);
    await waitFor(() => screen.getByText(/123/i));
    expect(screen.getByText(/1 flight found/i)).toBeInTheDocument();
  });

  it("handles decryption errors gracefully", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(mockFlightData);
    (decryptFlightData as jest.Mock).mockRejectedValueOnce(new Error("Decryption failed"));

    render(<HistoryPage />);
    await waitFor(() =>
      expect(screen.getByText(/Historical Flight Data - UA3682/i)).toBeInTheDocument()
    );
  });
it("filters flights by date and clears filter", async () => {
  (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(mockFlightData);
  (decryptFlightData as jest.Mock).mockResolvedValueOnce([
    "UA",
    "3682",
    "UA",
    "3683",
  ]);

  render(<HistoryPage />);
  await waitFor(() => screen.getByText(/Historical Flight Data - UA3682/i));

  // Open the date filter popover first
  const filterButton = screen.getByRole("button", { name: /Filter by Date/i });
  await userEvent.click(filterButton);

  // Now the date buttons are accessible
  const todayButton = await screen.findByRole("button", { name: new RegExp(moment().format("MMM DD")) });
  await userEvent.click(todayButton);

  expect(screen.getAllByText("SFO").length).toBeGreaterThan(0); // filtered results
  expect(screen.getByText(/Showing flights for/i)).toBeInTheDocument();

  // Clear filter using test id
  const clearButton = screen.getByTestId("clear-date-filter");
  await userEvent.click(clearButton);
  expect(screen.queryByText(/Showing flights for/i)).not.toBeInTheDocument();
});


  it("renders badges for flights older than yesterday", async () => {
    const oldDate = moment().subtract(5, "days").format("YYYY-MM-DD");
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce({
      flightDetails: [{ flightNumber: "123", scheduledDepartureDate: oldDate }],
    });
    (decryptFlightData as jest.Mock).mockResolvedValueOnce([]);

    render(<HistoryPage />);
    await waitFor(() => screen.getByText(/123/i));
    expect(screen.getByText(new RegExp(moment(oldDate).format("MMM DD")))).toBeInTheDocument();
  });

  it("renders FlightCard with no blockchain events", async () => {
    (fetchHistoricalFlightData as jest.Mock).mockResolvedValueOnce(mockFlightData);
    (decryptFlightData as jest.Mock).mockResolvedValueOnce([
      "UA",
      "3682",
      "UA",
      "3683",
    ]);

    render(<HistoryPage />);
    await waitFor(() => screen.getByText(/Historical Flight Data - UA3682/i));
    expect(screen.getAllByText("SFO").length).toBeGreaterThan(0);
  });

  it("shows loading state", async () => {
  render(<HistoryPage />);
  expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
});


// it("handles fetch error", async () => {
//   (fetchHistoricalFlightData as jest.Mock).mockRejectedValueOnce(new Error("API error"));

//   render(<HistoryPage />);

//   // Wait for the error message
//   const errorMessage = await screen.findByTestId("error-message");
//   expect(errorMessage).toHaveTextContent(/Failed to load/i);
// });

});
