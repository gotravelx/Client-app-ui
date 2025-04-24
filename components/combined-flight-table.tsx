"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Plane,
  ArrowRight,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { getBaseUrl } from "@/utils/base_url";

interface CombinedFlightTableProps {
  events: Array<{ [key: string]: any }>;
}

type FlightKey = string; // Format: "flightNumber-carrierCode-departureDate"
type CombinedFlightData = {
  key: FlightKey;
  lastUpdated: string;
  flightNumber: string;
  carrierCode: string;
  scheduledDepartureDate: string;
  departureCity: string;
  arrivalCity: string;
  departureAirport: string;
  arrivalAirport: string;
  departureGate: string;
  arrivalGate: string;
  operatingAirlineCode: string;
  equipmentModel: string;
  flightStatus: string;
  flightStatusCode: string;
  currentFlightStatusTime: string;
  departureStatus: string;
  arrivalStatus: string;
  baggageClaim: string;
  // UTC times
  scheduledDepartureUTC: string;
  scheduledArrivalUTC: string;
  estimatedDepartureUTC: string;
  estimatedArrivalUTC: string;
  actualDepartureUTC: string;
  actualArrivalUTC: string;
  departureDelayMinutes: string;
  arrivalDelayMinutes: string;
  // Flight timeline
  outUtc: string;
  offUtc: string;
  onUtc: string;
  inUtc: string;
  // Raw events for reference
  events: any[];
  // Encrypted data tracking
  encryptedData: Record<string, string[]>;
  decryptedData: Record<string, string[]>;
  isDecrypting: boolean;
};

// Helper function to check if a string might be encrypted
const isLikelyEncrypted = (str: string): boolean => {
  if (!str) return false;

  // Check for common encryption patterns (hex:base64)
  const encryptionPattern = /^[a-f0-9]{32}:[A-Za-z0-9+/=]+$/;
  const encryptionPatternExtended = /^[a-f0-9]{32}:[A-Za-z0-9+/=]{10,}$/;

  return encryptionPattern.test(str) || encryptionPatternExtended.test(str);
};

export function CombinedFlightTable({ events }: CombinedFlightTableProps) {
  const [combinedData, setCombinedData] = useState<CombinedFlightData[]>([]);
  const [selectedFlight, setSelectedFlight] =
    useState<CombinedFlightData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Process and combine events
    const flightMap = new Map<FlightKey, CombinedFlightData>();

    events.forEach((event) => {
      if (!event.args) return;

      // Create a unique key for each flight
      const flightNumber = event.args.flightNumber || "";
      const carrierCode = event.args.carrierCode || "";
      const scheduledDepartureDate = event.args.scheduledDepartureDate || "";

      if (!flightNumber || !carrierCode) return;

      const key = `${flightNumber}-${carrierCode}-${scheduledDepartureDate}`;

      // Get existing data or create new entry
      const flightData = flightMap.get(key) || {
        key,
        lastUpdated: event.timestamp || new Date().toISOString(),
        flightNumber,
        carrierCode,
        scheduledDepartureDate,
        departureCity: "",
        arrivalCity: "",
        departureAirport: "",
        arrivalAirport: "",
        departureGate: "",
        arrivalGate: "",
        operatingAirlineCode: "",
        equipmentModel: "",
        flightStatus: "",
        flightStatusCode: "",
        currentFlightStatusTime: "",
        departureStatus: "",
        arrivalStatus: "",
        baggageClaim: "",
        scheduledDepartureUTC: "",
        scheduledArrivalUTC: "",
        estimatedDepartureUTC: "",
        estimatedArrivalUTC: "",
        actualDepartureUTC: "",
        actualArrivalUTC: "",
        departureDelayMinutes: "",
        arrivalDelayMinutes: "",
        outUtc: "",
        offUtc: "",
        onUtc: "",
        inUtc: "",
        events: [] as Array<{ [key: string]: any }>,
        encryptedData: {},
        decryptedData: {},
        isDecrypting: false,
      };

      // Update the last updated timestamp
      if (
        event.timestamp &&
        new Date(event.timestamp) > new Date(flightData.lastUpdated)
      ) {
        flightData.lastUpdated = event.timestamp;
      }

      // Add this event to the flight's event list
      flightData.events.push(event);

      // Check for encrypted data in this event
      if (event.args) {
        Object.entries(event.args).forEach(([key, value]) => {
          if (typeof value === "string" && isLikelyEncrypted(value)) {
            if (
              !flightData.encryptedData[
                key as keyof typeof flightData.encryptedData
              ]
            ) {
              (flightData.encryptedData as Record<string, string[]>)[key] = [];
            }
            if (
              !(flightData.encryptedData as Record<string, string[]>)[
                key
              ].includes(value as string)
            ) {
              (flightData.encryptedData as Record<string, string[]>)[key].push(
                value as string
              );
            }
          }
        });
      }

      // Update data based on event type
      if (event.eventName === "FlightDataSet") {
        // Update flight details
        flightData.departureCity =
          event.args.departureCity || flightData.departureCity;
        flightData.arrivalCity =
          event.args.arrivalCity || flightData.arrivalCity;
        flightData.departureAirport =
          event.args.departureAirport || flightData.departureAirport;
        flightData.arrivalAirport =
          event.args.arrivalAirport || flightData.arrivalAirport;
        flightData.departureGate =
          event.args.departureGate || flightData.departureGate;
        flightData.arrivalGate =
          event.args.arrivalGate || flightData.arrivalGate;
        flightData.operatingAirlineCode =
          event.args.operatingAirlineCode || flightData.operatingAirlineCode;
        flightData.equipmentModel =
          event.args.equipmentModel || flightData.equipmentModel;
        flightData.flightStatus =
          event.args.CurrentFlightStatus || flightData.flightStatus;

        // Update UTC times if available
        if (event.args.utcTimes) {
          flightData.scheduledDepartureUTC =
            event.args.utcTimes.scheduledDepartureUTC ||
            flightData.scheduledDepartureUTC;
          flightData.scheduledArrivalUTC =
            event.args.utcTimes.scheduledArrivalUTC ||
            flightData.scheduledArrivalUTC;
          flightData.estimatedDepartureUTC =
            event.args.utcTimes.estimatedDepartureUTC ||
            flightData.estimatedDepartureUTC;
          flightData.estimatedArrivalUTC =
            event.args.utcTimes.estimatedArrivalUTC ||
            flightData.estimatedArrivalUTC;
          flightData.actualDepartureUTC =
            event.args.utcTimes.actualDepartureUTC ||
            flightData.actualDepartureUTC;
          flightData.actualArrivalUTC =
            event.args.utcTimes.actualArrivalUTC || flightData.actualArrivalUTC;
        }
      } else if (
        event.eventName === "currentFlightStatus" ||
        event.eventName === "FlightStatusUpdate"
      ) {
        // Update flight status
        flightData.flightStatus =
          event.args.FlightStatus || flightData.flightStatus;
        flightData.flightStatusCode =
          event.args.FlightStatusCode || flightData.flightStatusCode;
        flightData.currentFlightStatusTime =
          event.args.currentFlightStatusTime ||
          flightData.currentFlightStatusTime;
      } else if (event.eventName === "UTCTimeSet") {
        // Update UTC times
        flightData.scheduledDepartureUTC =
          event.args.scheduledDepartureUTC || flightData.scheduledDepartureUTC;
        flightData.scheduledArrivalUTC =
          event.args.scheduledArrivalUTC || flightData.scheduledArrivalUTC;
        flightData.estimatedDepartureUTC =
          event.args.estimatedDepartureUTC || flightData.estimatedDepartureUTC;
        flightData.estimatedArrivalUTC =
          event.args.estimatedArrivalUTC || flightData.estimatedArrivalUTC;
        flightData.actualDepartureUTC =
          event.args.actualDepartureUTC || flightData.actualDepartureUTC;
        flightData.actualArrivalUTC =
          event.args.actualArrivalUTC || flightData.actualArrivalUTC;
        flightData.departureDelayMinutes =
          event.args.departureDelayMinutes || flightData.departureDelayMinutes;
        flightData.arrivalDelayMinutes =
          event.args.arrivalDelayMinutes || flightData.arrivalDelayMinutes;
        flightData.baggageClaim =
          event.args.baggageClaim || flightData.baggageClaim;
      }

      // Update flight timeline data if available
      if (event.args.outUtc) flightData.outUtc = event.args.outUtc;
      if (event.args.offUtc) flightData.offUtc = event.args.offUtc;
      if (event.args.onUtc) flightData.onUtc = event.args.onUtc;
      if (event.args.inUtc) flightData.inUtc = event.args.inUtc;

      // Update departure and arrival status if available
      if (event.args.DepartureStatus)
        flightData.departureStatus = event.args.DepartureStatus;
      if (event.args.ArrivalStatus)
        flightData.arrivalStatus = event.args.ArrivalStatus;

      // Update the map
      flightMap.set(key, flightData);
    });

    // Convert map to array and sort by last updated
    const sortedData = Array.from(flightMap.values()).sort((a, b) => {
      return (
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    });

    setCombinedData(sortedData);
  }, [events]);

  const getStatusBadgeVariant = (status: string) => {
    if (!status) return "outline";

    status = status.toLowerCase();
    if (status.includes("cancel")) return "destructive";
    if (status.includes("landed") || status.includes("arrived"))
      return "default";
    if (status.includes("delayed")) return "secondary";
    return "outline";
  };

  const filteredData = combinedData.filter((flight) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      flight.flightNumber.toLowerCase().includes(searchLower) ||
      flight.carrierCode.toLowerCase().includes(searchLower) ||
      flight.departureAirport.toLowerCase().includes(searchLower) ||
      flight.arrivalAirport.toLowerCase().includes(searchLower) ||
      flight.departureCity.toLowerCase().includes(searchLower) ||
      flight.arrivalCity.toLowerCase().includes(searchLower) ||
      flight.flightStatus.toLowerCase().includes(searchLower)
    );
  });

  const decryptFlightData = async (flight: CombinedFlightData) => {
    if (
      !flight.encryptedData ||
      Object.keys(flight.encryptedData).length === 0
    ) {
      toast({
        title: "No encrypted data",
        description: "This flight doesn't have any encrypted data to decrypt.",
      });
      return;
    }

    // Update the flight to show it's decrypting
    setCombinedData((prev) =>
      prev.map((f) => (f.key === flight.key ? { ...f, isDecrypting: true } : f))
    );

    try {
      // Collect all encrypted values into a single array
      const allEncryptedValues: string[] = [];
      Object.values(flight.encryptedData).forEach((values) => {
        values.forEach((value) => {
          if (!allEncryptedValues.includes(value)) {
            allEncryptedValues.push(value);
          }
        });
      });

      // Call the API to decrypt the data
      const response = await fetch(
        `${getBaseUrl()}/flights/decrypt-flight-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            encryptedData: allEncryptedValues,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Create a mapping of encrypted to decrypted values
      const decryptionMap: Record<string, string> = {};
      allEncryptedValues.forEach((encrypted, index) => {
        if (data.decryptedData[index]) {
          decryptionMap[encrypted] = data.decryptedData[index];
        }
      });

      // Update the flight with decrypted data
      setCombinedData((prev) =>
        prev.map((f) => {
          if (f.key === flight.key) {
            const updatedDecryptedData: Record<string, string[]> = {};

            // For each field with encrypted data
            Object.entries(f.encryptedData).forEach(
              ([field, encryptedValues]) => {
                updatedDecryptedData[field] = encryptedValues.map(
                  (encrypted) => decryptionMap[encrypted] || encrypted
                );

                // Also update the actual field with the decrypted value if applicable
                if (
                  encryptedValues.length === 1 &&
                  decryptionMap[encryptedValues[0]]
                ) {
                  // @ts-ignore - Dynamic field access
                  f[field] = decryptionMap[encryptedValues[0]];
                }
              }
            );

            return {
              ...f,
              decryptedData: updatedDecryptedData,
              isDecrypting: false,
            };
          }
          return f;
        })
      );

      toast({
        title: "Decryption successful",
        description: `Successfully decrypted ${
          Object.keys(decryptionMap).length
        } values.`,
      });

      // If this is the selected flight, update it
      if (selectedFlight && selectedFlight.key === flight.key) {
        const updatedFlight = combinedData.find((f) => f.key === flight.key);
        if (updatedFlight) {
          setSelectedFlight(updatedFlight);
        }
      }
    } catch (error) {
      console.error("Error decrypting data:", error);
      toast({
        title: "Decryption failed",
        description: "Failed to decrypt flight data. Please try again.",
        variant: "destructive",
      });

      // Reset the decrypting state
      setCombinedData((prev) =>
        prev.map((f) =>
          f.key === flight.key ? { ...f, isDecrypting: false } : f
        )
      );
    }
  };

  const hasEncryptedData = (flight: CombinedFlightData) => {
    return Object.keys(flight.encryptedData).length > 0;
  };

  // Modify the renderCellValue function to handle all fields consistently
  const renderCellValue = (
    flight: CombinedFlightData,
    field: keyof CombinedFlightData
  ) => {
    const value = flight[field] as string;

    if (!value) return "TBD";

    // Check if this value is encrypted (regardless of whether it's tracked in encryptedData)
    if (isLikelyEncrypted(value)) {
      // If we have decrypted this field
      if (flight.decryptedData[field] && flight.decryptedData[field][0]) {
        return (
          <div className="flex items-center gap-1">
            <Unlock className="h-3 w-3 text-green-500" />
            <span>{flight.decryptedData[field][0]}</span>
          </div>
        );
      }

      // If it's still encrypted, just show "Encrypted" instead of the raw value
      return (
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-amber-500" />
          <span className="text-xs">Encrypted</span>
        </div>
      );
    }

    return value;
  };

  return (
    <ScrollArea className="h-[600px] w-full rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-[100px]">Flt Nbr</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Dep Stn</TableHead>
            <TableHead>Arr Stn</TableHead>
            <TableHead>Flt Status</TableHead>
            <TableHead>Dep State</TableHead>
            <TableHead>Arr State</TableHead>
            <TableHead>Sch Dep</TableHead>
            <TableHead>Sch Arr</TableHead>
            <TableHead>Est Dep</TableHead>
            <TableHead>Est Arr</TableHead>
            <TableHead>Act Dep</TableHead>
            <TableHead>Act Arr</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((flight, index) => (
            <TableRow
              key={flight.key}
              className={index % 2 === 0 ? "bg-muted/20 overflow-x-auto" : ""}
            >
              <TableCell className="font-medium">
                {flight.flightNumber}
              </TableCell>
              <TableCell>
                {isLikelyEncrypted(flight?.carrierCode) ? (
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-amber-500" />
                    <span className="text-xs">Encrypted</span>
                  </div>
                ) : (
                  <span>{flight.carrierCode}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  {isLikelyEncrypted(flight.departureAirport) ? (
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-amber-500" />
                      <span className="text-xs">Encrypted</span>
                    </div>
                  ) : (
                    <span>{flight.departureAirport}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  {isLikelyEncrypted(flight.arrivalAirport) ? (
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-amber-500" />
                      <span className="text-xs">Encrypted</span>
                    </div>
                  ) : (
                    <span>{flight.arrivalAirport}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {isLikelyEncrypted(flight.flightStatus) ? (
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-amber-500" />
                    <span className="text-xs">Encrypted</span>
                  </div>
                ) : (
                  <Badge variant={getStatusBadgeVariant(flight.flightStatus)}>
                    {flight.flightStatus || "Unknown"}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {renderCellValue(flight, "departureStatus")}
              </TableCell>
              <TableCell>{renderCellValue(flight, "arrivalStatus")}</TableCell>
              <TableCell>
                {renderCellValue(flight, "scheduledDepartureUTC")}
              </TableCell>
              <TableCell>
                {renderCellValue(flight, "scheduledArrivalUTC")}
              </TableCell>
              <TableCell>
                {renderCellValue(flight, "estimatedDepartureUTC")}
              </TableCell>
              <TableCell>
                {renderCellValue(flight, "estimatedArrivalUTC")}
              </TableCell>
              <TableCell>
                {renderCellValue(flight, "actualDepartureUTC")}
              </TableCell>
              <TableCell>
                {renderCellValue(flight, "actualArrivalUTC")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {hasEncryptedData(flight) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => decryptFlightData(flight)}
                      disabled={flight.isDecrypting}
                    >
                      {flight.isDecrypting ? (
                        <div className="flex items-center">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent mr-1"></div>
                          <span>Decrypting</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Unlock className="h-3 w-3 mr-1" />
                          <span>Decrypt</span>
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
