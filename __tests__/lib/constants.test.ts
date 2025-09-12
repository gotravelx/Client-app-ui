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

    it("should contain FlightDataSet event", () => {
      const flightDataSetEvent = CONTRACT_ABI.find((item) => item.type === "event" && item.name === "FlightDataSet")
      expect(flightDataSetEvent).toBeDefined()
      expect(flightDataSetEvent?.anonymous).toBe(false)

      // Check required inputs
      const inputs = flightDataSetEvent?.inputs || []
      const flightNumberInput = inputs.find((input) => input.name === "flightNumber")
      const carrierCodeInput = inputs.find((input) => input.name === "carrierCode")
      const utcTimesInput = inputs.find((input) => input.name === "utcTimes")

      expect(flightNumberInput).toBeDefined()
      expect(flightNumberInput?.type).toBe("string")
      expect(carrierCodeInput).toBeDefined()
      expect(carrierCodeInput?.type).toBe("string")
      expect(utcTimesInput).toBeDefined()
      expect(utcTimesInput?.type).toBe("tuple")
    })

    it("should contain FlightStatusUpdate event", () => {
      const flightStatusUpdateEvent = CONTRACT_ABI.find(
        (item) => item.type === "event" && item.name === "FlightStatusUpdate",
      )
      expect(flightStatusUpdateEvent).toBeDefined()
      expect(flightStatusUpdateEvent?.anonymous).toBe(false)

      // Check required inputs
      const inputs = flightStatusUpdateEvent?.inputs || []
      const flightNumberInput = inputs.find((input) => input.name === "flightNumber")
      const flightStatusInput = inputs.find((input) => input.name === "FlightStatus")
      const arrivalStateInput = inputs.find((input) => input.name === "ArrivalState")
      const departureStateInput = inputs.find((input) => input.name === "DepartureState")

      expect(flightNumberInput).toBeDefined()
      expect(flightStatusInput).toBeDefined()
      expect(arrivalStateInput).toBeDefined()
      expect(departureStateInput).toBeDefined()
    })

    it("should contain SubscriptionDetails event", () => {
      const subscriptionDetailsEvent = CONTRACT_ABI.find(
        (item) => item.type === "event" && item.name === "SubscriptionDetails",
      )
      expect(subscriptionDetailsEvent).toBeDefined()

      // Check for indexed user field
      const inputs = subscriptionDetailsEvent?.inputs || []
      const userInput = inputs.find((input) => input.name === "user")
      expect(userInput).toBeDefined()
      expect(userInput?.indexed).toBe(true)
      expect(userInput?.type).toBe("address")
    })

    it("should contain SubscriptionsRemoved event", () => {
      const subscriptionsRemovedEvent = CONTRACT_ABI.find(
        (item) => item.type === "event" && item.name === "SubscriptionsRemoved",
      )
      expect(subscriptionsRemovedEvent).toBeDefined()

      // Check for indexed user field and numberOfFlightsUnsubscribed
      const inputs = subscriptionsRemovedEvent?.inputs || []
      const userInput = inputs.find((input) => input.name === "user")
      const numberOfFlightsInput = inputs.find((input) => input.name === "numberOfFlightsUnsubscribed")

      expect(userInput).toBeDefined()
      expect(userInput?.indexed).toBe(true)
      expect(numberOfFlightsInput).toBeDefined()
      expect(numberOfFlightsInput?.type).toBe("uint256")
    })

    it("should have valid UTC time struct in FlightDataSet", () => {
      const flightDataSetEvent = CONTRACT_ABI.find((item) => item.type === "event" && item.name === "FlightDataSet")
      const utcTimesInput = flightDataSetEvent?.inputs?.find((input) => input.name === "utcTimes")
      const components = utcTimesInput?.components || []

      const expectedFields = [
        "actualArrivalUTC",
        "actualDepartureUTC",
        "estimatedArrivalUTC",
        "estimatedDepartureUTC",
        "scheduledArrivalUTC",
        "scheduledDepartureUTC",
      ]

      expectedFields.forEach((field) => {
        const component = components.find((c) => c.name === field)
        expect(component).toBeDefined()
        expect(component?.type).toBe("string")
      })
    })
  })

  describe("CONTRACT_ADDRESS", () => {
    it("should be a valid Ethereum address", () => {
      expect(typeof CONTRACT_ADDRESS).toBe("string")
      expect(CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(CONTRACT_ADDRESS).toBe("0x2Ff328B1B84a78aB61c41ca7D7c3302dD775fDAa")
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
      // Test that constants can be used in a typical blockchain connection scenario
      expect(typeof CONTRACT_ABI).toBe("object")
      expect(typeof CONTRACT_ADDRESS).toBe("string")
      expect(typeof WS_PROVIDER_URL).toBe("string")

      // Verify they have the expected formats for blockchain integration
      expect(Array.isArray(CONTRACT_ABI)).toBe(true)
      expect(CONTRACT_ADDRESS.startsWith("0x")).toBe(true)
      expect(WS_PROVIDER_URL.startsWith("wss://")).toBe(true)
    })
  })
})
