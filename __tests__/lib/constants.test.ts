import { CONTRACT_ABI, CONTRACT_ADDRESS, WS_PROVIDER_URL } from "@/lib/constants"

describe("Constants", () => {
  describe("CONTRACT_ABI", () => {
    it("should have correct structure", () => {
      expect(Array.isArray(CONTRACT_ABI)).toBe(true)
      expect(CONTRACT_ABI.length).toBeGreaterThan(0)
    })

    it("should contain constructor", () => {
      const constructor = CONTRACT_ABI.find((item) => item.type === "constructor")
      expect(constructor).toBeDefined()
      expect(constructor?.stateMutability).toBe("nonpayable")
    })

    it("should contain FlightDataInserted event", () => {
      const event = CONTRACT_ABI.find((item) => item.type === "event" && item.name === "FlightDataInserted")
      expect(event).toBeDefined()
      expect(event?.anonymous).toBe(false)

      const inputs = event?.inputs || []
      const flightNumberInput = inputs.find((input) => input.name === "flightNumber")
      const carrierCodeInput = inputs.find((input) => input.name === "carrierCode")

      expect(flightNumberInput).toBeDefined()
      expect(flightNumberInput?.type).toBe("string")
      expect(carrierCodeInput).toBeDefined()
      expect(carrierCodeInput?.type).toBe("string")
    })

    it("should contain FlightStatusUpdated event", () => {
      const event = CONTRACT_ABI.find(
        (item) => item.type === "event" && item.name === "FlightStatusUpdated",
      )
      expect(event).toBeDefined()
      expect(event?.anonymous).toBe(false)

      const inputs = event?.inputs || []
      const flightNumberInput = inputs.find((input) => input.name === "flightNumber")
      const newArrivalStatus = inputs.find((input) => input.name === "newArrivalStatus")
      const newDepartureStatus = inputs.find((input) => input.name === "newDepartureStatus")
      const newLegStatus = inputs.find((input) => input.name === "newLegStatus")

      expect(flightNumberInput).toBeDefined()
      expect(newArrivalStatus).toBeDefined()
      expect(newDepartureStatus).toBeDefined()
      expect(newLegStatus).toBeDefined()
    })

    it("should contain FlightSubscriptionAdded event", () => {
      const event = CONTRACT_ABI.find(
        (item) => item.type === "event" && item.name === "FlightSubscriptionAdded",
      )
      expect(event).toBeDefined()

      const inputs = event?.inputs || []
      const userInput = inputs.find((input) => input.name === "user")
      expect(userInput).toBeDefined()
      expect(userInput?.type).toBe("address")
    })

    it("should contain FlightUnsubscribed event", () => {
      const event = CONTRACT_ABI.find(
        (item) => item.type === "event" && item.name === "FlightUnsubscribed",
      )
      expect(event).toBeDefined()

      const inputs = event?.inputs || []
      const userInput = inputs.find((input) => input.name === "user")
      const flightNumberInput = inputs.find((input) => input.name === "flightNumber")

      expect(userInput).toBeDefined()
      expect(userInput?.type).toBe("address")
      expect(flightNumberInput).toBeDefined()
      expect(flightNumberInput?.type).toBe("string")
    })
  })

  describe("CONTRACT_ADDRESS", () => {
    it("should be a valid Ethereum address format", () => {
      expect(typeof CONTRACT_ADDRESS).toBe("string")
      expect(CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/)
    })

    it("should not be empty", () => {
      expect(CONTRACT_ADDRESS).toBeTruthy()
      expect(CONTRACT_ADDRESS.length).toBe(42) // 0x + 40 hex characters
    })
  })

  describe("WS_PROVIDER_URL", () => {
    it("should be a valid WebSocket URL", () => {
      expect(typeof WS_PROVIDER_URL).toBe("string")
      expect(WS_PROVIDER_URL).toMatch(/^wss?:\/\//)
      expect(WS_PROVIDER_URL).toBe("wss://columbus.camino.network/ext/bc/C/ws")
    })

    it("should use secure WebSocket protocol", () => {
      expect(WS_PROVIDER_URL).toMatch(/^wss:\/\//)
    })

    it("should not be empty", () => {
      expect(WS_PROVIDER_URL).toBeTruthy()
      expect(WS_PROVIDER_URL.length).toBeGreaterThan(0)
    })

    it("should be a valid URL format", () => {
      expect(() => new URL(WS_PROVIDER_URL)).not.toThrow()
    })
  })

  describe("Integration tests", () => {
    it("should have all required constants defined", () => {
      expect(CONTRACT_ABI).toBeDefined()
      expect(CONTRACT_ADDRESS).toBeDefined()
      expect(WS_PROVIDER_URL).toBeDefined()
    })

    it("should export constants that can be used together", () => {
      expect(typeof CONTRACT_ABI).toBe("object")
      expect(typeof CONTRACT_ADDRESS).toBe("string")
      expect(typeof WS_PROVIDER_URL).toBe("string")

      expect(Array.isArray(CONTRACT_ABI)).toBe(true)
      expect(CONTRACT_ADDRESS.startsWith("0x")).toBe(true)
      expect(WS_PROVIDER_URL.startsWith("wss://")).toBe(true)
    })
  })
})
