// Set environment variables BEFORE importing API functions
process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.test.com"

import { fetchHistoricalFlightData, decryptFlightData } from "@/lib/api"
import type { jest } from "@jest/globals"

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe("API Functions - Edge Cases and Error Handling", () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Reset environment variable to default for each test
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.test.com"
  })

  describe("fetchHistoricalFlightData - Edge Cases", () => {
    it("handles empty response data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const result = await fetchHistoricalFlightData("", "", "", "")
      expect(result).toEqual({})
    })

    it("handles malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON")
        },
      } as unknown as Response)

      await expect(fetchHistoricalFlightData("123", "AA", "2024-01-01", "2024-01-02")).rejects.toThrow("Invalid JSON")
    })

    it("handles special characters in flight parameters", async () => {
      const mockData = { flightDetails: [] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      await fetchHistoricalFlightData("AA@123", "A&A", "2024/01/01", "2024/01/02")

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain("AA@123")
      expect(calledUrl).toContain("carrierCode=A&A")
    })

    it("handles missing environment variable", async () => {
      // Temporarily delete env before importing API
      delete process.env.NEXT_PUBLIC_API_BASE_URL

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const result = await fetchHistoricalFlightData("123", "AA", "2024-01-01", "2024-01-02")
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain("https://api.test.com/v1/flights")
    })

    it("handles different HTTP error status codes", async () => {
      const statusCodes = [400, 401, 403, 404, 500, 502, 503]

      for (const status of statusCodes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
        } as Response)

        await expect(fetchHistoricalFlightData("123", "AA", "2024-01-01", "2024-01-02")).rejects.toThrow(
          `API error: ${status}`,
        )

        mockFetch.mockClear()
      }
    })

    it("handles timeout scenarios", async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 100)),
      )

      await expect(fetchHistoricalFlightData("123", "AA", "2024-01-01", "2024-01-02")).rejects.toThrow(
        "Request timeout",
      )
    })
  })

  describe("decryptFlightData - Edge Cases", () => {
    it("handles empty encrypted data array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const result = await decryptFlightData([])
      expect(result).toEqual([])
    })

    it("handles large encrypted data arrays", async () => {
      const largeArray = new Array(1000).fill("encrypted_data")
      const mockResponse = new Array(1000).fill("decrypted_data")

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await decryptFlightData(largeArray)
      expect(result).toEqual(mockResponse)

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
      expect(requestBody.encryptedData).toHaveLength(1000)
    })

    it("handles malformed decryption response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Malformed decryption response")
        },
      } as unknown as Response)

      await expect(decryptFlightData(["test"])).rejects.toThrow("Malformed decryption response")
    })

    it("handles null and undefined values in encrypted data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ["decrypted1", null, "decrypted3"],
      } as Response)

      // @ts-ignore - Testing runtime behavior with invalid types
      const result = await decryptFlightData(["encrypted1", null, "encrypted3"])
      expect(result).toEqual(["decrypted1", null, "decrypted3"])
    })

    it("handles different decryption error status codes", async () => {
      const statusCodes = [400, 401, 422, 500]

      for (const status of statusCodes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
        } as Response)

        await expect(decryptFlightData(["test"])).rejects.toThrow(`Decryption API error: ${status}`)

        mockFetch.mockClear()
      }
    })
  })

  describe("API Integration Edge Cases", () => {
    it("handles concurrent API calls", async () => {
      const mockFlightData = { flightDetails: [{ id: 1 }] }
      const mockDecryptedData = ["decrypted"]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFlightData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDecryptedData,
        } as Response)

      const [flightResult, decryptResult] = await Promise.all([
        fetchHistoricalFlightData("123", "AA", "2024-01-01", "2024-01-02"),
        decryptFlightData(["encrypted"]),
      ])

      expect(flightResult).toEqual(mockFlightData)
      expect(decryptResult).toEqual(mockDecryptedData)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("handles API calls with different base URLs", async () => {
      // Re-import the API after changing env
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://different-api.com"
      jest.isolateModules(() => {
        const { fetchHistoricalFlightData: fetchWithDifferentBase } = require("@/lib/api")
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)

        return fetchWithDifferentBase("123", "AA", "2024-01-01", "2024-01-02").then(() => {
          const calledUrl = mockFetch.mock.calls[0][0] as string
          expect(calledUrl).toContain("https://different-api.com")
        })
      })
    })
  })
})
