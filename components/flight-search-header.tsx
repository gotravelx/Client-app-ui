"use client";

import { useState, useEffect } from "react";
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
import { Calendar, Clock, FileDown, FileSpreadsheet } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import { getBaseUrl } from "@/utils/base_url";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface FlightSearchHeaderProps {
  onTimeFormatChange: (format: "utc" | "local") => void;
  timeFormat: "utc" | "local";
  onSearch: (params: SearchParams) => void;
  flightData: any[];
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
  flightData,
}: FlightSearchHeaderProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [carrierCode, setCarrierCode] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfDay(new Date())
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    endOfDay(new Date())
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setStartDate(startOfDay(new Date()));
    setEndDate(endOfDay(new Date()));
  }, []);

  const exportToExcel = () => {
    if (flightData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no flight data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = flightData.map((flight) => ({
        "Transaction Date": flight.timestamp,
        Carrier: flight.carrierCode,
        "Flight Number": flight.flightNumber,
        "Departure Station": `${flight.departureCity} (${flight.departureAirport})`,
        "Departure State": flight.DepartureState,
        "Arrival Station": `${flight.arrivalCity} (${flight.arrivalAirport})`,
        "Arrival State": flight.ArrivalState,
        "Flight Status": flight.flightStatus,
        "Flight Status Code": flight.flightStatusCode,
        "Departure Gate": flight.departureGate,
        "Arrival Gate": flight.arrivalGate,
        "Scheduled Departure": flight.scheduledDepartureUTC,
        "Scheduled Arrival": flight.scheduledArrivalUTC,
        "Estimated Departure": flight.estimatedDepartureUTC,
        "Estimated Arrival": flight.estimatedArrivalUTC,
        "Actual Departure": flight.actualDepartureUTC,
        "Actual Arrival": flight.actualArrivalUTC,
        "Baggage Claim": flight.bagClaim,
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Flight Data");

      // Generate Excel file
      const fileName = `flight_data_${format(
        new Date(),
        "yyyy-MM-dd_HH-mm-ss"
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
    if (flightData.length === 0) {
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
        `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
        14,
        30
      );
      const tableColumn = [
        "Txn DTM",
        "Carrier",
        "Flight",
        "Dep Stn",
        "Dep State",
        "Arr Stn",
        "Arr State",
        "Status",
        "Dep Gate",
        "Arr Gate",
        "Baggage",
      ];

      const tableRows = flightData.map((flight) => [
        flight.timestamp.substring(0, 16),
        flight.carrierCode,
        flight.flightNumber,
        flight.departureAirport,
        flight.DepartureState || "TBD",
        flight.arrivalAirport,
        flight.ArrivalState || "TBD",
        flight.flightStatus,
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
        "yyyy-MM-dd_HH-mm-ss"
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

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow mb-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-end flex-1">
          <div className="space-y-2 w-full md:w-24">
            <Label htmlFor="carrierCode">
              Carrier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="carrierCode"
              placeholder="e.g. UA"
              value={carrierCode}
              onChange={(e) => setCarrierCode(e.target.value)}
              maxLength={3}
              required
              className="border-red-500 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2 w-full md:w-32">
            <Label htmlFor="flightNumber">
              Flight Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="flightNumber"
              placeholder="e.g. 1234"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              required
              className="border-red-500 focus:ring-red-500"
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
                  {startDate ? format(startDate, "MM/dd/yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
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
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full md:w-auto">
            <Button>{isLoading ? "Searching..." : "Search Flights"}</Button>
          </div>
        </div>

        <div className="flex items-end space-x-2">
          <div className="space-y-2">
            <Label>Time Display Format</Label>
            <Select
              value={timeFormat}
              onValueChange={(value: "utc" | "local") =>
                onTimeFormatChange(value as "utc" | "local")
              }
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
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={exportToPDF}
                title="Export to PDF"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
