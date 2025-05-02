"use client";

import { useState } from "react";
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
import { Calendar, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface FlightSearchHeaderProps {
  onTimeFormatChange: (format: "utc" | "local") => void;
  timeFormat: "utc" | "local";
}

export function FlightSearchHeader({
  onTimeFormatChange,
  timeFormat,
}: FlightSearchHeaderProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [carrierCode, setCarrierCode] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleSearch = () => {
    // Log search parameters to console
    console.log("Searching for flights with parameters:", {
      flightNumber,
      carrierCode,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
    });

    // In a real implementation, this would call a function to fetch data from blockchain
    alert(
      "Search parameters logged to console. Check browser developer tools."
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow mb-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {/* Left side: Search fields */}
        <div className="flex flex-col md:flex-row gap-4 md:items-end flex-1">
          {/* Carrier Code Input */}
          <div className="space-y-2 w-full md:w-24">
            <Label htmlFor="carrierCode">Carrier</Label>
            <Input
              id="carrierCode"
              placeholder="e.g. UA"
              value={carrierCode}
              onChange={(e) => setCarrierCode(e.target.value)}
              maxLength={3}
            />
          </div>

          {/* Flight Number Input */}
          <div className="space-y-2 w-full md:w-32">
            <Label htmlFor="flightNumber">Flight Number</Label>
            <Input
              id="flightNumber"
              placeholder="e.g. 1234"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
            />
          </div>

          {/* Start Date */}
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

          {/* End Date */}
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

          {/* Search Button */}
          <div className="w-full md:w-auto">
            <Button onClick={handleSearch}>Search Flights</Button>
          </div>
        </div>

        {/* Right side: Time Format Toggle */}
        <div className="flex items-end space-x-2">
          <div className="space-y-2">
            <Label>Time Display Format</Label>
            <Select
              value={timeFormat}
              onValueChange={(value) =>
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
        </div>
      </div>
    </div>
  );
}
