"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, AlertCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBaseUrl } from "@/utils/base_url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

// Import the same helper functions from combined-flight-table.tsx
// These are the same functions used in the CombinedFlightTable component
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
  if (statusLower.includes("cancel")) return "bg-red-100 text-red-800";
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
  return "bg-gray-100 text-gray-800";
};

const mapStatusCodeToText = (code: string): string => {
  const statusMap: Record<string, string> = {
    NDPT: "Not Departed",
    OUT: "Departed",
    OFF: "In Flight",
    ON: "Landed",
    IN: "Arrived At Gate",
  };
  if (statusMap[code]) {
    return statusMap[code];
  }
  if (typeof code === "string") {
    return code.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
  }
  return code || "";
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

const determineDepartureState = (flight: any): string => {
  if (shouldShowCell(flight.DepartureState)) {
    return flight.DepartureState;
  }

  const scheduledDeparture = flight.scheduledDepartureUTC
    ? new Date(flight.scheduledDepartureUTC)
    : null;
  const estimatedDeparture = flight.estimatedDepartureUTC
    ? new Date(flight.estimatedDepartureUTC)
    : null;
  const actualDeparture = flight.actualDepartureUTC
    ? new Date(flight.actualDepartureUTC)
    : null;

  if (
    flight.flightStatus &&
    flight.flightStatus.toLowerCase().includes("cancel")
  ) {
    return "CNL";
  }

  if (estimatedDeparture && scheduledDeparture) {
    const delayThresholdMinutes = 15;
    const delayMs = estimatedDeparture.getTime() - scheduledDeparture.getTime();
    const delayMinutes = delayMs / (1000 * 60);

    if (delayMinutes >= delayThresholdMinutes) {
      return "DLY";
    }
  }

  if (
    actualDeparture &&
    scheduledDeparture &&
    actualDeparture > scheduledDeparture
  ) {
    return "DLY";
  }

  return "ONT";
};

const determineArrivalState = (flight: any): string => {
  if (shouldShowCell(flight.ArrivalState)) {
    return flight.ArrivalState;
  }

  const scheduledArrival = flight.scheduledArrivalUTC
    ? new Date(flight.scheduledArrivalUTC)
    : null;
  const estimatedArrival = flight.estimatedArrivalUTC
    ? new Date(flight.estimatedArrivalUTC)
    : null;
  const actualArrival = flight.actualArrivalUTC
    ? new Date(flight.actualArrivalUTC)
    : null;

  if (
    flight.flightStatus &&
    flight.flightStatus.toLowerCase().includes("cancel")
  ) {
    return "CNL";
  }

  if (estimatedArrival && scheduledArrival) {
    const earlyThresholdMinutes = 5;
    const diffMs = scheduledArrival.getTime() - estimatedArrival.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes >= earlyThresholdMinutes) {
      return "ERL";
    }
  }

  if (actualArrival && scheduledArrival && actualArrival < scheduledArrival) {
    return "ERL";
  }

  if (estimatedArrival && scheduledArrival) {
    const delayThresholdMinutes = 15;
    const delayMs = estimatedArrival.getTime() - scheduledArrival.getTime();
    const delayMinutes = delayMs / (1000 * 60);

    if (delayMinutes >= delayThresholdMinutes) {
      return "DLY";
    }
  }

  if (actualArrival && scheduledArrival && actualArrival > scheduledArrival) {
    return "DLY";
  }

  return "ONT";
};

const determineFlightStatus = (flight: any): string => {
  if (shouldShowCell(flight.flightStatus)) {
    return flight.flightStatus;
  }

  if (shouldShowCell(flight.inUtc)) {
    return "Arrived At Gate";
  } else if (shouldShowCell(flight.onUtc)) {
    return "Landed";
  } else if (shouldShowCell(flight.offUtc)) {
    return "In Flight";
  } else if (shouldShowCell(flight.outUtc)) {
    return "Departed";
  } else {
    return "Not Departed";
  }
};

const determineFlightStatusCode = (flight: any): string => {
  if (shouldShowCell(flight.flightStatusCode)) {
    return flight.flightStatusCode;
  }

  if (shouldShowCell(flight.inUtc)) {
    return "IN";
  } else if (shouldShowCell(flight.onUtc)) {
    return "ON";
  } else if (shouldShowCell(flight.offUtc)) {
    return "OFF";
  } else if (shouldShowCell(flight.outUtc)) {
    return "OUT";
  } else {
    return "NDPT";
  }
};

// Skeleton loader for cells
const CellSkeleton = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="h-4 bg-muted rounded w-16"></div>
  </div>
);

interface FlightSearchResultsProps {
  onDataFetched?: (data: any[]) => void;
}

export function FlightSearchResults({
  onDataFetched,
}: FlightSearchResultsProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [carrierCode, setCarrierCode] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [timeFormat, setTimeFormat] = useState<"utc" | "local">("utc");
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [isDecrypting, setIsDecrypting] = useState(false);
  const { toast } = useToast();

  // Function to render cell values
  const renderCellValue = (flight: any, field: string) => {
    const value = flight[field];

    // Special handling for baggage claim and actual arrival - show TBD if missing
    if (
      (field === "bagClaim" || field === "actualArrivalUTC") &&
      !shouldShowCell(value)
    ) {
      return (
        <span className="text-muted-foreground text-xs font-medium">TBD</span>
      );
    }

    // Don't show empty or TBD values for other fields
    if (!shouldShowCell(value)) {
      return (
        <span className="text-muted-foreground text-xs font-medium">TBD</span>
      );
    }

    // Check if this value is encrypted
    if (isLikelyEncrypted(value)) {
      // If we're currently decrypting this value, show a skeleton
      if (isDecrypting) {
        return <CellSkeleton />;
      }

      // If we have already decrypted this value
      if (decryptedMap[value]) {
        const decryptedValue = decryptedMap[value];

        // For status fields, apply special formatting
        if (field === "flightStatus" || field === "flightStatusCode") {
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

        // For departure state field, apply special formatting
        if (field === "DepartureState") {
          const displayValue = mapDepartureStateCodeToText(decryptedValue);
          const colorClass = getDepartureStateColor(decryptedValue);

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

        // For arrival state field, apply special formatting
        if (field === "ArrivalState") {
          const displayValue = mapArrivalStateCodeToText(decryptedValue);
          const colorClass = getArrivalStateColor(decryptedValue);

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

    // For non-encrypted status fields, apply special formatting with consistent capitalization
    if (field === "flightStatus") {
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

    // For non-encrypted departure state field, apply special formatting
    if (field === "DepartureState") {
      const displayValue = mapDepartureStateCodeToText(value);
      const colorClass = getDepartureStateColor(value);

      return (
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}
        >
          {displayValue}
        </span>
      );
    }

    // For non-encrypted arrival state field, apply special formatting
    if (field === "ArrivalState") {
      const displayValue = mapArrivalStateCodeToText(value);
      const colorClass = getArrivalStateColor(value);

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

    // Special handling for source field
    if (field === "source") {
      return (
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${
            value === "api"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {value === "api" ? "API" : "Blockchain"}
        </span>
      );
    }

    return value;
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
    Source: "Source of the flight data (blockchain or API)",
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

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow mb-4">
        <h2 className="text-lg font-semibold mb-4">Flight Search</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="carrierCode">
              Carrier Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="carrierCode"
              value={carrierCode}
              onChange={(e) => setCarrierCode(e.target.value)}
              placeholder="e.g. UA"
              maxLength={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flightNumber">
              Flight Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="flightNumber"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="e.g. 1234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {startDate ? format(startDate, "MM/dd/yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {endDate ? format(endDate, "MM/dd/yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              "Searching..."
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" /> Search Flights
              </>
            )}
          </Button>
        </div>
      </div>

      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="flight-table-container">
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow className="flight-table-header">
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
              ) : searchResults.length > 0 ? (
                searchResults.map((flight, index) => {
                  // Determine flight status based on UTC timestamps if not already set
                  const displayFlightStatus = shouldShowCell(
                    flight.flightStatus
                  )
                    ? flight.flightStatus
                    : determineFlightStatus(flight);

                  const displayFlightStatusCode = shouldShowCell(
                    flight.flightStatusCode
                  )
                    ? flight.flightStatusCode
                    : determineFlightStatusCode(flight);

                  // Determine departure and arrival states if not already set
                  const displayDepartureState = shouldShowCell(
                    flight.DepartureState
                  )
                    ? flight.DepartureState
                    : determineDepartureState(flight);

                  const displayArrivalState = shouldShowCell(
                    flight.ArrivalState
                  )
                    ? flight.ArrivalState
                    : determineArrivalState(flight);

                  return (
                    <TableRow
                      key={flight.eventId}
                      className={`flight-table-row ${
                        index % 2 === 0 ? "bg-muted/20" : ""
                      }`}
                    >
                      <TableCell className="txn-dtm-cell">
                        {renderCellValue(flight, "timestamp")}
                      </TableCell>
                      <TableCell>
                        {renderCellValue(flight, "carrierCode")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {flight.flightNumber}
                      </TableCell>
                      <TableCell>
                        {shouldShowCell(flight.departureCity) ||
                        shouldShowCell(flight.departureAirport) ? (
                          <>
                            {renderCellValue(flight, "departureCity")}
                            {shouldShowCell(flight.departureAirport) && (
                              <>
                                {" "}
                                ({renderCellValue(flight, "departureAirport")})
                              </>
                            )}
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
                            displayDepartureState
                          )}`}
                        >
                          {mapDepartureStateCodeToText(displayDepartureState)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {shouldShowCell(flight.arrivalCity) ||
                        shouldShowCell(flight.arrivalAirport) ? (
                          <>
                            {renderCellValue(flight, "arrivalCity")}
                            {shouldShowCell(flight.arrivalAirport) && (
                              <>
                                {" "}
                                ({renderCellValue(flight, "arrivalAirport")})
                              </>
                            )}
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
                            displayArrivalState
                          )}`}
                        >
                          {mapArrivalStateCodeToText(displayArrivalState)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getFlightStatusColor(
                            displayFlightStatus
                          )}`}
                        >
                          {mapStatusCodeToText(displayFlightStatus)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getFlightStatusColor(
                            displayFlightStatusCode
                          )}`}
                        >
                          {displayFlightStatusCode}
                        </span>
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
                        {renderCellValue(flight, "bagClaim")}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={19}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {isLoading
                      ? "Searching for flights..."
                      : "No flight data available. Search for flights to see results."}
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
