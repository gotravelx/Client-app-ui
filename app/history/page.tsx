"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlightCard } from "@/components/flight-card";
import { Navbar } from "@/components/navbar";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";
import { decryptFlightData, fetchHistoricalFlightData, searchFlightData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import moment from "moment-timezone";

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const flightNumber = searchParams.get("flightNumber") || "";
  const router = useRouter();

  const [flights, setFlights] = useState<any[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { isConnected, lastUpdate, events } = useBlockchainConnection();

  const fetchHistoricalData = async () => {
    if (!flightNumber) return;

    try {
      let arrivalCode: string ="";
      let departureCode: string="";
      const match = flightNumber.match(/^([A-Z]{2,3})(\d+)$/);

      if (!match) {
        throw new Error("Invalid flight number format");
      }
      
      const CarrierCode = match[1].toUpperCase();
      const flightNum = match[2];   
  
      try {
        const flightInfoResult = await searchFlightData(flightNum,CarrierCode);
        if (flightInfoResult?.flightInfo) {
          arrivalCode = flightInfoResult.flightInfo.arrivalAirport?.code;
          departureCode = flightInfoResult.flightInfo.departureAirport?.code;
        }
      } catch (e) {
        console.warn("Could not fetch flight info for airport codes", e);
      }

      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const carrierCode =
        flightNumber.match(/^[A-Z]{2,3}/)?.[0] || flightNumber.substring(0, 2);
     

      const data = await fetchHistoricalFlightData(
        flightNum,
        carrierCode,
        startDate,
        endDate,
        arrivalCode,
        departureCode
      );

      if (data && data.flightDetails) {
        // Process and decrypt flight data
        const processedFlights = [];
        for (const flight of data.flightDetails) {
          const encryptedFields = [];
          if (flight.marketedFlightSegments) {
            for (const segment of flight.marketedFlightSegments) {
              if (segment.marketingAirlineCode) {
                encryptedFields.push(segment.marketingAirlineCode);
              }
              if (segment.flightNumber) {
                encryptedFields.push(segment.flightNumber);
              }
            }
          }

          if (encryptedFields.length > 0) {
            try {
              const decryptedData = await decryptFlightData(encryptedFields);
              let decryptIndex = 0;

              if (flight.marketedFlightSegments) {
                for (const segment of flight.marketedFlightSegments) {
                  if (
                    segment.marketingAirlineCode &&
                    decryptedData[decryptIndex]
                  ) {
                    segment.marketingAirlineCode =
                      decryptedData[decryptIndex++];
                  }
                  if (segment.flightNumber && decryptedData[decryptIndex]) {
                    segment.flightNumber = decryptedData[decryptIndex++];
                  }
                }
              }
            } catch (decryptError) {
            }
          }

          processedFlights.push(flight);
        }

        // Sort flights by date (newest first)
        const sortedFlights = processedFlights.sort(
          (a, b) =>
            new Date(b.scheduledDepartureDate).getTime() -
            new Date(a.scheduledDepartureDate).getTime()
        );

        setFlights(sortedFlights);
        setFilteredFlights(sortedFlights);

        // Extract available dates
        const dates = [
          ...new Set(sortedFlights.map((f) => f.scheduledDepartureDate)),
        ]
          .sort()
          .reverse();
        setAvailableDates(dates);
        setLastRefresh(new Date());
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchHistoricalData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDateFilter = (date: string) => {
    setSelectedDate(date);
    if (date) {
      const filtered = flights.filter((f) => f.scheduledDepartureDate === date);
      setFilteredFlights(filtered);
    } else {
      setFilteredFlights(flights);
    }
  };

  const clearFilter = () => {
    setSelectedDate("");
    setFilteredFlights(flights);
  };

  const formatDateLabel = (dateStr: string) => {
    const date = moment(dateStr);
    const today = moment();
    const yesterday = moment().subtract(1, "day");

    if (date.isSame(today, "day")) {
      return "Today";
    } else if (date.isSame(yesterday, "day")) {
      return "Yesterday";
    } else {
      const daysAgo = today.diff(date, "days");
      return `${daysAgo} days ago`;
    }
  };

  const getDateBadge = (dateStr: string) => {
    const label = formatDateLabel(dateStr);
    const date = moment(dateStr).format("MMM DD");

    if (label === "Today") {
      return (
        <Badge variant="default" className="bg-green-500">
          {label}
        </Badge>
      );
    } else if (label === "Yesterday") {
      return <Badge variant="secondary">{label}</Badge>;
    } else {
      return (
        <Badge variant="outline">
          {date} ({label})
        </Badge>
      );
    }
  };

  useEffect(() => {
    fetchHistoricalData();
  }, [flightNumber]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!flightNumber) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing historical data...");
      fetchHistoricalData();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [flightNumber]);

  // Refresh on blockchain events
  useEffect(() => {
    if (events.length > 0 && flightNumber) {
      const latestEvent = events[0];
      if (
        latestEvent.flightNumber === flightNumber ||
        latestEvent.description?.includes(flightNumber)
      ) {
        console.log("Blockchain event received, refreshing historical data...");
        const debounce = setTimeout(() => {
          fetchHistoricalData();
        }, 1000);

        return () => clearTimeout(debounce);
      }
    }
  }, [events, flightNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar
          isConnected={isConnected}
          lastUpdate={lastUpdate}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showRefresh={true}
          lastRefresh={lastRefresh}
        />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" data-testid="loading-spinner"></div>
            <p className="mt-2 text-muted-foreground">
              Loading historical flight data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showRefresh={true}
        lastRefresh={lastRefresh}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4 flex items-center justify-start gap-3 ">
          <Button className="font-bold mb-2" onClick={() => window.history.back()}>
            <ArrowLeft className="font-bold" />
            Back
          </Button>
          <h1 className="text-lg font-bold mb-2">
            Historical Flight Data - {flightNumber}
            <p className="text-muted-foreground text-sm">
              Last 30 days of flight history
            </p>
          </h1>
        </div>
        {/* Filter Controls */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filter by Date
                {selectedDate && (
                  <Badge variant="secondary" className="ml-2">
                    1
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Available Dates</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableDates.map((date) => (
                    <Button
                      key={date}
                      variant={selectedDate === date ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDateFilter(date)}
                      className="justify-start"
                    >
                      <Calendar className="h-3 w-3 mr-2" />
                      {moment(date).format("MMM DD")}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {selectedDate && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing flights for{" "}
                {moment(selectedDate).format("MMMM DD, YYYY")}
              </span>
              <Button data-testid="clear-date-filter" variant="ghost" size="sm" onClick={clearFilter}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="ml-auto">
            <Badge variant="outline">
              {filteredFlights.length} flight
              {filteredFlights.length !== 1 ? "s" : ""} found
            </Badge>
          </div>
        </div>

        {/* Flight Cards */}
        <div className="space-y-6">
          {filteredFlights.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No flights found</h3>
              <p className="text-muted-foreground text-md">
                {selectedDate
                  ? `No flights found for ${moment(selectedDate).format(
                      "MMMM DD, YYYY"
                    )}`
                  : "No historical flight data available for this flight number"}
              </p>
            </div>
          ) : (
            filteredFlights.map((flight, index) => (
              <div
                key={`${flight.scheduledDepartureDate}-${index}`}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDateBadge(flight.scheduledDepartureDate)}
                    <span className="text-sm text-muted-foreground">
                      {moment(flight.scheduledDepartureDate).format(
                        "dddd, MMMM DD, YYYY"
                      )}
                    </span>
                  </div>
                </div>
                <FlightCard
                  flight={flight}
                  events={events.filter(
                    (e) =>
                      e.flightNumber === flightNumber ||
                      e.description?.includes(flightNumber)
                  )}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
