"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Loader2, Plane } from "lucide-react"
import { fetchHistoricalFlightData, decryptFlightData } from "@/lib/api"
import { FlightStatusBadge } from "@/components/flight-status-badge"

interface FlightSearchProps {
  onFlightSelect: (flight: any) => void
}

export function FlightSearch({ onFlightSelect }: FlightSearchProps) {
  const [flightNumber, setFlightNumber] = useState("")
  const [carrierCode, setCarrierCode] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleSearch = async () => {
    if (!flightNumber || !carrierCode || !fromDate || !toDate) {
      return
    }

    setLoading(true)
    try {
      const data = await fetchHistoricalFlightData(flightNumber, carrierCode, fromDate, toDate)

      // Decrypt encrypted data if present
      const encryptedFields = []
      if (data.flightDetails) {
        for (const flight of data.flightDetails) {
          if (flight.marketedFlightSegments) {
            for (const segment of flight.marketedFlightSegments) {
              if (segment.marketingAirlineCode) {
                encryptedFields.push(segment.marketingAirlineCode)
              }
              if (segment.flightNumber) {
                encryptedFields.push(segment.flightNumber)
              }
            }
          }
        }
      }

      if (encryptedFields.length > 0) {
        const decryptedData = await decryptFlightData(encryptedFields)
        // Apply decrypted data back to the results
        let decryptIndex = 0
        for (const flight of data.flightDetails) {
          if (flight.marketedFlightSegments) {
            for (const segment of flight.marketedFlightSegments) {
              if (segment.marketingAirlineCode && decryptedData[decryptIndex]) {
                segment.marketingAirlineCode = decryptedData[decryptIndex++]
              }
              if (segment.flightNumber && decryptedData[decryptIndex]) {
                segment.flightNumber = decryptedData[decryptIndex++]
              }
            }
          }
        }
      }

      setSearchResults(data.flightDetails || [])
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="flightNumber">Flight Number</Label>
          <Input
            id="flightNumber"
            placeholder="e.g., 3682"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="carrierCode">Carrier Code</Label>
          <Input
            id="carrierCode"
            placeholder="e.g., UA"
            value={carrierCode}
            onChange={(e) => setCarrierCode(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="fromDate">From Date</Label>
          <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="toDate">To Date</Label>
          <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <Button onClick={handleSearch} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
        Search Flights
      </Button>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          {searchResults.map((flight, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onFlightSelect(flight)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    {flight.carrierCode} {flight.flightNumber}
                  </CardTitle>
                  <FlightStatusBadge status={flight.status?.statusCode || flight.flightStatus} />
                </div>
                <CardDescription>
                  {flight.departureCity} ({flight.departureAirport}) → {flight.arrivalCity} ({flight.arrivalAirport})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Departure</p>
                    <p>{flight.utcTimes?.scheduledDeparture || "N/A"}</p>
                    <p className="text-muted-foreground">Gate: {flight.departureGate || "TBD"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Arrival</p>
                    <p>{flight.utcTimes?.scheduledArrival || "N/A"}</p>
                    <p className="text-muted-foreground">Gate: {flight.arrivalGate || "TBD"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
