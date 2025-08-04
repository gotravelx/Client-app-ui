"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, Clock, MapPin, Users, AlertCircle } from "lucide-react"
import { FlightStatusBadge } from "@/components/flight-status-badge"

interface FlightDetailsProps {
  flight: any
}

export function FlightDetails({ flight }: FlightDetailsProps) {
  if (!flight) return null

  const getDelayInfo = (delayMinutes: string) => {
    const delay = Number.parseInt(delayMinutes)
    if (delay > 0) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          {delay}min delay
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Flight Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6" />
              {flight.carrierCode} {flight.flightNumber}
            </CardTitle>
            <FlightStatusBadge status={flight.status?.statusCode || flight.flightStatus} />
          </div>
          <CardDescription>
            {flight.scheduledDepartureDate} • {flight.equipmentModel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold">{flight.departureAirport}</div>
              <div className="text-sm text-muted-foreground">{flight.departureCity}</div>
            </div>
            <div className="flex-1 mx-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed"></div>
                </div>
                <div className="relative flex justify-center">
                  <Plane className="h-5 w-5 bg-background px-1" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{flight.arrivalAirport}</div>
              <div className="text-sm text-muted-foreground">{flight.arrivalCity}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Flight Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Departure</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled:</span>
                  <span>{flight.utcTimes?.scheduledDeparture || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span className="flex items-center">
                    {flight.utcTimes?.estimatedDeparture || "N/A"}
                    {getDelayInfo(flight.utcTimes?.departureDelayMinutes || "0")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual:</span>
                  <span>{flight.utcTimes?.actualDeparture || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gate:</span>
                  <span>{flight.departureGate || "TBD"}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Arrival</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled:</span>
                  <span>{flight.utcTimes?.scheduledArrival || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span className="flex items-center">
                    {flight.utcTimes?.estimatedArrival || "N/A"}
                    {getDelayInfo(flight.utcTimes?.arrivalDelayMinutes || "0")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual:</span>
                  <span>{flight.utcTimes?.actualArrival || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gate:</span>
                  <span>{flight.arrivalGate || "TBD"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Status Details */}
      {flight.status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Status Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status Description</p>
                <p className="font-medium">{flight.status.statusDescription}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="font-medium">{flight.status.statusDescription}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departure State</p>
                <p className="font-medium">{flight.status.departureState}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Arrival State</p>
                <p className="font-medium">{flight.status.arrivalState}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marketed Flight Segments */}
      {flight.marketedFlightSegments && flight.marketedFlightSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Marketed Flight Segments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flight.marketedFlightSegments.map((segment: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{segment.marketingAirlineCode}</span>
                  <span>{segment.flightNumber}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
