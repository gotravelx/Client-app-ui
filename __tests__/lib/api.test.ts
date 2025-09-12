import { fetchHistoricalFlightData, decryptFlightData } from "@/lib/api"
import type { jest } from "@jest/globals"

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe("API Functions", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe("fetchHistoricalFlightData", () => {
    const mockFlightData = {
      flightDetails: [
        {
          flightNumber: "3682",
          carrierCode: "UA",
          departureAirport: "SFO",
          arrivalAirport: "LAX",
          status: "ON_TIME",
        },
      ],
    }

    it("fetches historical flight data successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFlightData,
      } as Response)

      const result = await fetchHistoricalFlightData("3682", "UA", "2024-01-01", "2024-01-02")

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/flights/fetch-historical/3682/date-range"),
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      )
      expect(result).toEqual(mockFlightData)
    })

    it("includes correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFlightData,
      } as Response)

      await fetchHistoricalFlightData("3682", "UA", "2024-01-01", "2024-01-02")

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain("fromDate=2024-01-01")
      expect(calledUrl).toContain("toDate=2024-01-02")
      expect(calledUrl).toContain("carrierCode=UA")
    })

    it("throws error when API response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      await expect(fetchHistoricalFlightData("3682", "UA", "2024-01-01", "2024-01-02")).rejects.toThrow(
        "API error: 404",
      )
    })

    it("throws error when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      await expect(fetchHistoricalFlightData("3682", "UA", "2024-01-01", "2024-01-02")).rejects.toThrow("Network error")
    })
  })

  describe("decryptFlightData", () => {
    const mockDecryptedData = ["UA", "3682", "SFO", "LAX"]

    it("decrypts flight data successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDecryptedData,
      } as Response)

      const encryptedData = ["encrypted1", "encrypted2", "encrypted3", "encrypted4"]
      const result = await decryptFlightData(encryptedData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/flights/decrypt-flight-data"),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ encryptedData }),
        }),
      )
      expect(result).toEqual(mockDecryptedData)
    })

    it("throws error when decryption API response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response)

      await expect(decryptFlightData(["encrypted1", "encrypted2"])).rejects.toThrow("Decryption API error: 400")
    })

    it("throws error when decryption fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Decryption network error"))

      await expect(decryptFlightData(["encrypted1", "encrypted2"])).rejects.toThrow("Decryption network error")
    })
  })
})
