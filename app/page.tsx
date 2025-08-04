"use client";

import { useState, useEffect } from "react";
import { FlightCard } from "@/components/flight-card";
import { SearchBar } from "@/components/search-bar";
import { Navbar } from "@/components/navbar";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";
import { decryptFlightData, fetchHistoricalFlightData } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function FlightTrackingDashboard() {
  const router = useRouter();

  const [flightData, setFlightData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFlightNumber, setCurrentFlightNumber] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { isConnected, lastUpdate, events } = useBlockchainConnection();

  const handleSearch = async (flightNumber: string) => {
    setLoading(true);
    setCurrentFlightNumber(flightNumber);

    const carrierCode =
      flightNumber.match(/^[A-Z]{2,3}/)?.[0] || flightNumber.substring(0, 2);
    const flightNum = flightNumber.replace(/^[A-Z]{2,3}/, "");

    const trySearch = async (dateStr: string): Promise<any | null> => {
      const result = await fetchHistoricalFlightData(
        flightNum,
        carrierCode,
        dateStr,
        dateStr
      );
      return result?.flightDetails?.length > 0 ? result : null;
    };

    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // 1. Try today's data
      let data = await trySearch(todayStr);

      // 2. Fallback to blockchain event date if available
      if (!data && events.length > 0) {
        const relatedEvent = events.find(
          (e) =>
            e.flightNumber === flightNumber ||
            e.description?.includes(flightNumber)
        );

        if (relatedEvent?.timestamp) {
          const eventDate = new Date(relatedEvent.timestamp)
            .toISOString()
            .split("T")[0];
          console.log("Fallback to event date:", eventDate);
          data = await trySearch(eventDate);
        }
      }

      // 3. Fallback to yesterday
      if (!data) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().split("T")[0];
        console.log("Fallback to yesterday:", yestStr);
        data = await trySearch(yestStr);
      }

      if (data) {
        const flightData = data.flightDetails[0];

        // Decrypt if needed
        const encryptedFields: string[] = [];
        if (flightData.marketedFlightSegments) {
          for (const segment of flightData.marketedFlightSegments) {
            if (segment.marketingAirlineCode)
              encryptedFields.push(segment.marketingAirlineCode);
            if (segment.flightNumber)
              encryptedFields.push(segment.flightNumber);
          }
        }

        if (encryptedFields.length > 0) {
          try {
            const decryptedData = await decryptFlightData(encryptedFields);
            let decryptIndex = 0;

            if (flightData.marketedFlightSegments) {
              for (const segment of flightData.marketedFlightSegments) {
                if (
                  segment.marketingAirlineCode &&
                  decryptedData[decryptIndex]
                ) {
                  segment.marketingAirlineCode = decryptedData[decryptIndex++];
                }
                if (segment.flightNumber && decryptedData[decryptIndex]) {
                  segment.flightNumber = decryptedData[decryptIndex++];
                }
              }
            }
          } catch (decryptError) {
            console.error("Decryption failed:", decryptError);
          }
        }

        flightData.searchedAt = new Date().toISOString();
        setFlightData(flightData);
        setLastRefresh(new Date());
      } else {
        setFlightData(null);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setFlightData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentFlightNumber) return;

    setRefreshing(true);
    try {
      await handleSearch(currentFlightNumber);
    } finally {
      setRefreshing(false);
    }
  };

  const redirectToHistoricalData = () => {
    if (currentFlightNumber) {
      router.push(
        `/history?flightNumber=${encodeURIComponent(currentFlightNumber)}`
      );
    }
  };

  useEffect(() => {
    if (!currentFlightNumber) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing flight data...");
      handleSearch(currentFlightNumber);
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [currentFlightNumber]);

  useEffect(() => {
    if (events.length > 0 && currentFlightNumber) {
      const latestEvent = events[0];
      if (
        latestEvent.flightNumber === currentFlightNumber ||
        latestEvent.description?.includes(currentFlightNumber)
      ) {
        console.log("Blockchain event received, refreshing flight data...");
        const debounce = setTimeout(() => {
          handleSearch(currentFlightNumber);
        }, 1000);

        return () => clearTimeout(debounce);
      }
    }
  }, [events, currentFlightNumber]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showRefresh={!!currentFlightNumber}
        lastRefresh={lastRefresh}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <SearchBar onSearch={handleSearch} loading={loading} />
        <div className="mt-4 text-center">
          <p className="text-muted-foreground">
            Search flights and track real-time updates from blockchain
          </p>
        </div>
        {flightData && (
          <div className="mt-8">
            <FlightCard
              flight={flightData}
              events={events.filter(
                (e) =>
                  e.flightNumber === currentFlightNumber ||
                  e.description?.includes(currentFlightNumber)
              )}
            />

            <div className="mt-6 text-center">
              <button
                onClick={redirectToHistoricalData}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                View Historical Data (Last 30 Days)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
