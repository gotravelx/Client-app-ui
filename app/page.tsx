"use client";

import { useState, useEffect } from "react";
import { FlightCard } from "@/components/flight-card";
import { SearchBar } from "@/components/search-bar";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-provider";
import { decryptFlightData, fetchHistoricalFlightData, searchFlightData } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Info, Activity } from "lucide-react";
import { WalletSelectorModal } from "@/components/wallet-selector-modal";
import { useBlockchainConnection } from "@/hooks/use-blockchain-connection";

export default function FlightTrackingDashboard() {
  const router = useRouter();

  const [flightData, setFlightData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFlightNumber, setCurrentFlightNumber] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState("Flight Data Unavailable");
  const [popupDescription, setPopupDescription] = useState("We couldn't find any real-time or historical data for this flight number. Please verify the flight number and try again.");

  const { isConnected: isWalletConnected, connect: connectWallet, isConnecting: isWalletConnecting, walletAddress, error: walletError } = useAuth();
  const [activeConnecting, setActiveConnecting] = useState<"metamask" | "coinbase" | "trust" | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  const { isConnected, lastUpdate, events } = useBlockchainConnection();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleWalletConnect = async (type: "metamask" | "coinbase" | "trust") => {
    try {
      setActiveConnecting(type);
      await connectWallet(type);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    } finally {
      setActiveConnecting(null);
    }
  };

  useEffect(() => {
    if (!isWalletConnected) {
      // Clear sensitive/session data on disconnect
      setFlightData(null);
      setCurrentFlightNumber("");
      setLastRefresh(null);
    }
  }, [isWalletConnected]);

  const handleSearch = async (flightNumber: string) => {
    if (!isWalletConnected) {
      setPopupTitle("Wallet Connection Required");
      setPopupDescription("Please connect your wallet first to search and track real-time flight data.");
      setShowPopup(true);
      return;
    }

    setLoading(true);
    setCurrentFlightNumber(flightNumber);

    const rawCarrierCode =
      flightNumber.match(/^[A-Za-z]{2,3}/)?.[0] || flightNumber.substring(0, 2);

    const carrierCode = rawCarrierCode?.toUpperCase();
    const flightNum = flightNumber?.replace(/^[A-Z]{2,3}/, "");

    let arrivalCode: string = "";
    let departureCode: string = "";

    let realTimeData: any = null;
    let initialHash: string = "";
    const fetchFlights = async () => {
      const result = await searchFlightData(flightNum, carrierCode);
      if (result?.flightInfo) {
        realTimeData = result.flightInfo;
        arrivalCode = result.flightInfo.arrivalAirport?.code;
        departureCode = result.flightInfo.departureAirport?.code;
        initialHash = result.flightInfo.blockchainHash || "";
      }
    };

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
      await fetchFlights();
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Verify subscription access before showing any data
      try {
        await fetchHistoricalFlightData(
          flightNum, carrierCode, todayStr, todayStr,
          arrivalCode, departureCode, walletAddress || undefined
        );
      } catch (accessError: any) {
        const accessMsg = accessError?.message || "";
        if (accessError?.status === 403 || accessMsg.toLowerCase().includes("not subscribed")) {
          setFlightData(null);
          setPopupTitle("Subscription Required");
          setPopupDescription(accessMsg || "You are not subscribed to this flight. Please subscribe to access its real-time and historical data.");
          setShowPopup(true);
          setLoading(false);
          return;
        }
        // For non-subscription errors, continue with normal flow
      }

      let data: any = null;

      // Use real-time data if it's for today
      if (realTimeData && realTimeData?.departureDate === todayStr) {
        data = { flightDetails: [realTimeData] };
      }

      if (!data) {
        data = await trySearch(todayStr);
      }

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

      if (!data) {
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

        const historicalData = await fetchHistoricalFlightData(
          flightNum,
          carrierCode,
          thirtyStr,
          todayStr,
          arrivalCode,
          departureCode,
          walletAddress || undefined
        );

        if (historicalData?.flightDetails?.length > 0) {
          data = historicalData;
        }
      }

      if (data?.flightDetails?.length > 0) {
        // Always sort to pick the absolute latest record found
        const sortedDetails = [...data.flightDetails].sort((a: any, b: any) => {
          const timeA = new Date(a.times?.scheduledDeparture || a.scheduledDepartureDate || a.departureDate).getTime();
          const timeB = new Date(b.times?.scheduledDeparture || b.scheduledDepartureDate || b.departureDate).getTime();
          return timeB - timeA;
        });

        const flightData = sortedDetails[0];

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
        setPopupTitle("Flight Data Unavailable");
        setPopupDescription("We couldn't find any real-time or historical data for this flight number. Please verify the flight number and try again.");
        setShowPopup(true);
      }
    } catch (error: any) {
      setFlightData(null);
      const apiMessage = error?.message || "";
      const isNotSubscribed = error?.status === 403 || apiMessage.toLowerCase().includes("not subscribed");
      
      if (isNotSubscribed) {
        setPopupTitle("Subscription Required");
        setPopupDescription(apiMessage || "You are not subscribed to this flight. Please subscribe to access its real-time and historical data.");
      } else {
        setPopupTitle("Flight Data Unavailable");
        setPopupDescription(apiMessage || "We couldn't find any real-time or historical data for this flight number. Please verify the flight number and try again.");
      }
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
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-full">
                <Info className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-3 tracking-tight">{popupTitle}</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {popupDescription}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowPopup(false);
                  if (popupTitle === "Wallet Connection Required") {
                    setIsModalDismissed(false);
                  }
                }}
                className="w-full px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                {popupTitle === "Wallet Connection Required" ? "Connect Wallet" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}
      <WalletSelectorModal
        open={!isWalletConnected && !isModalDismissed}
        onClose={() => setIsModalDismissed(true)}
        onWalletSelected={handleWalletConnect}
        isConnecting={isWalletConnecting}
        activeConnecting={activeConnecting}
      />

      <Navbar
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

        {!flightData && !loading && events.length > 0 && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Latest Blockchain Activity</h3>
            </div>
            <div className="grid gap-3">
              {events.slice(0, 3).map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{event.type || "Flight Event"}</div>
                      <div className="text-sm text-muted-foreground">{event.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.flightNumber && (
                      <div className="text-xs font-bold text-primary mt-1 underline cursor-pointer" onClick={() => handleSearch(event.flightNumber)}>
                        Track {event.flightNumber}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
