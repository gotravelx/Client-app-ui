"use client";

import { Badge } from "@/components/ui/badge";

import { useState } from "react";
import type { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, Plane } from "lucide-react";

interface FlightDetailsProps {
  contract: ethers.Contract | null;
}

interface FlightData {
  flightNumber: string;
  scheduledDepartureDate: string;
  carrierCode: string;
  arrivalCity: string;
  departureCity: string;
  arrivalAirport: string;
  departureAirport: string;
  operatingAirlineCode: string;
  arrivalGate: string;
  departureGate: string;
  flightStatus: string;
  equipmentModel: string;
}

interface UtcTime {
  actualArrivalUTC: string;
  actualDepartureUTC: string;
  estimatedArrivalUTC: string;
  estimatedDepartureUTC: string;
  scheduledArrivalUTC: string;
  scheduledDepartureUTC: string;
  arrivalDelayMinutes: string;
  departureDelayMinutes: string;
  baggageClaim: string;
}

interface FlightStatus {
  flightStatusCode: string;
  flightStatusDescription: string;
  ArrivalState: string;
  DepartureState: string;
  outUtc: string;
  offUtc: string;
  onUtc: string;
  inUtc: string;
}

export function FlightDetails({ contract }: FlightDetailsProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [carrierCode, setCarrierCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [utcTime, setUtcTime] = useState<UtcTime | null>(null);
  const [flightStatus, setFlightStatus] = useState<FlightStatus | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const fetchFlightDetails = async () => {
    if (!contract) {
      setError("Contract not initialized");
      return;
    }

    if (!flightNumber || !departureDate || !carrierCode) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First subscribe to the flight to be able to get details
      await contract.addFlightSubscription(flightNumber, carrierCode, "");

      // Then get flight details
      const result = await contract.getFlightDetails(
        flightNumber,
        departureDate,
        carrierCode
      );

      setFlightData(result[0]);
      setUtcTime(result[1]);
      setFlightStatus(result[2]);
      setCurrentStatus(result[4]);
    } catch (err: any) {
      console.error("Error fetching flight details:", err);
      setError(err.message || "Failed to fetch flight details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="flightNumber">Flight Number</Label>
          <Input
            id="flightNumber"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            placeholder="e.g. UA1234"
          />
        </div>
        <div>
          <Label htmlFor="departureDate">Departure Date</Label>
          <Input
            id="departureDate"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div>
          <Label htmlFor="carrierCode">Carrier Code</Label>
          <Input
            id="carrierCode"
            value={carrierCode}
            onChange={(e) => setCarrierCode(e.target.value)}
            placeholder="e.g. UA"
          />
        </div>
      </div>

      <Button onClick={fetchFlightDetails} disabled={loading || !contract}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Fetch Flight Details
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {flightData && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plane className="h-6 w-6" />
                  <h3 className="text-xl font-bold">
                    {flightData.flightNumber}
                  </h3>
                </div>
                <Badge variant="outline" className="text-lg">
                  {currentStatus || flightData.flightStatus}
                </Badge>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Flight Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm">Carrier:</div>
                      <div className="text-sm font-medium">
                        {flightData.carrierCode}
                      </div>

                      <div className="text-sm">Operating Airline:</div>
                      <div className="text-sm font-medium">
                        {flightData.operatingAirlineCode}
                      </div>

                      <div className="text-sm">Equipment:</div>
                      <div className="text-sm font-medium">
                        {flightData.equipmentModel}
                      </div>

                      <div className="text-sm">Scheduled Departure:</div>
                      <div className="text-sm font-medium">
                        {flightData.scheduledDepartureDate}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Departure
                    </h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm">City:</div>
                      <div className="text-sm font-medium">
                        {flightData.departureCity}
                      </div>

                      <div className="text-sm">Airport:</div>
                      <div className="text-sm font-medium">
                        {flightData.departureAirport}
                      </div>

                      <div className="text-sm">Gate:</div>
                      <div className="text-sm font-medium">
                        {flightData.departureGate}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Arrival
                    </h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm">City:</div>
                      <div className="text-sm font-medium">
                        {flightData.arrivalCity}
                      </div>

                      <div className="text-sm">Airport:</div>
                      <div className="text-sm font-medium">
                        {flightData.arrivalAirport}
                      </div>

                      <div className="text-sm">Gate:</div>
                      <div className="text-sm font-medium">
                        {flightData.arrivalGate}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Status Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-sm">Status Code:</div>
                      <div className="text-sm font-medium">
                        {flightStatus?.flightStatusCode}
                      </div>

                      <div className="text-sm">Description:</div>
                      <div className="text-sm font-medium">
                        {flightStatus?.flightStatusDescription}
                      </div>

                      <div className="text-sm">Departure Status:</div>
                      <div className="text-sm font-medium">
                        {flightStatus?.DepartureState}
                      </div>

                      <div className="text-sm">Arrival Status:</div>
                      <div className="text-sm font-medium">
                        {flightStatus?.ArrivalState}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Flight Timeline
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="p-2 border rounded-md">
                    <div className="text-xs text-muted-foreground">
                      OUT (Departed)
                    </div>
                    <div className="text-sm font-medium">
                      {flightStatus?.outUtc || "N/A"}
                    </div>
                  </div>
                  <div className="p-2 border rounded-md">
                    <div className="text-xs text-muted-foreground">
                      OFF (In Flight)
                    </div>
                    <div className="text-sm font-medium">
                      {flightStatus?.offUtc || "N/A"}
                    </div>
                  </div>
                  <div className="p-2 border rounded-md">
                    <div className="text-xs text-muted-foreground">
                      ON (Landed)
                    </div>
                    <div className="text-sm font-medium">
                      {flightStatus?.onUtc || "N/A"}
                    </div>
                  </div>
                  <div className="p-2 border rounded-md">
                    <div className="text-xs text-muted-foreground">
                      IN (At Gate)
                    </div>
                    <div className="text-sm font-medium">
                      {flightStatus?.inUtc || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
