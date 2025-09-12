// __tests__/components/RealtimeEvents.test.tsx
import { RealtimeEvents } from "@/components/realtime-events";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

const mockOnEventsUpdate = jest.fn();

// Mock WebSocket globally
const MockWebSocket = jest.fn().mockImplementation(() => {
  const ws = {
    onopen: null as ((ev?: any) => void) | null,
    onmessage: null as ((ev: any) => void) | null,
    onclose: null as ((ev?: any) => void) | null,
    onerror: null as ((ev?: any) => void) | null,
    send: jest.fn(),
    close: jest.fn(),
  };
  
  // Store the instance so we can access it later
  MockWebSocket.lastInstance = ws;
  return ws;
});

// Add a property to store the last instance
MockWebSocket.lastInstance = null;

describe("RealtimeEvents Component", () => {
  beforeAll(() => {
    // @ts-ignore
    global.WebSocket = MockWebSocket;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.lastInstance = null;
  });

  it("renders initial disconnected state", () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    expect(screen.getByText(/Blockchain Connection/i)).toBeInTheDocument();
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    expect(screen.getByText(/No events yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect to Blockchain/i })).toBeInTheDocument();
  });

  it("connects to blockchain on button click", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    // Get the WebSocket instance
    const wsInstance = MockWebSocket.lastInstance;
    expect(wsInstance).toBeTruthy();

    // Simulate socket open
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Verify subscription message was sent
    expect(wsInstance.send).toHaveBeenCalledWith(expect.stringContaining("eth_subscribe"));
  });

  it("handles socket error gracefully", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );
    
    const wsInstance = MockWebSocket.lastInstance;

    act(() => {
      if (wsInstance.onerror) {
        wsInstance.onerror(new Event("error"));
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
  });

  it("handles socket close gracefully", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );
    
    const wsInstance = MockWebSocket.lastInstance;

    act(() => {
      if (wsInstance.onclose) {
        wsInstance.onclose();
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
  });

  it("handles disconnect button click when connected", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    // Connect first
    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;
    
    // Simulate connection
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Now disconnect
    fireEvent.click(screen.getByRole("button", { name: /Disconnect/i }));

    expect(wsInstance.close).toHaveBeenCalled();
  });

  it("handles receiving new events via onmessage with valid data", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Simulate incoming event with params.result
    const mockEventData = {
      params: {
        result: {
          blockNumber: "0x99",
          transactionHash: "0x1234567890abcdef",
          topics: ["FlightDataSet"],
          data: "0xbeef",
        }
      }
    };

    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: JSON.stringify(mockEventData)
        });
      }
    });

    await waitFor(() => {
      expect(mockOnEventsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            blockNumber: "0x99",
            transactionHash: "0x1234567890abcdef",
            topics: ["FlightDataSet"],
            data: "0xbeef",
            type: "Flight Data Set"
          })
        ])
      );
    });
  });

  it("handles invalid JSON in onmessage - should trigger catch block", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Simulate invalid JSON to trigger catch block
    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: "invalid json"
        });
      }
    });

    // Should not call onEventsUpdate due to error
    expect(mockOnEventsUpdate).not.toHaveBeenCalled();
  });

  it("handles message without params.result - should not process event", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Test the if condition - message without params.result
    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: JSON.stringify({ someOtherData: "test" })
        });
      }
    });

    expect(mockOnEventsUpdate).not.toHaveBeenCalled();
  });

  it("handles message with params but no result", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Test params exists but no result
    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: JSON.stringify({ params: { someOtherField: "test" } })
        });
      }
    });

    expect(mockOnEventsUpdate).not.toHaveBeenCalled();
  });

  it("handles WebSocket connection error during creation - triggers catch block", () => {
    // Mock WebSocket constructor to throw
    const OriginalWebSocket = global.WebSocket;
    // @ts-ignore
    global.WebSocket = jest.fn().mockImplementation(() => {
      throw new Error("Connection failed");
    });

    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    // This should trigger the catch block in connectToBlockchain
    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    // Component should still be in disconnected state
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();

    // Restore original WebSocket
    global.WebSocket = OriginalWebSocket;
  });

  it("renders multiple event cards with proper formatting", () => {
    const events = [
      {
        id: 1,
        blockNumber: "0x1a",
        transactionHash: "0xabcdef1234567890",
        topics: ["FlightDataSet"],
        data: "0xdeadbeef",
        timestamp: new Date().toISOString(),
        type: "Flight Data Set",
      },
      {
        id: 2,
        blockNumber: "0x2b",
        transactionHash: "0x9876543210fedcba",
        topics: ["FlightDelayed"],
        data: "0xcafebabe",
        timestamp: new Date().toISOString(),
        type: "Flight Delayed",
      },
    ];

    render(
      <RealtimeEvents events={events} onEventsUpdate={mockOnEventsUpdate} />
    );

    expect(screen.getByText(/Flight Data Set/i)).toBeInTheDocument();
    expect(screen.getByText(/Flight Delayed/i)).toBeInTheDocument();
    
    // Check that block numbers are displayed correctly (hex to decimal conversion)
    expect(screen.getByText("26")).toBeInTheDocument(); // 0x1a = 26
    expect(screen.getByText("43")).toBeInTheDocument(); // 0x2b = 43

    // Check transaction hash truncation
    expect(screen.getByText("0xabcdef12...")).toBeInTheDocument();
    expect(screen.getByText("0x98765432...")).toBeInTheDocument();
  });

  it("tests getEventType function with known event types", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Test FlightStatusUpdate
    const flightStatusEvent = {
      params: {
        result: {
          blockNumber: "0x2",
          transactionHash: "0x2",
          topics: ["FlightStatusUpdate"],
          data: "0x2",
        }
      }
    };

    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ data: JSON.stringify(flightStatusEvent) });
      }
    });

    await waitFor(() => {
      expect(mockOnEventsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: "Flight Status Update"
          })
        ])
      );
    });
  });

  it("tests getEventType function with unknown event type", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Test unknown event type - should return "Unknown Event"
    const unknownEventData = {
      params: {
        result: {
          blockNumber: "0x100",
          transactionHash: "0xabcdef1234567890",
          topics: ["UnknownEventType"],
          data: "0xcafe",
        }
      }
    };

    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: JSON.stringify(unknownEventData)
        });
      }
    });

    await waitFor(() => {
      expect(mockOnEventsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: "Unknown Event"
          })
        ])
      );
    });
  });

  it("cleans up WebSocket on component unmount", () => {
    const { unmount } = render(
      <RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />
    );

    // Connect first
    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Unmount component - should trigger useEffect cleanup
    unmount();

    expect(wsInstance.close).toHaveBeenCalled();
  });

  it("tests disconnect functionality", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    // Connect first
    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;
    
    // Simulate connection
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Now disconnect to test the if (ws) condition
    fireEvent.click(screen.getByRole("button", { name: /Disconnect/i }));
    
    expect(wsInstance.close).toHaveBeenCalled();
  });

  it("limits events to 50 items when processing new events", async () => {
    // Create 49 existing events
    const existingEvents = Array.from({ length: 49 }, (_, i) => ({
      id: i,
      blockNumber: `0x${i.toString(16)}`,
      transactionHash: `0x${i}`,
      topics: ["Test"],
      data: "0x",
      timestamp: new Date().toISOString(),
      type: "Test Event",
    }));

    render(
      <RealtimeEvents events={existingEvents} onEventsUpdate={mockOnEventsUpdate} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    // Add new event - this should test the slice(0, 49) logic
    const newEventData = {
      params: {
        result: {
          blockNumber: "0x999",
          transactionHash: "0xnew",
          topics: ["NewEvent"],
          data: "0xnew",
        }
      }
    };

    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: JSON.stringify(newEventData)
        });
      }
    });

    await waitFor(() => {
      expect(mockOnEventsUpdate).toHaveBeenCalled();
      const updateCall = mockOnEventsUpdate.mock.calls[0][0];
      expect(updateCall).toHaveLength(50); // Should limit to 50 total
      expect(updateCall[0]).toMatchObject({
        blockNumber: "0x999",
        transactionHash: "0xnew",
      });
    });
  });

  it("creates proper event structure with all required fields", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    const mockEventData = {
      params: {
        result: {
          blockNumber: "0xabc",
          transactionHash: "0xdef123",
          topics: ["FlightDataSet"],
          data: "0x456789",
        }
      }
    };

    act(() => {
      if (wsInstance.onmessage) {
        wsInstance.onmessage({ 
          data: JSON.stringify(mockEventData)
        });
      }
    });

    await waitFor(() => {
      expect(mockOnEventsUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          id: expect.any(Number),
          blockNumber: "0xabc",
          transactionHash: "0xdef123",
          topics: ["FlightDataSet"],
          data: "0x456789",
          timestamp: expect.any(String),
          type: "Flight Data Set"
        }),
        ...[]
      ]);
    });
  });

  it("tests all known event type mappings", async () => {
    render(<RealtimeEvents events={[]} onEventsUpdate={mockOnEventsUpdate} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Connect to Blockchain/i })
    );

    const wsInstance = MockWebSocket.lastInstance;

    // Connect first
    act(() => {
      if (wsInstance.onopen) {
        wsInstance.onopen();
      }
    });

    const eventTypes = [
      { topic: "FlightDataSet", expectedType: "Flight Data Set" },
      { topic: "FlightStatusUpdate", expectedType: "Flight Status Update" },
      { topic: "SubscriptionDetails", expectedType: "Subscription Details" },
      { topic: "SubscriptionsRemoved", expectedType: "Subscriptions Removed" },
    ];

    for (let i = 0; i < eventTypes.length; i++) {
      const { topic, expectedType } = eventTypes[i];
      
      const eventData = {
        params: {
          result: {
            blockNumber: `0x${i + 1}`,
            transactionHash: `0x${i + 1}`,
            topics: [topic],
            data: `0x${i + 1}`,
          }
        }
      };

      act(() => {
        if (wsInstance.onmessage) {
          wsInstance.onmessage({ data: JSON.stringify(eventData) });
        }
      });

      await waitFor(() => {
        expect(mockOnEventsUpdate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: expectedType
            })
          ])
        );
      });

      // Clear mock for next iteration
      mockOnEventsUpdate.mockClear();
    }
  });
});