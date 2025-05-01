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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBaseUrl } from "@/utils/base_url";
import { FlightSearchHeader } from "./flight-search-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CombinedFlightTableProps {
  events: Array<{ [key: string]: any }>;
}

type FlightData = {
  eventId: string; // Unique identifier for each event
  timestamp: string; // Event timestamp
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
  // Raw event for reference
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

// Function to get color for flight status
const getFlightStatusColor = (status: string): string => {
  if (!status) return "bg-gray-200 text-gray-700";

  const statusLower = status.toLowerCase();

  if (statusLower.includes("not departed") || statusLower === "ndpt")
    return "bg-blue-100 text-blue-800";
  if (statusLower.includes("departed") || statusLower === "out")
    return "bg-indigo-100 text-indigo-800";
  if (statusLower.includes("in flight") || statusLower === "off")
    return "bg-purple-100 text-purple-800";
  if (statusLower.includes("landed") || statusLower === "on")
    return "bg-amber-100 text-amber-800";
  if (statusLower.includes("arrived") || statusLower === "in")
    return "bg-green-100 text-green-800";
  if (statusLower.includes("cancel")) return "bg-red-100 text-red-800";
  if (statusLower.includes("delay")) return "bg-orange-100 text-orange-800";

  return "bg-gray-100 text-gray-800";
};

// Function to map status codes to human-readable text
const mapStatusCodeToText = (code: string): string => {
  const statusMap: Record<string, string> = {
    NDPT: "Not Departed",
    OUT: "Departed",
    OFF: "In Flight",
    ON: "Landed",
    IN: "Arrived",
  };

  return statusMap[code] || code;
};

// Function to format date/time based on selected format
const formatDateTime = (timestamp: string, format: "utc" | "local"): string => {
  if (!timestamp || timestamp === "TBD" || timestamp === "N/A")
    return timestamp;

  try {
    const date = new Date(timestamp);

    if (format === "utc") {
      return date
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, " UTC");
    } else {
      // Local time format
      return date.toLocaleString();
    }
  } catch (e) {
    return timestamp;
  }
};

export function CombinedFlightTable({ events }: CombinedFlightTableProps) {
  const [flightEvents, setFlightEvents] = useState<FlightData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFormat, setTimeFormat] = useState<"utc" | "local">("utc");
  const { toast } = useToast();

  // Process events by consolidating them based on flight number, carrier code and timestamp
  const processEvents = () => {
    // Group events by timestamp, flight number and carrier code
    const flightEventMap = new Map<string, FlightData>();

    events.forEach((event, index) => {
      if (!event.args || !event.args.flightNumber || !event.args.carrierCode)
        return;

      const timestamp = event.timestamp || new Date().toISOString();
      const flightNumber = event.args.flightNumber;
      const carrierCode = event.args.carrierCode;

      // Create a key combining these elements
      const flightKey = `${
        timestamp.split(".")[0]
      }-${flightNumber}-${carrierCode}`;

      // Get existing flight data or create new
      const existingFlight = flightEventMap.get(flightKey);

      // Initialize flight data
      const flightData: FlightData = existingFlight || {
        eventId: flightKey,
        timestamp: timestamp,
        flightNumber: flightNumber,
        carrierCode: carrierCode,
        scheduledDepartureDate: event.args.scheduledDepartureDate || "",
        departureCity: event.args.departureCity || "",
        arrivalCity: event.args.arrivalCity || "",
        departureAirport: event.args.departureAirport || "",
        arrivalAirport: event.args.arrivalAirport || "",
        departureGate: event.args.departureGate || "",
        arrivalGate: event.args.arrivalGate || "",
        operatingAirlineCode: event.args.operatingAirlineCode || "",
        equipmentModel: event.args.equipmentModel || "",
        flightStatus:
          event.args.CurrentFlightStatus || event.args.FlightStatus || "",
        flightStatusCode: event.args.FlightStatusCode || "",
        currentFlightStatusTime: event.args.currentFlightStatusTime || "",
        departureStatus: event.args.DepartureStatus || "",
        arrivalStatus: event.args.ArrivalStatus || "",
        baggageClaim: event.args.baggageClaim || "",
        scheduledDepartureUTC: "",
        scheduledArrivalUTC: "",
        estimatedDepartureUTC: "",
        estimatedArrivalUTC: "",
        actualDepartureUTC: "",
        actualArrivalUTC: "",
        departureDelayMinutes: event.args.departureDelayMinutes || "",
        arrivalDelayMinutes: event.args.arrivalDelayMinutes || "",
        outUtc: event.args.outUtc || "",
        offUtc: event.args.offUtc || "",
        onUtc: event.args.onUtc || "",
        inUtc: event.args.inUtc || "",
        events: [],
        encryptedData: {},
        decryptedData: {},
        isDecrypting: false,
      };

      // Merge data if we already have an entry
      if (existingFlight) {
        // Only update fields that are empty in the existing entry but have data in the new event
        if (!existingFlight.departureCity && event.args.departureCity)
          flightData.departureCity = event.args.departureCity;

        if (!existingFlight.arrivalCity && event.args.arrivalCity)
          flightData.arrivalCity = event.args.arrivalCity;

        if (!existingFlight.departureAirport && event.args.departureAirport)
          flightData.departureAirport = event.args.departureAirport;

        if (!existingFlight.arrivalAirport && event.args.arrivalAirport)
          flightData.arrivalAirport = event.args.arrivalAirport;

        if (
          !existingFlight.flightStatus &&
          (event.args.CurrentFlightStatus || event.args.FlightStatus)
        )
          flightData.flightStatus =
            event.args.CurrentFlightStatus || event.args.FlightStatus;

        if (!existingFlight.flightStatusCode && event.args.FlightStatusCode)
          flightData.flightStatusCode = event.args.FlightStatusCode;

        // Update other fields similarly
      }

      // Process UTC times if available
      if (event.args.utcTimes) {
        if (
          !flightData.scheduledDepartureUTC &&
          event.args.utcTimes.scheduledDepartureUTC
        )
          flightData.scheduledDepartureUTC =
            event.args.utcTimes.scheduledDepartureUTC;

        if (
          !flightData.scheduledArrivalUTC &&
          event.args.utcTimes.scheduledArrivalUTC
        )
          flightData.scheduledArrivalUTC =
            event.args.utcTimes.scheduledArrivalUTC;

        if (
          !flightData.estimatedDepartureUTC &&
          event.args.utcTimes.estimatedDepartureUTC
        )
          flightData.estimatedDepartureUTC =
            event.args.utcTimes.estimatedDepartureUTC;

        if (
          !flightData.estimatedArrivalUTC &&
          event.args.utcTimes.estimatedArrivalUTC
        )
          flightData.estimatedArrivalUTC =
            event.args.utcTimes.estimatedArrivalUTC;

        if (
          !flightData.actualDepartureUTC &&
          event.args.utcTimes.actualDepartureUTC
        )
          flightData.actualDepartureUTC =
            event.args.utcTimes.actualDepartureUTC;

        if (
          !flightData.actualArrivalUTC &&
          event.args.utcTimes.actualArrivalUTC
        )
          if (!flightData.baggageClaim && event.args.baggageClaim) {
            flightData.baggageClaim = event.args.baggageClaim;
          }

        flightData.actualArrivalUTC = event.args.utcTimes.actualArrivalUTC;
      }

      // Direct UTC time assignments
      if (!flightData.scheduledDepartureUTC && event.args.scheduledDepartureUTC)
        flightData.scheduledDepartureUTC = event.args.scheduledDepartureUTC;

      if (!flightData.scheduledArrivalUTC && event.args.scheduledArrivalUTC)
        flightData.scheduledArrivalUTC = event.args.scheduledArrivalUTC;

      if (!flightData.estimatedDepartureUTC && event.args.estimatedDepartureUTC)
        flightData.estimatedDepartureUTC = event.args.estimatedDepartureUTC;

      if (!flightData.estimatedArrivalUTC && event.args.estimatedArrivalUTC)
        flightData.estimatedArrivalUTC = event.args.estimatedArrivalUTC;

      if (!flightData.actualDepartureUTC && event.args.actualDepartureUTC)
        flightData.actualDepartureUTC = event.args.actualDepartureUTC;

      if (!flightData.actualArrivalUTC && event.args.actualArrivalUTC)
        flightData.actualArrivalUTC = event.args.actualArrivalUTC;

      if (!flightData.baggageClaim && event.args.baggageClaim) {
        flightData.baggageClaim = event.args.baggageClaim;
      }

      // Check for encrypted data in this event
      if (event.args) {
        Object.entries(event.args).forEach(([key, value]) => {
          if (typeof value === "string" && isLikelyEncrypted(value)) {
            if (!flightData.encryptedData[key]) {
              flightData.encryptedData[key] = [];
            }
            if (!flightData.encryptedData[key].includes(value as string)) {
              flightData.encryptedData[key].push(value as string);
            }
          }
        });
      }

      // Add this event to the flight's events array
      flightData.events.push(event);

      // Store the updated flight data
      flightEventMap.set(flightKey, flightData);
    });

    // Convert map to array and sort by timestamp (newest first)
    const sortedData = Array.from(flightEventMap.values()).sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setFlightEvents(sortedData);
  };

  // Process events when they change
  useEffect(() => {
    processEvents();
  }, [events]);

  const filteredData = flightEvents.filter((flight) => {
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

  const decryptFlightData = async (flight: FlightData) => {
    if (
      !flight.encryptedData ||
      Object.keys(flight.encryptedData).length === 0
    ) {
      toast({
        title: "No encrypted data",
        description:
          "This flight event doesn't have any encrypted data to decrypt.",
      });
      return;
    }

    // Update the flight to show it's decrypting
    setFlightEvents((prev) =>
      prev.map((f) =>
        f.eventId === flight.eventId ? { ...f, isDecrypting: true } : f
      )
    );

    try {
      // Collect all encrypted values into a single array
      const allEncryptedValues: string[] = [];
      Object.entries(flight).forEach(([field, value]) => {
        if (typeof value === "string" && isLikelyEncrypted(value)) {
          if (!allEncryptedValues.includes(value)) {
            allEncryptedValues.push(value);
          }
        }
      });

      // Also check the encryptedData object
      Object.values(flight.encryptedData).forEach((values) => {
        values.forEach((value) => {
          if (!allEncryptedValues.includes(value)) {
            allEncryptedValues.push(value);
          }
        });
      });

      console.log("Calling decryption API with:", {
        encryptedData: allEncryptedValues,
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
      console.log("Decryption API response:", data);

      // Create a mapping of encrypted to decrypted values
      const decryptionMap: Record<string, string> = {};
      allEncryptedValues.forEach((encrypted, index) => {
        if (data.decryptedData[index]) {
          decryptionMap[encrypted] = data.decryptedData[index];
        }
      });

      console.log("Decryption map:", decryptionMap);

      // Create a new flight object with decrypted data
      const updatedFlight = { ...flight };
      const updatedDecryptedData = { ...flight.decryptedData };

      // Check all fields for encrypted data and update them
      Object.keys(updatedFlight).forEach((field) => {
        // Skip non-string fields or special fields
        if (
          field === "events" ||
          field === "encryptedData" ||
          field === "decryptedData" ||
          field === "isDecrypting" ||
          field === "eventId"
        )
          return;

        const value = updatedFlight[field as keyof FlightData];
        if (typeof value === "string" && isLikelyEncrypted(value)) {
          const decrypted = decryptionMap[value];
          if (decrypted) {
            // Update the field with decrypted value
            (updatedFlight as any)[field] = decrypted;

            // Also store in decrypted data map
            if (!updatedDecryptedData[field]) {
              updatedDecryptedData[field] = [];
            }
            updatedDecryptedData[field][0] = decrypted;
          }
        }
      });

      // Also process any encrypted values in the encryptedData map
      Object.entries(flight.encryptedData).forEach(
        ([field, encryptedValues]) => {
          if (!updatedDecryptedData[field]) {
            updatedDecryptedData[field] = [];
          }

          encryptedValues.forEach((encrypted, idx) => {
            const decrypted = decryptionMap[encrypted];
            if (decrypted) {
              updatedDecryptedData[field][idx] = decrypted;
            }
          });
        }
      );

      // Update the flight with all decrypted data
      updatedFlight.decryptedData = updatedDecryptedData;
      updatedFlight.isDecrypting = false;

      // Update the state with the new flight data
      setFlightEvents((prev) =>
        prev.map((f) => (f.eventId === flight.eventId ? updatedFlight : f))
      );

      toast({
        title: "Decryption successful",
        description: `Successfully decrypted ${
          Object.keys(decryptionMap).length
        } values.`,
      });
    } catch (error) {
      console.error("Error decrypting data:", error);
      toast({
        title: "Decryption failed",
        description: "Failed to decrypt flight data. Please try again.",
        variant: "destructive",
      });

      // Reset the decrypting state
      setFlightEvents((prev) =>
        prev.map((f) =>
          f.eventId === flight.eventId ? { ...f, isDecrypting: false } : f
        )
      );
    }
  };

  const hasEncryptedData = (flight: FlightData) => {
    // Check all fields for encrypted data
    for (const [field, value] of Object.entries(flight)) {
      if (
        typeof value === "string" &&
        isLikelyEncrypted(value) &&
        field !== "events" &&
        field !== "encryptedData" &&
        field !== "decryptedData" &&
        field !== "isDecrypting" &&
        field !== "eventId"
      ) {
        return true;
      }
    }
    return Object.keys(flight.encryptedData).length > 0;
  };

  const columnDescriptions = {
    "Txn DTM": "Timestamp of when the transaction was recorded (in UTC/GMT)",
    Carrier: "Airline code (e.g., UA for United Airlines)",
    "Flt Nbr": "Flight number",
    "Dep Stn": "Departure airport code and city",
    "Dep State": "U.S. state or region of the departure city",
    "Arr Stn": "Arrival airport code and city",
    "Arr State": "U.S. state or region of the arrival city",
    "Flt Status": "Flight status in text format (e.g., Departed)",
    "Flt Status Cd":
      "Abbreviated flight status (OUT = Departed, IN = Arrived, NDPT = Not Departed)",
    "Dep Gate": "Assigned departure gate at the airport",
    "Arr Gate": "Assigned arrival gate at the airport",
    "Sch Dep DTM": "Scheduled departure date and time (in UTC/GMT)",
    "Sch Arr DTM": "Scheduled arrival date and time (in UTC/GMT)",
    "Est Dep DTM": "Estimated departure date and time based on current data",
    "Est Arr DTM": "Estimated arrival date and time based on current data",
    "Actual Dep DTM": "Actual time the flight departed (when it left the gate)",
    "Actual Arr DTM":
      "Actual time the flight arrived (when it reached the gate)",
    Bagclaim: "Baggage claim carousel/area for the arriving flight",
    Action: "Options to process flight data",
  };

  const renderTableHeaderWithTooltip = (
    label: keyof typeof columnDescriptions
  ) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer flex items-center">{label}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p>{columnDescriptions[label] || "No description available"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Render a cell value, handling encrypted data
  const renderCellValue = (flight: FlightData, field: keyof FlightData) => {
    const value = flight[field] as string;

    if (!value) return "TBD";

    // Check if this value is encrypted
    if (isLikelyEncrypted(value)) {
      // If we have decrypted this field
      if (flight.decryptedData[field] && flight.decryptedData[field][0]) {
        const decryptedValue = flight.decryptedData[field][0];

        // For status fields, apply special formatting
        if (
          field === "flightStatus" ||
          field === "departureStatus" ||
          field === "arrivalStatus" ||
          field === "flightStatusCode"
        ) {
          const displayValue = mapStatusCodeToText(decryptedValue);
          const colorClass = getFlightStatusColor(decryptedValue);

          return (
            <div className="flex items-center gap-1">
              <Unlock className="h-3 w-3 text-green-500" />
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}
              >
                {displayValue}
              </span>
            </div>
          );
        }

        // Format date/time fields based on selected format
        if (
          field === "scheduledDepartureUTC" ||
          field === "scheduledArrivalUTC" ||
          field === "estimatedDepartureUTC" ||
          field === "estimatedArrivalUTC" ||
          field === "actualDepartureUTC" ||
          field === "actualArrivalUTC" ||
          field === "outUtc" ||
          field === "offUtc" ||
          field === "onUtc" ||
          field === "inUtc"
        ) {
          return (
            <div className="flex items-center gap-1">
              <Unlock className="h-3 w-3 text-green-500" />
              <span>{formatDateTime(decryptedValue, timeFormat)}</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1">
            <Unlock className="h-3 w-3 text-green-500" />
            <span>{decryptedValue}</span>
          </div>
        );
      }

      // If it's still encrypted
      return (
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-amber-500" />
          <span className="text-xs">Encrypted</span>
        </div>
      );
    }

    // For non-encrypted status fields, apply special formatting
    if (
      field === "flightStatus" ||
      field === "departureStatus" ||
      field === "arrivalStatus"
    ) {
      const displayValue = mapStatusCodeToText(value);
      const colorClass = getFlightStatusColor(value);

      return (
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}
        >
          {displayValue}
        </span>
      );
    }

    // Format date/time fields based on selected format
    if (
      field === "scheduledDepartureUTC" ||
      field === "scheduledArrivalUTC" ||
      field === "estimatedDepartureUTC" ||
      field === "estimatedArrivalUTC" ||
      field === "actualDepartureUTC" ||
      field === "actualArrivalUTC" ||
      field === "outUtc" ||
      field === "offUtc" ||
      field === "onUtc" ||
      field === "inUtc"
    ) {
      return formatDateTime(value, timeFormat);
    }

    return value;
  };

  return (
    <div className="space-y-4">
      <style jsx global>{`
        .flight-table-header {
          background-color: black;
          color: white;
        }

        .flight-table-header th {
          white-space: nowrap;
          background-color: black;
          color: white;
          text-align: left;
          font-weight: 600;
        }

        .flight-table-row td {
          text-align: left;
          white-space: nowrap;
        }

        .flight-table-container {
          width: 100%;
          overflow-x: auto;
        }
      `}</style>

      {/* Search Header */}
      <FlightSearchHeader
        onTimeFormatChange={setTimeFormat}
        timeFormat={timeFormat}
      />

      <div className="flight-table-container">
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow className="flight-table-header ">
                <TableHead>{renderTableHeaderWithTooltip("Txn DTM")}</TableHead>
                <TableHead>{renderTableHeaderWithTooltip("Carrier")}</TableHead>
                <TableHead>{renderTableHeaderWithTooltip("Flt Nbr")}</TableHead>
                <TableHead>{renderTableHeaderWithTooltip("Dep Stn")}</TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Dep State")}
                </TableHead>
                <TableHead>{renderTableHeaderWithTooltip("Arr Stn")}</TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Arr State")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Flt Status")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Flt Status Cd")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Dep Gate")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Arr Gate")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Sch Dep DTM")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Sch Arr DTM")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Est Dep DTM")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Est Arr DTM")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Actual Dep DTM")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Actual Arr DTM")}
                </TableHead>
                <TableHead>
                  {renderTableHeaderWithTooltip("Bagclaim")}
                </TableHead>
                <TableHead>{renderTableHeaderWithTooltip("Action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((flight, index) => (
                <TableRow
                  key={flight.eventId}
                  className={`flight-table-row ${
                    index % 2 === 0 ? "bg-muted/20" : ""
                  }`}
                >
                  <TableCell>
                    {flight.timestamp.substring(5, 10)}.....
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "carrierCode")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {flight.flightNumber}
                  </TableCell>

                  <TableCell>
                    {renderCellValue(flight, "departureCity")} (
                    {renderCellValue(flight, "departureAirport")})
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "departureStatus")}
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "arrivalCity")} (
                    {renderCellValue(flight, "arrivalAirport")})
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "arrivalStatus")}
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "flightStatus")}
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "flightStatusCode")}
                  </TableCell>

                  <TableCell>
                    {renderCellValue(flight, "departureGate")}
                  </TableCell>
                  <TableCell>
                    {renderCellValue(flight, "arrivalGate")}
                  </TableCell>
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
                  <TableCell>
                    {renderCellValue(flight, "baggageClaim")}
                  </TableCell>
                  <TableCell>
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
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent mr-1">
                                Decrypting
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Unlock className="h-3 w-3 mr-1" />
                              Decrypt
                            </div>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm
                      ? "No flights match your search criteria"
                      : "No flight data available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
