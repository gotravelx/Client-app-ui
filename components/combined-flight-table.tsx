"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBaseUrl } from "@/utils/base_url";
import { FlightSearchHeader, type SearchParams } from "./flight-search-header";
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
  DepartureState: string;
  ArrivalState: string;
  bagClaim: string;
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

// Update the formatDateTime function to show AM/PM for local time
const formatDateTime = (timestamp: string, format: "utc" | "local"): string => {
  if (!timestamp || timestamp === "TBD" || timestamp === "N/A")
    return timestamp;

  try {
    const date = new Date(timestamp);

    if (format === "utc") {
      // Replace UTC with Z in the timestamp
      return date
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "Z");
    } else {
      // Local time format with AM/PM
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // This ensures AM/PM format
      });
    }
  } catch (e) {
    return timestamp;
  }
};

export function CombinedFlightTable({ events }: CombinedFlightTableProps) {
  const [flightEvents, setFlightEvents] = useState<FlightData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<FlightData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFormat, setTimeFormat] = useState<"utc" | "local">("utc");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});

  // Process events by consolidating them based on flight number, carrier code and timestamp
  // Memoize this function to avoid unnecessary re-processing
  const processEvents = useCallback(() => {
    // Group events by timestamp, flight number and carrier code
    const flightEventMap = new Map<string, FlightData>();

    events.forEach((event) => {
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
        DepartureState: event.args.DepartureState || "",
        ArrivalState: event.args.ArrivalState || "",
        bagClaim: event.args.bagClaim || "",
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

      // Extract baggage claim from the correct location in the event data
      if (!flightData.bagClaim) {
        // Try to get from direct args
        if (event.args.baggageClaim) {
          flightData.bagClaim = event.args.baggageClaim;
        }
        // Try to get from utcTimes structure
        else if (event.args.utcTimes && event.args.utcTimes.baggageClaim) {
          flightData.bagClaim = event.args.utcTimes.baggageClaim;
        }
      }

      // Extract arrival status from the correct location in the event data
      if (!flightData.ArrivalState) {
        // Try to get from direct args
        if (event.args.ArrivalState) {
          flightData.ArrivalState = event.args.ArrivalState;
        }
        // Try to get from status structure
        else if (event.args.status && event.args.status.ArrivalState) {
          flightData.ArrivalState = event.args.status.ArrivalState;
        }
      }

      // Extract departure status from the correct location in the event data
      if (!flightData.DepartureState) {
        // Try to get from direct args
        if (event.args.DepartureState) {
          flightData.DepartureState = event.args.DepartureState;
        }
        // Try to get from status structure
        else if (event.args.status && event.args.status.DepartureState) {
          flightData.DepartureState = event.args.status.DepartureState;
        }
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

        // Check for encrypted data in nested objects
        if (event.args.utcTimes) {
          Object.entries(event.args.utcTimes).forEach(([key, value]) => {
            if (
              typeof value === "string" &&
              isLikelyEncrypted(value as string)
            ) {
              const fullKey = `utcTimes.${key}`;
              if (!flightData.encryptedData[fullKey]) {
                flightData.encryptedData[fullKey] = [];
              }
              if (
                !flightData.encryptedData[fullKey].includes(value as string)
              ) {
                flightData.encryptedData[fullKey].push(value as string);
              }
            }
          });
        }

        if (event.args.status) {
          Object.entries(event.args.status).forEach(([key, value]) => {
            if (
              typeof value === "string" &&
              isLikelyEncrypted(value as string)
            ) {
              const fullKey = `status.${key}`;
              if (!flightData.encryptedData[fullKey]) {
                flightData.encryptedData[fullKey] = [];
              }
              if (
                !flightData.encryptedData[fullKey].includes(value as string)
              ) {
                flightData.encryptedData[fullKey].push(value as string);
              }
            }
          });
        }
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

    return sortedData;
  }, [events]);

  // Apply decrypted data to flights
  const getDecryptedFlights = useCallback(
    (flights: FlightData[]) => {
      if (Object.keys(decryptedMap).length === 0) return flights;

      return flights.map((flight) => {
        const updatedFlight = { ...flight };
        const updatedDecryptedData = { ...flight.decryptedData };
        let wasDecrypted = false;

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
            const decrypted = decryptedMap[value];
            if (decrypted) {
              // Update the field with decrypted value
              (updatedFlight as any)[field] = decrypted;

              // Also store in decrypted data map
              if (!updatedDecryptedData[field]) {
                updatedDecryptedData[field] = [];
              }
              updatedDecryptedData[field][0] = decrypted;
              wasDecrypted = true;
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
              const decrypted = decryptedMap[encrypted];
              if (decrypted) {
                updatedDecryptedData[field][idx] = decrypted;
                wasDecrypted = true;

                // Handle nested fields like utcTimes.baggageClaim
                if (field.includes(".")) {
                  const [parentField, childField] = field.split(".");
                  if (
                    parentField === "utcTimes" &&
                    childField === "baggageClaim"
                  ) {
                    updatedFlight.bagClaim = decrypted;
                    if (!updatedDecryptedData["bagClaim"]) {
                      updatedDecryptedData["bagClaim"] = [];
                    }
                    updatedDecryptedData["bagClaim"][0] = decrypted;
                  } else if (parentField === "status") {
                    if (childField === "ArrivalState") {
                      updatedFlight.ArrivalState = decrypted;
                      if (!updatedDecryptedData["ArrivalState"]) {
                        updatedDecryptedData["ArrivalState"] = [];
                      }
                      updatedDecryptedData["ArrivalState"][0] = decrypted;
                    } else if (childField === "DepartureState") {
                      updatedFlight.DepartureState = decrypted;
                      if (!updatedDecryptedData["DepartureState"]) {
                        updatedDecryptedData["DepartureState"] = [];
                      }
                      updatedDecryptedData["DepartureState"][0] = decrypted;
                    }
                  }
                }
              }
            });
          }
        );

        if (wasDecrypted) {
          updatedFlight.decryptedData = updatedDecryptedData;
        }

        return { ...updatedFlight, isDecrypting: false };
      });
    },
    [decryptedMap]
  );

  // Process events when they change
  useEffect(() => {
    const processedEvents = processEvents();
    const decryptedProcessedEvents = getDecryptedFlights(processedEvents);
    setFlightEvents(decryptedProcessedEvents);
    setFilteredEvents(decryptedProcessedEvents);
  }, [events, processEvents, getDecryptedFlights]);

  const handleSearch = useCallback(
    async (searchParams: SearchParams) => {
      setIsLoading(true);

      try {
        // Filter the existing flight events based on search parameters
        const filtered = flightEvents.filter((flight) => {
          // Match carrier code
          if (
            searchParams.carrierCode &&
            flight.carrierCode.toLowerCase() !==
              searchParams.carrierCode.toLowerCase()
          ) {
            return false;
          }

          // Match flight number
          if (
            searchParams.flightNumber &&
            !flight.flightNumber.includes(searchParams.flightNumber)
          ) {
            return false;
          }

          // Match date range if provided
          if (searchParams.startDate && searchParams.endDate) {
            const flightDate = new Date(flight.timestamp);
            const startDate = new Date(searchParams.startDate);
            const endDate = new Date(searchParams.endDate);

            if (flightDate < startDate || flightDate > endDate) {
              return false;
            }
          }

          return true;
        });

        setFilteredEvents(filtered);

        // Also try to fetch from API
        const response = await fetch(`${getBaseUrl()}/flights/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(searchParams),
        });

        if (response.ok) {
          const data = await response.json();
          // Process and merge API results if needed
          // This would depend on the API response format
        }
      } catch (error) {
        console.error("Error searching flights:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [flightEvents]
  );

  // Collect encrypted values from all flights - do this once
  const collectEncryptedValues = useCallback(() => {
    if (isDecrypting || Object.keys(decryptedMap).length > 0) return null;

    // Collect all encrypted values from all flights
    const allEncryptedValues: string[] = [];

    flightEvents.forEach((flight) => {
      // Check all fields for encrypted data
      Object.entries(flight).forEach(([field, value]) => {
        if (
          typeof value === "string" &&
          isLikelyEncrypted(value) &&
          field !== "events" &&
          field !== "encryptedData" &&
          field !== "decryptedData" &&
          field !== "isDecrypting" &&
          field !== "eventId"
        ) {
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
    });

    return allEncryptedValues.length > 0 ? allEncryptedValues : null;
  }, [flightEvents, isDecrypting, decryptedMap]);

  // Execute auto-decryption only once after initial load
  useEffect(() => {
    const encryptedValues = collectEncryptedValues();

    if (!encryptedValues) return;

    const decryptData = async () => {
      setIsDecrypting(true);

      try {
        console.log("Auto-decrypting data:", {
          encryptedData: encryptedValues,
        });

        const response = await fetch(
          `${getBaseUrl()}/flights/decrypt-flight-data`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              encryptedData: encryptedValues,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Create a mapping of encrypted to decrypted values
        const newDecryptedMap: Record<string, string> = {};
        encryptedValues.forEach((encrypted, index) => {
          if (data.decryptedData[index]) {
            newDecryptedMap[encrypted] = data.decryptedData[index];
          }
        });

        // Update the decryption map only once
        setDecryptedMap(newDecryptedMap);

        toast({
          title: "Decryption successful",
          description: `Successfully decrypted ${
            Object.keys(newDecryptedMap).length
          } values.`,
        });
      } catch (error) {
        console.error("Error auto-decrypting data:", error);
        toast({
          title: "Decryption failed",
          description: "Failed to decrypt flight data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsDecrypting(false);
      }
    };

    decryptData();
  }, [collectEncryptedValues, toast]);

  // Single function for manual decryption of a specific flight
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

    setIsDecrypting(true);

    try {
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
      const newDecryptedValues: Record<string, string> = { ...decryptedMap };
      allEncryptedValues.forEach((encrypted, index) => {
        if (data.decryptedData[index]) {
          newDecryptedValues[encrypted] = data.decryptedData[index];
        }
      });

      // Update the global decryption map
      setDecryptedMap(newDecryptedValues);

      toast({
        title: "Decryption successful",
        description: `Successfully decrypted ${
          Object.keys(newDecryptedValues).length -
          Object.keys(decryptedMap).length
        } new values.`,
      });
    } catch (error) {
      console.error("Error decrypting data:", error);
      toast({
        title: "Decryption failed",
        description: "Failed to decrypt flight data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDecrypting(false);
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
    "Dep State": "Departure status (e.g., On-time, Delayed)",
    "Arr Stn": "Arrival airport code and city",
    "Arr State": "Arrival status (e.g., On-time, Delayed)",
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
          field === "DepartureState" ||
          field === "ArrivalState" ||
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
      field === "DepartureState" ||
      field === "ArrivalState"
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

        /* Fix for Txn DTM column to show full values */
        .txn-dtm-cell {
          min-width: 150px;
          max-width: 200px;
        }
      `}</style>

      {/* Search Header */}
      <FlightSearchHeader
        onTimeFormatChange={setTimeFormat}
        timeFormat={timeFormat}
        onSearch={handleSearch}
        flightData={filteredEvents}
      />

      <div className="flight-table-container">
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow className="flight-table-header ">
                <TableHead className="txn-dtm-cell">
                  {renderTableHeaderWithTooltip("Txn DTM")}
                </TableHead>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={18} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                      Loading flight data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((flight, index) => (
                  <TableRow
                    key={flight.eventId}
                    className={`flight-table-row ${
                      index % 2 === 0 ? "bg-muted/20" : ""
                    }`}
                  >
                    <TableCell className="txn-dtm-cell">
                      {flight.timestamp}
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
                      {renderCellValue(flight, "DepartureState")}
                    </TableCell>
                    <TableCell>
                      {renderCellValue(flight, "arrivalCity")} (
                      {renderCellValue(flight, "arrivalAirport")})
                    </TableCell>
                    <TableCell>
                      {renderCellValue(flight, "ArrivalState")}
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
                    <TableCell>{renderCellValue(flight, "bagClaim")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No flight data available
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
