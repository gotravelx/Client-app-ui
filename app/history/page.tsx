"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlightCard } from "@/components/flight-card";
import { Navbar } from "@/components/navbar";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";
import { useAuth } from "@/components/auth-provider";
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
  const { walletAddress, isConnected: isWalletConnected } = useAuth();
  const { isConnected, lastUpdate, events } = useBlockchainConnection();

  // Redirect to home if wallet is disconnected
  useEffect(() => {
    if (!isWalletConnected) {
      router.push("/");
    }
  }, [isWalletConnected, router]);

  const fetchHistoricalData = async () => {
    if (!flightNumber) {
      setFlights([]);
      setFilteredFlights([]);
      setLoading(false);
      return;
    }

    try {
      const match = flightNumber.match(/^([A-Z]{2,3})(\d+)$/);
      if (!match) {
        throw new Error("Invalid flight number format");
      }

      const CarrierCode = match[1].toUpperCase();
      const flightNum = match[2];

      setLoading(true);

      // 1. Fetch flight info to get airport codes
      const [flightInfoResult] = await Promise.all([
        searchFlightData(flightNum, CarrierCode).catch(() => null)
      ]);



      const arrivalCode = flightInfoResult?.flightInfo?.arrivalAirport?.code || "";
      const departureCode = flightInfoResult?.flightInfo?.departureAirport?.code || "";

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
        departureCode,
        walletAddress || undefined
      );

      if (data && data.flightDetails) {
        const allFlights = data.flightDetails;

        // 3. Optimized Batch Decryption (Collect ALL strings from ALL flights first)
        const allEncryptedStrings: string[] = [];
        const updateTargets: { obj: any, key: string }[] = [];

        for (const flight of allFlights) {
          if (flight.marketedFlightSegments) {
            for (const segment of flight.marketedFlightSegments) {
              if (segment.marketingAirlineCode) {
                allEncryptedStrings.push(segment.marketingAirlineCode);
                updateTargets.push({ obj: segment, key: "marketingAirlineCode" });
              }
              if (segment.flightNumber) {
                allEncryptedStrings.push(segment.flightNumber);
                updateTargets.push({ obj: segment, key: "flightNumber" });
              }
            }
          }
        }

        // Single API call instead of loops
        if (allEncryptedStrings.length > 0) {
          try {
            const decryptedValues = await decryptFlightData(allEncryptedStrings);
            for (let i = 0; i < decryptedValues.length; i++) {
              if (decryptedValues[i]) {
                updateTargets[i].obj[updateTargets[i].key] = decryptedValues[i];
              }
            }
          } catch (decryptError) {
            console.error("Batch decryption failed", decryptError);
          }
        }

        // Sortable time helper
        const getSortTime = (f: any) => {
          const d = f.scheduledDepartureDate ||
            f.times?.scheduledDeparture ||
            f.times?.estimatedDeparture ||
            f.departureDate;
          return d ? new Date(d).getTime() : 0;
        };

        // Sort newest first
        const sortedFlights = allFlights.sort(
          (a: any, b: any) => getSortTime(b) - getSortTime(a)
        );

        setFlights(sortedFlights);
        setFilteredFlights(sortedFlights);

        // Extract available dates
        const dates: string[] = Array.from(
          new Set<string>(
            sortedFlights
              .map((f: any) => f.scheduledDepartureDate as string)
              .filter((d: any): d is string => typeof d === "string" && d !== "")
          )
        ).sort().reverse();

        setAvailableDates(dates);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
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
      const filtered = flights.filter((f: any) => f.scheduledDepartureDate === date);
      setFilteredFlights(filtered);
    } else {
      setFilteredFlights(flights);
    }
  };

  const clearFilter = () => {
    setSelectedDate("");
    setFilteredFlights(flights);
  };

  const formatDateLabel = (input: any) => {
    if (!input) return "History";

    // Handle both flight object and direct date string
    const dateStr = typeof input === "string"
      ? input
      : (input.scheduledDepartureDate ||
        input.times?.scheduledDeparture ||
        input.times?.estimatedDeparture ||
        input.departureDate);

    if (!dateStr) return "History";

    const date = moment(dateStr).startOf("day");
    if (!date.isValid()) return "History";

    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "day").startOf("day");

    if (date.isSame(today, "day")) {
      return "Today";
    } else if (date.isSame(yesterday, "day")) {
      return "Yesterday";
    } else {
      return date.format("dddd DD-MMM-YYYY");
    }
  };

  const getDateBadge = (flight: any) => {
    const label = formatDateLabel(flight);
    const displayLabel = label === "History" ? "Flight History" : label;

    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600 border-none px-3 py-1">
        {displayLabel}
      </Badge>
    );
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
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 md:pl-12">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full mt-1 -ml-12 hidden md:flex"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-1">
                Flight History
              </h1>
              <p className="text-muted-foreground text-lg">
                Last 30 days of data for{" "}
                <span className="font-bold text-primary">{flightNumber}</span>
              </p>
            </div>
          </div>

          {flights.length > 0 && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={selectedDate ? "default" : "outline"}
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {selectedDate
                      ? moment(selectedDate).format("MMM DD, YYYY")
                      : "Filter by Date"}
                    {selectedDate && (
                      <X
                        className="h-3 w-3 ml-1 hover:text-destructive"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          clearFilter();
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    <p className="text-xs font-medium px-2 py-1.5 text-muted-foreground">
                      Available Dates
                    </p>
                    <div className="max-h-60 overflow-y-auto pr-1">
                      {availableDates.map((date) => (
                        <button
                          key={date}
                          onClick={() => handleDateFilter(date)}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${selectedDate === date
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{moment(date).format("MMM DD, YYYY")}</span>
                            <span className="text-[10px] opacity-70">
                              {formatDateLabel(date)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {filteredFlights.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
              <Filter className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No History Found</h3>
            <p className="text-muted-foreground">
              We couldn't find any historical data for this flight number.
            </p>
          </div>
        ) : (
          <div className="relative pl-0 md:pl-12 space-y-12">
            {/* Timeline Vertical Line */}
            <div className="absolute left-0 md:left-4 top-0 bottom-0 w-px bg-border hidden md:block" />

            {filteredFlights.map((flight, index) => (
              <div key={index} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-12 top-0 mt-1 hidden md:flex items-center justify-center w-8 h-8">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>

                <div className="flex items-center gap-4 mb-4 relative z-10">
                  {getDateBadge(flight)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
