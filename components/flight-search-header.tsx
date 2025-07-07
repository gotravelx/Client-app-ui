"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  FileDown,
  FileSpreadsheet,
  X,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface FlightSearchHeaderProps {
  onTimeFormatChange: (format: "utc" | "local") => void;
  timeFormat: "utc" | "local";
  onSearch: (params: SearchParams) => void;
  onClearSearch?: () => void;
  flightData: any[];
  isSearchMode?: boolean;
  currentSearchParams?: SearchParams | null;
}

export interface SearchParams {
  flightNumber: string;
  carrierCode: string;
  startDate: Date | null;
  endDate: Date | null;
}

export function FlightSearchHeader({
  onTimeFormatChange,
  timeFormat,
  onSearch,
  onClearSearch,
  flightData,
  isSearchMode = false,
  currentSearchParams = null,
}: FlightSearchHeaderProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [carrierCode, setCarrierCode] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(
    startOfDay(new Date())
  );
  const [endDate, setEndDate] = useState<Date | null>(endOfDay(new Date()));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const thirtyMonthsAgo = useMemo(() => subMonths(new Date(), 30), []);
  const today = useMemo(() => new Date(), []);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Update form fields if currentSearchParams changes
  useEffect(() => {
    if (currentSearchParams) {
      setFlightNumber(currentSearchParams.flightNumber || "");
      setCarrierCode(currentSearchParams.carrierCode || "");
      if (currentSearchParams.startDate) {
        setStartDate(currentSearchParams.startDate);
      }
      if (currentSearchParams.endDate) {
        setEndDate(currentSearchParams.endDate);
      }
    }
  }, [currentSearchParams]);

  useEffect(() => {
    setStartDate(startOfDay(new Date()));
    setEndDate(endOfDay(new Date()));
  }, []);

  const handleSearch = () => {
    if (!flightNumber || !carrierCode) {
      toast({
        title: "Missing information",
        description: "Please enter both flight number and carrier code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const searchParams: SearchParams = {
      flightNumber,
      carrierCode,
      startDate,
      endDate,
    };

    onSearch(searchParams);

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleClearSearch = () => {
    setFlightNumber("");
    setCarrierCode("");
    setStartDate(startOfDay(new Date()));
    setEndDate(endOfDay(new Date()));

    if (onClearSearch) {
      onClearSearch();
    }
  };

  const exportToExcel = () => {
    if (!flightData || flightData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no flight data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export with proper time formatting
      const exportData = flightData.map((flight) => {
        const formatTime = (timestamp: string) => {
          if (!timestamp || timestamp === "TBD") return "TBD";
          try {
            const date = new Date(timestamp);
            return timeFormat === "utc"
              ? date
                  .toISOString()
                  .replace("T", " ")
                  .replace(/\.\d+Z$/, "Z")
              : date.toLocaleString("en-US", { hour12: true });
          } catch {
            return timestamp;
          }
        };

        return {
          Date: flight.date || extractDateFromTimestamp(flight.timestamp),
          Carrier: flight.carrierCode || flight.carrier,
          "Flight Number": flight.flightNumber,
          Status: flight.statusText || flight.status,
          "Event Time": formatTime(flight.eventTime || flight.timestamp),
          "Departure Station":
            flight.departureCity && flight.departureAirport
              ? `${flight.departureCity} (${flight.departureAirport})`
              : flight.departureCity || flight.departureAirport || "TBD",
          "Departure State": flight.DepartureState || "TBD",
          "Arrival Station":
            flight.arrivalCity && flight.arrivalAirport
              ? `${flight.arrivalCity} (${flight.arrivalAirport})`
              : flight.arrivalCity || flight.arrivalAirport || "TBD",
          "Arrival State": flight.ArrivalState || "TBD",
          "Departure Gate": flight.departureGate || "TBD",
          "Arrival Gate": flight.arrivalGate || "TBD",
          "Baggage Claim": flight.bagClaim || "TBD",
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Flight Data");

      // Generate Excel file
      const fileName = `flight_data_${format(
        new Date(),
        "MM-dd-yyyy_HH-mm-ss"
      )}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: `Flight data has been exported to ${fileName}`,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export flight data to Excel.",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    if (!flightData || flightData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no flight data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const doc = new jsPDF("landscape");
      doc.setFontSize(18);
      doc.text("Flight Data Report", 14, 22);
      doc.setFontSize(10);
      doc.text(
        `Generated: ${format(new Date(), "MM/dd/yyyy HH:mm:ss")}`,
        14,
        30
      );

      const tableColumn = [
        "Date",
        "Carrier",
        "Flight",
        "Status",
        "Event Time",
        "Dep Stn",
        "Dep State",
        "Arr Stn",
        "Arr State",
        "Dep Gate",
        "Arr Gate",
        "Baggage",
      ];

      const formatTime = (timestamp: string) => {
        if (!timestamp || timestamp === "TBD") return "TBD";
        try {
          const date = new Date(timestamp);
          return timeFormat === "utc"
            ? date
                .toISOString()
                .replace("T", " ")
                .replace(/\.\d+Z$/, "Z")
                .substring(0, 16)
            : date.toLocaleString("en-US", { hour12: true }).substring(0, 16);
        } catch {
          return timestamp.substring(0, 16);
        }
      };

      const tableRows = flightData.map((flight) => [
        flight.date || extractDateFromTimestamp(flight.timestamp),
        flight.carrierCode || flight.carrier,
        flight.flightNumber,
        flight.statusText || flight.status,
        formatTime(flight.eventTime || flight.timestamp),
        flight.departureAirport || "TBD",
        flight.DepartureState || "TBD",
        flight.arrivalAirport || "TBD",
        flight.ArrivalState || "TBD",
        flight.departureGate || "TBD",
        flight.arrivalGate || "TBD",
        flight.bagClaim || "TBD",
      ]);
      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
      });

      const fileName = `flight_data_${format(
        new Date(),
        "MM-dd-yyyy_HH-mm-ss"
      )}.pdf`;
      doc.save(fileName);

      toast({
        title: "Export Successful",
        description: `Flight data has been exported to ${fileName}`,
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export flight data to PDF.",
        variant: "destructive",
      });
    }
  };

  const extractDateFromTimestamp = (timestamp: string) => {
    if (!timestamp) return "";
    try {
      return timestamp.split("T")[0];
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="bg-white mt-2 dark:bg-gray-800 border rounded-lg shadow-sm sticky top-20 z-40 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      {!isCollapsed && (
        <div className="p-4">
          <div className="flex flex-col  md:flex-row gap-4 md:items-end">
            <div className="flex flex-col md:flex-row gap-4 md:items-end flex-1">
              <div className="space-y-2 w-full md:w-24">
                <Label htmlFor="carrierCode">
                  Carrier{" "}
                  <span
                    className={
                      carrierCode ? "text-transparent" : "text-red-500"
                    }
                  >
                    *
                  </span>
                </Label>
                <Input
                  id="carrierCode"
                  placeholder="e.g. UA"
                  value={carrierCode}
                  onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                  maxLength={3}
                  required
                  className={
                    carrierCode ? "" : "border-red-500 focus:ring-red-500"
                  }
                />
              </div>

              <div className="space-y-2 w-full md:w-32">
                <Label htmlFor="flightNumber">
                  Flight Number{" "}
                  <span
                    className={
                      flightNumber ? "text-transparent" : "text-red-500"
                    }
                  >
                    *
                  </span>
                </Label>
                <Input
                  id="flightNumber"
                  placeholder="e.g. 1234"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  required
                  className={
                    flightNumber ? "" : "border-red-500 focus:ring-red-500"
                  }
                />
              </div>

              <div className="space-y-2 w-full md:w-40">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "MM/dd/yyyy")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate || undefined}
                      onSelect={(day) => setStartDate(day || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 w-full md:w-40">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MM/dd/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate || undefined}
                      onSelect={(day) => setEndDate(day || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-full md:w-auto flex gap-2">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  {isLoading ? "Searching..." : "Search Flights"}
                </Button>

                {isSearchMode && (
                  <Button variant="outline" onClick={handleClearSearch}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-end space-x-2">
              <div className="space-y-2">
                <Label>Time Display Format</Label>
                <Select
                  value={timeFormat}
                  onValueChange={(value: "utc" | "local") => {
                    console.log("Time format changed to:", value);
                    onTimeFormatChange(value);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC Time</SelectItem>
                    <SelectItem value="local">Local Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Export Data</Label>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={exportToExcel}
                    title="Export to Excel"
                    disabled={!flightData || flightData.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={exportToPDF}
                    title="Export to PDF"
                    disabled={!flightData || flightData.length === 0}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {isSearchMode && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Showing search results for flight{" "}
                <strong>{currentSearchParams?.flightNumber}</strong> with
                carrier <strong>{currentSearchParams?.carrierCode}</strong> from{" "}
                {currentSearchParams?.startDate
                  ? format(currentSearchParams.startDate, "MM/dd/yyyy")
                  : ""}{" "}
                to{" "}
                {currentSearchParams?.endDate
                  ? format(currentSearchParams.endDate, "MM/dd/yyyy")
                  : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
