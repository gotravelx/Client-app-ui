import { renderHook, act } from "@testing-library/react"
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection"
// Remove incorrect import of jest

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null as any,
  onmessage: null as any,
  onclose: null as any,
  onerror: null as any,
}

// Mock WebSocket constructor
const MockWebSocket = jest.fn(() => mockWebSocket)
global.WebSocket = MockWebSocket as any

describe("useBlockchainConnection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocket.send.mockClear()
    mockWebSocket.close.mockClear()
    MockWebSocket.mockClear()
  })

  it("initializes with disconnected state", () => {
    const { result } = renderHook(() => useBlockchainConnection())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.lastUpdate).toBeNull()
    expect(result.current.events).toEqual([])
  })

  it("creates WebSocket connection on mount", () => {
    renderHook(() => useBlockchainConnection())

    expect(MockWebSocket).toHaveBeenCalledWith("wss://columbus.camino.network/ext/bc/C/ws")
  })

  it("sets connected state when WebSocket opens", () => {
    const { result } = renderHook(() => useBlockchainConnection())

    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
    })

    expect(result.current.isConnected).toBe(true)
    expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"method":"eth_subscribe"'))
  })

  it("processes incoming blockchain events", () => {
    const { result } = renderHook(() => useBlockchainConnection())

    const mockEventData = {
      params: {
        result: {
          blockNumber: "0x123",
          transactionHash: "0xabc123",
          topics: ["0x456"],
          data: "0x789",
        },
      },
    }

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: JSON.stringify(mockEventData) } as MessageEvent)
      }
    })

    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0]).toMatchObject({
      blockNumber: "0x123",
      transactionHash: "0xabc123",
      type: "Flight Event",
    })
    expect(result.current.lastUpdate).toBeInstanceOf(Date)
  })

  it("handles WebSocket close by setting disconnected state", () => {
    const { result } = renderHook(() => useBlockchainConnection())

    // First connect
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
    })
    expect(result.current.isConnected).toBe(true)

    // Then disconnect
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({} as CloseEvent)
      }
    })
    expect(result.current.isConnected).toBe(false)
  })

  // it("handles WebSocket errors", () => {
  //   const { result } = renderHook(() => useBlockchainConnection())
  //   const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

  //   act(() => {
  //     if (mockWebSocket.onerror) {
  //       mockWebSocket.onerror({} as Event)
  //     }
  //   })

  //   expect(result.current.isConnected).toBe(false)
  //   expect(consoleSpy).toHaveBeenCalledWith("WebSocket error:", expect.any(Object))

  //   consoleSpy.mockRestore()
  // })

  it("limits events to 50 items", () => {
    const { result } = renderHook(() => useBlockchainConnection())

    // Add 51 events
    for (let i = 0; i < 51; i++) {
      const mockEventData = {
        params: {
          result: {
            blockNumber: `0x${i.toString(16)}`,
            transactionHash: `0xabc${i}`,
            topics: ["0x456"],
            data: "0x789",
          },
        },
      }

      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({ data: JSON.stringify(mockEventData) } as MessageEvent)
        }
      })
    }

    expect(result.current.events).toHaveLength(50)
  })

  it("closes WebSocket on unmount", () => {
    const { unmount } = renderHook(() => useBlockchainConnection())

    unmount()

    expect(mockWebSocket.close).toHaveBeenCalled()
  })

  // it("handles invalid JSON in WebSocket messages", () => {
  //   const { result } = renderHook(() => useBlockchainConnection())
  //   const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

  //   act(() => {
  //     if (mockWebSocket.onmessage) {
  //       mockWebSocket.onmessage({ data: "invalid json" } as MessageEvent)
  //     }
  //   })

  //   expect(result.current.events).toHaveLength(0)
  //   expect(consoleSpy).toHaveBeenCalledWith("Error parsing blockchain event:", expect.any(Error))

  //   consoleSpy.mockRestore()
  // })
})
