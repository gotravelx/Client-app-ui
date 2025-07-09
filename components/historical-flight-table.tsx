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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { decryptFlightData } from "@/utils/api";

interface ApiFlightTableProps {
  apiData: any;
  timeFormat: "utc" | "local";
  onClearSearch?: () => void;
  currentSearchParams?: any;
}

const isLikelyEncrypted = (str: string): boolean => {
  if (!str) return false;
  const encryptionPattern = /^[a-f0-9]{32}:[A-Za-z0-9+/=]+$/;
  const encryptionPatternExtended = /^[a-f0-9]{32}:[A-Za-z0-9+/=]{10,}$/;
  return encryptionPattern.test(str) || encryptionPatternExtended.test(str);
};

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
  if (statusLower.includes("cancel") || statusLower === "cncl")
    return "bg-red-100 text-red-800"; // Updated for CNCL
  if (statusLower.includes("delay")) return "bg-orange-100 text-orange-800";
  if (statusLower.includes("early")) return "bg-green-100 text-green-800";
  if (statusLower.includes("on time")) return "bg-green-100 text-green-800";
  if (statusLower.includes("pending")) return "bg-yellow-100 text-yellow-800";
  if (statusLower.includes("rerouted")) return "bg-purple-100 text-purple-800";
  if (statusLower.includes("extra stop")) return "bg-blue-100 text-blue-800";
  if (statusLower.includes("unavailable")) return "bg-gray-100 text-gray-800";

  return "bg-gray-100 text-gray-800";
};

const getDepartureStateColor = (state: string): string => {
  if (!state) return "bg-gray-200 text-gray-700";

  const stateLower = state.toLowerCase();

  if (stateLower.includes("delayed") || stateLower === "dly")
    return "bg-orange-100 text-orange-800";
  if (stateLower.includes("cancelled") || stateLower === "cnl")
    return "bg-red-100 text-red-800";
  if (stateLower.includes("pending") || stateLower === "pnd")
    return "bg-yellow-100 text-yellow-800";
  if (stateLower.includes("rerouted") || stateLower === "div")
    return "bg-purple-100 text-purple-800";
  if (stateLower.includes("extra stop") || stateLower === "xsp")
    return "bg-blue-100 text-blue-800";
  if (stateLower.includes("cancelled") || stateLower === "nsp")
    return "bg-red-100 text-red-800";
  if (stateLower.includes("unavailable") || stateLower === "lck")
    return "bg-gray-100 text-gray-800";
  if (stateLower.includes("on time") || stateLower === "ont")
    return "bg-green-100 text-green-800";
  if (stateLower.includes("on time") || stateLower === "ca")
    return "bg-green-100 text-green-800";

  return "bg-gray-100 text-gray-800";
};

const getArrivalStateColor = (state: string): string => {
  if (!state) return "bg-gray-200 text-gray-700";

  const stateLower = state.toLowerCase();

  if (stateLower.includes("early") || stateLower === "erl")
    return "bg-green-100 text-green-800";
  if (stateLower.includes("delayed") || stateLower === "dly")
    return "bg-orange-100 text-orange-800";
  if (stateLower.includes("cancelled") || stateLower === "cnl")
    return "bg-red-100 text-red-800";
  if (stateLower.includes("pending") || stateLower === "pnd")
    return "bg-yellow-100 text-yellow-800";
  if (stateLower.includes("rerouted") || stateLower === "dvt")
    return "bg-purple-100 text-purple-800";
  if (stateLower.includes("extra stop") || stateLower === "xst")
    return "bg-blue-100 text-blue-800";
  if (stateLower.includes("cancelled") || stateLower === "nst")
    return "bg-red-100 text-red-800";
  if (stateLower.includes("unavailable") || stateLower === "lck")
    return "bg-gray-100 text-gray-800";
  if (stateLower.includes("on time") || stateLower === "ont")
    return "bg-green-100 text-green-800";
  if (stateLower.includes("on time") || stateLower === "co")
    return "bg-green-100 text-green-800";

  return "bg-gray-100 text-gray-800";
};

const mapDepartureStateCodeToText = (code: string): string => {
  const stateMap: Record<string, string> = {
    DLY: "Delayed",
    CNL: "Cancelled",
    PND: "Pending",
    DIV: "Rerouted",
    XSP: "Extra Stop",
    NSP: "Cancelled",
    LCK: "Unavailable",
    ONT: "On Time",
    CA: "On Time",
  };

  if (stateMap[code]) {
    return stateMap[code];
  }

  return code || "";
};

const mapArrivalStateCodeToText = (code: string): string => {
  const stateMap: Record<string, string> = {
    ERL: "Early",
    DLY: "Delayed",
    CNL: "Cancelled",
    PND: "Pending",
    DVT: "Rerouted",
    XST: "Extra Stop",
    NST: "Cancelled",
    LCK: "Unavailable",
    ONT: "On Time",
    CO: "On Time",
  };

  if (stateMap[code]) {
    return stateMap[code];
  }

  return code || "";
};

const shouldShowCell = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (
    typeof value === "string" &&
    (value.trim() === "" || value === "TBD" || value === "N/A" || value === "-")
  )
    return false;
  return true;
};

const CellSkeleton = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="h-4 bg-muted rounded w-16"></div>
  </div>
);

const formatDateTime = (timestamp: string, format: "utc" | "local"): string => {
  if (!timestamp || timestamp === "TBD" || timestamp === "N/A")
    return timestamp;

  try {
    const date = new Date(timestamp);

    if (format === "utc") {
      return date
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "Z");
    } else {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }
  } catch (e) {
    return timestamp;
  }
};

const organizeFlightDataByStatusEvents = (
  flightDetails: any[],
  decryptedMap: Record<string, string>
) => {
  if (!flightDetails || flightDetails.length === 0) return [];

  const statusEvents: any[] = [];

  flightDetails.forEach((flight) => {
    const flightDate = flight.scheduledDepartureDate;
    const flightNumber = flight.flightNumber;
    const carrierCode = flight.carrierCode;

    const isCancelled =
      flight.status?.flightStatus === "CNCL" ||
      flight.status?.flightStatus === "CNL" ||
      flight.status?.departureState === "CNL" ||
      flight.status?.arrivalState === "CNL" ||
      (typeof flight.status?.flightStatus === "string" &&
        flight.status.flightStatus.toLowerCase().includes("cancel"));

    const commonData = {
      date: flightDate,
      flightNumber,
      carrierCode,
      departureCity: flight.departureCity || "TBD",
      arrivalCity: flight.arrivalCity || "TBD",
      departureAirport: flight.departureAirport || "TBD",
      arrivalAirport: flight.arrivalAirport || "TBD",
      departureGate: flight.departureGate || "TBD",
      arrivalGate: flight.arrivalGate || "TBD",
      DepartureState: flight.status?.departureState || "TBD",
      ArrivalState: flight.status?.arrivalState || "TBD",
      bagClaim: flight.utcTimes?.bagClaim || "TBD",
    };

    Object.keys(commonData).forEach((key) => {
      const value = commonData[key as keyof typeof commonData];
      if (
        typeof value === "string" &&
        isLikelyEncrypted(value) &&
        decryptedMap[value]
      ) {
        commonData[key as keyof typeof commonData] = decryptedMap[value];
      }
    });

    if (isCancelled) {
      const cancelTime =
        flight.status?.cancelledUtc ||
        flight.utcTimes?.scheduledDeparture ||
        new Date().toISOString();

      let cancelTimeDecrypted = cancelTime;
      if (isLikelyEncrypted(cancelTime) && decryptedMap[cancelTime]) {
        cancelTimeDecrypted = decryptedMap[cancelTime];
      }

      statusEvents.push({
        ...commonData,
        status: "CNCL",
        statusText: "Cancelled",
        eventTime: cancelTimeDecrypted,
        rawEventTime: cancelTime,
      });

      return;
    }

    const scheduledDep = flight.utcTimes?.scheduledDeparture || "";
    let scheduledDepDecrypted = scheduledDep;
    if (isLikelyEncrypted(scheduledDep) && decryptedMap[scheduledDep]) {
      scheduledDepDecrypted = decryptedMap[scheduledDep];
    }

    statusEvents.push({
      ...commonData,
      status: "NDPT",
      statusText: "Not Departed",
      eventTime: scheduledDepDecrypted,
      rawEventTime: scheduledDep,
    });

    if (flight.status?.outUtc || flight.utcTimes?.actualDeparture) {
      const outTime = flight.status?.outUtc || flight.utcTimes?.actualDeparture;
      let outTimeDecrypted = outTime;
      if (isLikelyEncrypted(outTime) && decryptedMap[outTime]) {
        outTimeDecrypted = decryptedMap[outTime];
      }

      statusEvents.push({
        ...commonData,
        status: "OUT",
        statusText: "Departed",
        eventTime: outTimeDecrypted,
        rawEventTime: outTime,
      });
    }

    if (flight.status?.offUtc) {
      const offTime = flight.status.offUtc;
      let offTimeDecrypted = offTime;
      if (isLikelyEncrypted(offTime) && decryptedMap[offTime]) {
        offTimeDecrypted = decryptedMap[offTime];
      }

      statusEvents.push({
        ...commonData,
        status: "OFF",
        statusText: "In Flight",
        eventTime: offTimeDecrypted,
        rawEventTime: offTime,
      });
    }

    if (flight.status?.onUtc) {
      const onTime = flight.status.onUtc;
      let onTimeDecrypted = onTime;
      if (isLikelyEncrypted(onTime) && decryptedMap[onTime]) {
        onTimeDecrypted = decryptedMap[onTime];
      }

      statusEvents.push({
        ...commonData,
        status: "ON",
        statusText: "Landed",
        eventTime: onTimeDecrypted,
        rawEventTime: onTime,
      });
    }

    if (flight.status?.inUtc || flight.utcTimes?.actualArrival) {
      const inTime = flight.status?.inUtc || flight.utcTimes?.actualArrival;
      let inTimeDecrypted = inTime;
      if (isLikelyEncrypted(inTime) && decryptedMap[inTime]) {
        inTimeDecrypted = decryptedMap[inTime];
      }

      statusEvents.push({
        ...commonData,
        status: "IN",
        statusText: "Arrived At Gate",
        eventTime: inTimeDecrypted,
        rawEventTime: inTime,
      });
    }
  });

  const statusOrder = { CNCL: 0, NDPT: 1, OUT: 2, OFF: 3, ON: 4, IN: 5 };
  statusEvents.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return (
      statusOrder[a.status as keyof typeof statusOrder] -
      statusOrder[b.status as keyof typeof statusOrder]
    );
  });

  return statusEvents;
};

export function ApiFlightTable({
  apiData,
  timeFormat,
  onClearSearch,
  currentSearchParams,
}: ApiFlightTableProps) {
  const [flightStatusEvents, setFlightStatusEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiData || !apiData.flightDetails) {
      setFlightStatusEvents([]);
      setIsLoading(false);
      return;
    }

    // Check if flightDetails is a string (error message)
    if (typeof apiData.flightDetails === "string") {
      setApiError(apiData.flightDetails);
      setFlightStatusEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Collect all encrypted values for decryption
    const allEncryptedValues: string[] = [];
    const collectEncryptedData = (obj: any) => {
      if (!obj) return;

      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === "string" && isLikelyEncrypted(value as string)) {
          if (!allEncryptedValues.includes(value as string)) {
            allEncryptedValues.push(value as string);
          }
        } else if (typeof value === "object" && value !== null) {
          collectEncryptedData(value);
        }
      });
    };

    // Process each flight detail to collect encrypted values
    apiData.flightDetails.forEach((flightDetail: any) => {
      collectEncryptedData(flightDetail);
    });

    // If there are encrypted values, decrypt them
    if (allEncryptedValues.length > 0) {
      setIsDecrypting(true);
      decryptFlightData(allEncryptedValues)
        .then((decryptData) => {
          // Create a mapping of encrypted to decrypted values
          const newDecryptedMap: Record<string, string> = {};
          allEncryptedValues.forEach((encrypted, index) => {
            if (decryptData.decryptedData[index]) {
              newDecryptedMap[encrypted] = decryptData.decryptedData[index];
            }
          });

          // Update the decryption map
          setDecryptedMap(newDecryptedMap);

          // Organize flight data by status events with decrypted values
          const events = organizeFlightDataByStatusEvents(
            apiData.flightDetails,
            newDecryptedMap
          );
          setFlightStatusEvents(events);
        })
        .catch((error) => {
          console.error("Error decrypting API data:", error);
          setApiError("Failed to decrypt flight data. Please try again.");
        })
        .finally(() => {
          setIsDecrypting(false);
          setIsLoading(false);
        });
    } else {
      // No encrypted values, just organize the data
      const events = organizeFlightDataByStatusEvents(
        apiData.flightDetails,
        {}
      );
      setFlightStatusEvents(events);
      setIsLoading(false);
    }
  }, [apiData]);

  useEffect(() => {
    console.log("Time format changed in table:", timeFormat);
    if (flightStatusEvents.length > 0) {
      setFlightStatusEvents([...flightStatusEvents]);
    }
  }, [timeFormat]);

  const columnDescriptions = {
    Date: "Flight date",
    Carrier: "Airline code (e.g., UA for United Airlines)",
    "Flt Nbr": "Flight number",
    Status: "Flight status event",
    "Event Time": "Time when the status event occurred",
    "Dep Stn": "Departure airport code and city",
    "Dep State": "Departure status (e.g., On-time, Delayed)",
    "Arr Stn": "Arrival airport code and city",
    "Arr State": "Arrival status (e.g., On-time, Delayed)",
    "Dep Gate": "Assigned departure gate at the airport",
    "Arr Gate": "Assigned arrival gate at the airport",
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

  const renderCellValue = (value: string, isEncrypted = false) => {
    if (!shouldShowCell(value)) {
      return (
        <span className="text-muted-foreground text-xs font-medium">TBD</span>
      );
    }

    if (isEncrypted) {
      if (isDecrypting) {
        return <CellSkeleton />;
      }

      if (decryptedMap[value]) {
        return (
          <div className="flex items-center gap-1">
            <Unlock className="h-3 w-3 text-green-500" />
            <span>{decryptedMap[value]}</span>
          </div>
        );
      }

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
    <div className="space-y-4">
      <style jsx global>{`
        .flight-table-header {
          background-color: black;
          color: white;
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .flight-table-header th {
          white-space: nowrap;
          background-color: black;
          color: white;
          text-align: left;
          font-weight: 600;
          padding: 12px 8px;
        }

        .flight-table-row td {
          text-align: left;
          white-space: nowrap;
          padding: 8px;
        }

        .flight-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .flight-table-container .table {
          margin: 0;
        }
      `}</style>

      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="flight-table-container">
        <ScrollArea className="h-[600px] w-full">
          <Table className="table">
            <TableHeader className="sticky top-0 z-30">
              <TableRow className="flight-table-header">
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Date")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Carrier")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Flt Nbr")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Status")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Event Time")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Dep Stn")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Dep State")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Arr Stn")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Arr State")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Dep Gate")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Arr Gate")}
                </TableHead>
                <TableHead className="sticky top-0 bg-black">
                  {renderTableHeaderWithTooltip("Bagclaim")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                      <TableCell>
                        <CellSkeleton />
                      </TableCell>
                    </TableRow>
                  ))
              ) : flightStatusEvents.length > 0 ? (
                flightStatusEvents.map((event, index) => (
                  <TableRow
                    key={`${event.flightNumber}-${event.date}-${event.status}-${index}`}
                    className={`flight-table-row ${
                      index % 2 === 0 ? "bg-muted/20" : ""
                    }`}
                  >
                    <TableCell>{event.date}</TableCell>
                    <TableCell>{event.carrierCode}</TableCell>
                    <TableCell className="font-medium">
                      {event.flightNumber}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getFlightStatusColor(
                          event.status
                        )}`}
                      >
                        {event.statusText}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isLikelyEncrypted(event.rawEventTime)
                        ? renderCellValue(event.rawEventTime, true)
                        : event.eventTime}
                    </TableCell>
                    <TableCell>
                      {event.departureCity !== "TBD" ||
                      event.departureAirport !== "TBD" ? (
                        <>
                          {event.departureCity}{" "}
                          {event.departureAirport !== "TBD" &&
                            `(${event.departureAirport})`}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          TBD
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getDepartureStateColor(
                          event.DepartureState
                        )}`}
                      >
                        {mapDepartureStateCodeToText(event.DepartureState)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {event.arrivalCity !== "TBD" ||
                      event.arrivalAirport !== "TBD" ? (
                        <>
                          {event.arrivalCity}{" "}
                          {event.arrivalAirport !== "TBD" &&
                            `(${event.arrivalAirport})`}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          TBD
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getArrivalStateColor(
                          event.ArrivalState
                        )}`}
                      >
                        {mapArrivalStateCodeToText(event.ArrivalState)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {event.departureGate !== "TBD" ? (
                        event.departureGate
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          TBD
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.arrivalGate !== "TBD" ? (
                        event.arrivalGate
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          TBD
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.bagClaim !== "TBD" ? (
                        event.bagClaim
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          TBD
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {apiData &&
                    apiData.flightDetails === "Flight does not exist"
                      ? `No flight data found for ${currentSearchParams?.flightNumber} with carrier ${currentSearchParams?.carrierCode}`
                      : "No flight data available. Please search for a flight."}
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
