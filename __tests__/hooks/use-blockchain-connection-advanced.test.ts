import { renderHook, act } from "@testing-library/react";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";
import { jest } from "@jest/globals";

// Mock WebSocket with detailed implementation
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null as any,
  onmessage: null as any,
  onclose: null as any,
  onerror: null as any,
  readyState: WebSocket.CONNECTING,
};

const MockWebSocket = jest.fn(() => mockWebSocket);
global.WebSocket = MockWebSocket as any;

// Mock constants
jest.mock("@/lib/constants", () => ({
  CONTRACT_ADDRESS: "0x2Ff328B1B84a78aB61c41ca7D7c3302dD775fDAa",
  WS_PROVIDER_URL: "wss://columbus.camino.network/ext/bc/C/ws",
}));

describe("useBlockchainConnection - Advanced Tests", () => {
  let originalDateNow: any;
  let currentTime: number;

  beforeAll(() => {
    originalDateNow = Date.now;
    currentTime = 1000000000000;
    jest.spyOn(global.Date, "now").mockImplementation(() => {
      currentTime += 1;
      return currentTime;
    });
  });

  afterAll(() => {
    jest.spyOn(global.Date, "now").mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket.send.mockClear();
    mockWebSocket.close.mockClear();
    MockWebSocket.mockClear();
    mockWebSocket.readyState = WebSocket.CONNECTING;
  });

  describe("Event Type Mapping", () => {
    it("maps known topic hashes to event types", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        params: {
          result: {
            blockNumber: "0x123",
            transactionHash: "0xabc123",
            topics: ["0x123456"], // Known topic hash
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      expect(result.current.events[0].type).toBe("Flight Data Set");
    });

    it("defaults to 'Flight Event' for unknown topic hashes", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        params: {
          result: {
            blockNumber: "0x123",
            transactionHash: "0xabc123",
            topics: ["0xunknown"], // Unknown topic hash
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      expect(result.current.events[0].type).toBe("Flight Event");
    });
  });

  describe("Event Data Parsing", () => {
    it("parses flight information from event data", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        params: {
          result: {
            blockNumber: "0x123",
            transactionHash: "0xabc123",
            topics: ["0x456"],
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      const event = result.current.events[0];
      expect(event.flightNumber).toBe("Unknown");
      expect(event.carrierCode).toBe("Unknown");
      expect(event.status).toBe("Updated");
      expect(event.description).toBe("Flight status updated via blockchain");
    });

    it("includes all required event properties", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        params: {
          result: {
            blockNumber: "0x123",
            transactionHash: "0xabc123",
            topics: ["0x456"],
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      const event = result.current.events[0];
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("blockNumber");
      expect(event).toHaveProperty("transactionHash");
      expect(event).toHaveProperty("topics");
      expect(event).toHaveProperty("data");
      expect(event).toHaveProperty("timestamp");
      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("flightNumber");
      expect(event).toHaveProperty("carrierCode");
      expect(event).toHaveProperty("status");
      expect(event).toHaveProperty("description");
    });
  });

  describe("Connection Management", () => {
    it("sends subscription message on connection", () => {
      renderHook(() => useBlockchainConnection());

      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen({} as Event);
        }
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"method":"eth_subscribe"')
      );

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage).toMatchObject({
        jsonrpc: "2.0",
        method: "eth_subscribe",
        params: [
          "logs",
          {
            address: "0x2Ff328B1B84a78aB61c41ca7D7c3302dD775fDAa",
            topics: [],
          },
        ],
        id: 1,
      });
    });

    it("attempts reconnection after disconnect", (done) => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useBlockchainConnection());

      act(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen({} as Event);
        }
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose({} as CloseEvent);
        }
      });
      expect(result.current.isConnected).toBe(false);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(MockWebSocket).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
      done();
    });

    // it("handles connection errors gracefully", () => {
    //   const { result } = renderHook(() => useBlockchainConnection());
    //   const consoleSpy = jest
    //     .spyOn(console, "error")
    //     .mockImplementation(() => {});

    //   act(() => {
    //     if (mockWebSocket.onerror) {
    //       const mockEvent = new Event("error");
    //       mockWebSocket.onerror(mockEvent);
    //     }
    //   });

    //   expect(result.current.isConnected).toBe(false);
    //   expect(consoleSpy).toHaveBeenCalled(); // ✅ just ensure it was called

    //   consoleSpy.mockRestore();
    // });
  });

  describe("Event Processing Edge Cases", () => {
    it("handles events without params", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        method: "eth_subscription",
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      expect(result.current.events).toHaveLength(0);
    });

    it("handles events without result", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        params: {},
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      expect(result.current.events).toHaveLength(0);
    });

    it("generates unique IDs for events", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const mockEventData = {
        params: {
          result: {
            blockNumber: "0x123",
            transactionHash: "0xabc123",
            topics: ["0x456"],
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(mockEventData),
          } as MessageEvent);
        }
      });

      expect(result.current.events).toHaveLength(2);
      expect(result.current.events[0].id).not.toBe(result.current.events[1].id);
    });

    it("maintains event order (newest first)", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      const firstEvent = {
        params: {
          result: {
            blockNumber: "0x123",
            transactionHash: "0xfirst",
            topics: ["0x456"],
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(firstEvent),
          } as MessageEvent);
        }
      });

      const secondEvent = {
        params: {
          result: {
            blockNumber: "0x124",
            transactionHash: "0xsecond",
            topics: ["0x456"],
            data: "0x789",
          },
        },
      };

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(secondEvent),
          } as MessageEvent);
        }
      });

      expect(result.current.events[0].transactionHash).toBe("0xsecond");
      expect(result.current.events[1].transactionHash).toBe("0xfirst");
    });
  });

  describe("Memory Management", () => {
    it("cleans up WebSocket on unmount", () => {
      const { unmount } = renderHook(() => useBlockchainConnection());
      unmount();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it("prevents memory leaks with event limit", () => {
      const { result } = renderHook(() => useBlockchainConnection());

      for (let i = 0; i < 60; i++) {
        const mockEventData = {
          params: {
            result: {
              blockNumber: `0x${i.toString(16)}`,
              transactionHash: `0xabc${i}`,
              topics: ["0x456"],
              data: "0x789",
            },
          },
        };

        act(() => {
          if (mockWebSocket.onmessage) {
            mockWebSocket.onmessage({
              data: JSON.stringify(mockEventData),
            } as MessageEvent);
          }
        });
      }

      expect(result.current.events).toHaveLength(50);
      expect(result.current.events[0].transactionHash).toBe("0xabc59");
      expect(result.current.events[49].transactionHash).toBe("0xabc10");
    });
  });
});
