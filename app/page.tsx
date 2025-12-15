"use client";

import { useState, useEffect } from "react";
import { FlightCard } from "@/components/flight-card";
import { SearchBar } from "@/components/search-bar";
import { Navbar } from "@/components/navbar";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";
import { decryptFlightData, fetchHistoricalFlightData, searchFlightData } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function FlightTrackingDashboard() {
  const router = useRouter();

  const [flightData, setFlightData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFlightNumber, setCurrentFlightNumber] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [showPopup, setShowPopup] = useState(false); 

  const { isConnected, lastUpdate, events } = useBlockchainConnection();

  const handleSearch = async (flightNumber: string) => {
    setLoading(true);
    setCurrentFlightNumber(flightNumber);

    const rawCarrierCode =
    flightNumber.match(/^[A-Za-z]{2,3}/)?.[0] || flightNumber.substring(0, 2);
  
    const carrierCode = rawCarrierCode?.toUpperCase();
    const flightNum = flightNumber?.replace(/^[A-Z]{2,3}/, "");
    
    let arrivalCode: string = "";
    let departureCode: string = "";

    const fetchFlights = async () => {
      const result = await searchFlightData(flightNum,carrierCode);
      if (result?.flightInfo) {
        arrivalCode = result.flightInfo.arrivalAirport?.code;
        departureCode = result.flightInfo.departureAirport?.code;
      }
    };

    await fetchFlights();

    const trySearch = async (dateStr: string): Promise<any | null> => {
      const result = await fetchHistoricalFlightData(
        flightNum,
        carrierCode,
        dateStr,
        dateStr,
        arrivalCode,
        departureCode
      );
      return result?.flightDetails?.length > 0 ? result : null;
    };

    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      let data = await trySearch(todayStr);

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
          data = await trySearch(eventDate);
        }
      }

      if (!data) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().split("T")[0];
        data = await trySearch(yestStr);
      }

      if (data) {
        const flightData = data.flightDetails[0];

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
                if (segment.marketingAirlineCode && decryptedData[decryptIndex]) {
                  segment.marketingAirlineCode = decryptedData[decryptIndex++];
                }
                if (segment.flightNumber && decryptedData[decryptIndex]) {
                  segment.flightNumber = decryptedData[decryptIndex++];
                }
              }
            }
          } catch (decryptError) {
            console.error("Decryption failed", decryptError);
          }
        }

        flightData.searchedAt = new Date().toISOString();

        setFlightData(flightData);
        setLastRefresh(new Date());
      } else {
        setFlightData(null);
        setShowPopup(true);
      }
    } catch (error) {
      setFlightData(null);
      setShowPopup(true); 
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
      handleSearch(currentFlightNumber);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentFlightNumber]);

  useEffect(() => {
    if (events.length > 0 && currentFlightNumber) {
      const latestEvent = events[0];
      if (
        latestEvent.flightNumber === currentFlightNumber ||
        latestEvent.description?.includes(currentFlightNumber)
      ) {
        const debounce = setTimeout(() => {
          handleSearch(currentFlightNumber);
        }, 1000);

        return () => clearTimeout(debounce);
      }
    }
  }, [events, currentFlightNumber]);

  return (
    <div className="min-h-screen bg-background">

      {/*        POPUP UI START          */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center w-[300px]">
            <h2 className="text-lg font-semibold mb-2">Flight Not Found</h2>
            <p className="text-sm text-gray-600 mb-4">
              No flight data found for the entered flight number.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="px-5 py-2 bg-primary text-white rounded-md hover:bg-primary/85"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/*        POPUP UI END            */}

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
