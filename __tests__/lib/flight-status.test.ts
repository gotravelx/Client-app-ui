import { FLIGHT_STATUS_CODES, getDepartureStateColor, getArrivalStateColor } from "@/lib/flight-status"

describe("Flight Status Utils", () => {
  describe("FLIGHT_STATUS_CODES", () => {
    it("contains correct status mappings", () => {
      expect(FLIGHT_STATUS_CODES.NDPT).toEqual({
        display: "Not Departed",
        variant: "secondary",
      })

      expect(FLIGHT_STATUS_CODES.CNCL).toEqual({
        display: "Cancelled",
        variant: "destructive",
      })

      expect(FLIGHT_STATUS_CODES.OUT).toEqual({
        display: "Departed Gate",
        variant: "default",
      })

      expect(FLIGHT_STATUS_CODES.ONT).toEqual({
        display: "On Time",
        variant: "default",
      })
    })
  })

  describe("getDepartureStateColor", () => {
    it("returns correct colors for different departure states", () => {
      expect(getDepartureStateColor("DLY")).toBe("bg-orange-100 text-orange-800")
      expect(getDepartureStateColor("delayed")).toBe("bg-orange-100 text-orange-800")

      expect(getDepartureStateColor("CNL")).toBe("bg-red-100 text-red-800")
      expect(getDepartureStateColor("cancelled")).toBe("bg-red-100 text-red-800")

      expect(getDepartureStateColor("PND")).toBe("bg-yellow-100 text-yellow-800")
      expect(getDepartureStateColor("pending")).toBe("bg-yellow-100 text-yellow-800")

      expect(getDepartureStateColor("ONT")).toBe("bg-green-100 text-green-800")
      expect(getDepartureStateColor("on time")).toBe("bg-green-100 text-green-800")
      expect(getDepartureStateColor("CA")).toBe("bg-green-100 text-green-800")
    })

    it("returns default color for unknown states", () => {
      expect(getDepartureStateColor("UNKNOWN")).toBe("bg-gray-100 text-gray-800")
      expect(getDepartureStateColor("")).toBe("bg-gray-200 text-gray-700")
    })

    it("handles case insensitive input", () => {
      expect(getDepartureStateColor("DELAYED")).toBe("bg-orange-100 text-orange-800")
      expect(getDepartureStateColor("Delayed")).toBe("bg-orange-100 text-orange-800")
      expect(getDepartureStateColor("delayed")).toBe("bg-orange-100 text-orange-800")
    })
  })

  describe("getArrivalStateColor", () => {
    it("returns correct colors for different arrival states", () => {
      expect(getArrivalStateColor("ERL")).toBe("bg-green-100 text-green-800")
      expect(getArrivalStateColor("early")).toBe("bg-green-100 text-green-800")

      expect(getArrivalStateColor("DLY")).toBe("bg-orange-100 text-orange-800")
      expect(getArrivalStateColor("delayed")).toBe("bg-orange-100 text-orange-800")

      expect(getArrivalStateColor("CNL")).toBe("bg-red-100 text-red-800")
      expect(getArrivalStateColor("cancelled")).toBe("bg-red-100 text-red-800")

      expect(getArrivalStateColor("DVT")).toBe("bg-purple-100 text-purple-800")
      expect(getArrivalStateColor("rerouted")).toBe("bg-purple-100 text-purple-800")

      expect(getArrivalStateColor("CO")).toBe("bg-green-100 text-green-800")
      expect(getArrivalStateColor("on time")).toBe("bg-green-100 text-green-800")
    })

    it("returns default color for unknown states", () => {
      expect(getArrivalStateColor("UNKNOWN")).toBe("bg-gray-100 text-gray-800")
      expect(getArrivalStateColor("")).toBe("bg-gray-200 text-gray-700")
    })

    it("handles case insensitive input", () => {
      expect(getArrivalStateColor("EARLY")).toBe("bg-green-100 text-green-800")
      expect(getArrivalStateColor("Early")).toBe("bg-green-100 text-green-800")
      expect(getArrivalStateColor("early")).toBe("bg-green-100 text-green-800")
    })
  })
})
