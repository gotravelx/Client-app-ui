"use client";

import { useState, useEffect } from "react";
import { FlightCard } from "@/components/flight-card";
import { SearchBar } from "@/components/search-bar";
import { Navbar } from "@/components/navbar";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";
import { useAuth } from "@/components/auth-provider";
import { decryptFlightData, fetchHistoricalFlightData, searchFlightData } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, ShieldCheck, Wallet, ArrowRight } from "lucide-react";

export default function FlightTrackingDashboard() {
  const router = useRouter();

  const [flightData, setFlightData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFlightNumber, setCurrentFlightNumber] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [showPopup, setShowPopup] = useState(false);

  const { isConnected, lastUpdate, events } = useBlockchainConnection();
  const { isConnected: isWalletConnected, connect: connectWallet, isConnecting: isWalletConnecting, walletAddress } = useAuth();
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    // Show connect modal immediately if not connected
    if (!isWalletConnected) {
      setShowConnectModal(true);
    }
  }, [isWalletConnected]);

  const handleWalletConnect = async () => {
    await connectWallet();
  };

  useEffect(() => {
    if (isWalletConnected) {
      setShowConnectModal(false);
    } else {
      // Clear sensitive/session data on disconnect
      setFlightData(null);
      setCurrentFlightNumber("");
      setLastRefresh(null);
    }
  }, [isWalletConnected]);

  const handleSearch = async (flightNumber: string) => {
    setLoading(true);
    setCurrentFlightNumber(flightNumber);

    const rawCarrierCode =
      flightNumber.match(/^[A-Za-z]{2,3}/)?.[0] || flightNumber.substring(0, 2);

    const carrierCode = rawCarrierCode?.toUpperCase();
    const flightNum = flightNumber?.replace(/^[A-Z]{2,3}/, "");

    let arrivalCode: string = "";
    let departureCode: string = "";

    let initialHash: string = "";
    const fetchFlights = async () => {
      const result = await searchFlightData(flightNum, carrierCode);
      if (result?.flightInfo) {
        arrivalCode = result.flightInfo.arrivalAirport?.code;
        departureCode = result.flightInfo.departureAirport?.code;
        initialHash = result.flightInfo.blockchainHash || "";
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
        departureCode,
        walletAddress || undefined
      );
      return result?.flightDetails?.length > 0 ? result : null;
    };

    try {
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - 3);

      const todayStr = today.toISOString().split("T")[0];
      const startDateStr = startDate.toISOString().split("T")[0];

      const result = await fetchHistoricalFlightData(
        flightNum,
        carrierCode,
        startDateStr,
        todayStr,
        arrivalCode,
        departureCode,
        walletAddress || undefined
      );

      let data = result?.flightDetails?.length > 0 ? result : null;

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

      if (data && data.flightDetails?.length > 0) {
        // Sort to get the latest flight
        const getSortTime = (f: any) => {
          const d = f.scheduledDepartureDate ||
            f.times?.scheduledDeparture ||
            f.times?.estimatedDeparture ||
            f.departureDate;
          return d ? new Date(d).getTime() : 0;
        };

        const sortedFlights = data.flightDetails.sort(
          (a: any, b: any) => getSortTime(b) - getSortTime(a)
        );

        const flightData = sortedFlights[0];

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

        // Ensure hash is preserved
        if (!flightData.blockchainHash && initialHash) {
          flightData.blockchainHash = initialHash;
        }

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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-card p-8 rounded-xl shadow-2xl text-center w-[340px] border border-border animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-3 tracking-tight">Flight Data Unavailable</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We couldn't find any real-time or historical data for this flight number. Please verify the flight number and try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowPopup(false)}
                className="w-full px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Simplified Auto-Connect Modal */}
      {showConnectModal && !isWalletConnected && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-card p-6 rounded-xl shadow-lg border border-border max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Please connect your wallet to access flight subscriptions and history.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleWalletConnect}
                disabled={isWalletConnecting}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                {isWalletConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Connect Wallet"
                )}
              </button>

              <button
                onClick={() => setShowConnectModal(false)}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all"
              >
                I'll do it later
              </button>
            </div>
          </div>
        </div>
      )}


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
