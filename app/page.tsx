"use client";

import { useState, useEffect } from "react";
import { FlightCard } from "@/components/flight-card";
import { SearchBar } from "@/components/search-bar";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-provider";
import { decryptFlightData, fetchHistoricalFlightData, searchFlightData } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Info } from "lucide-react";
import { WalletSelectorModal } from "@/components/wallet-selector-modal";

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

    let initialHash: string = "";
    const fetchFlights = async () => {
      const result = await searchFlightData(flightNum, carrierCode);
      if (result?.flightInfo) {
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
        setPopupTitle("Flight Data Unavailable");
        setPopupDescription("We couldn't find any real-time or historical data for this flight number. Please verify the flight number and try again.");
        setShowPopup(true);
      }
    } catch (error: any) {
      setFlightData(null);
      if (error?.status === 403) {
        setPopupTitle("Access Denied");
        setPopupDescription("You are not subscribed to this flight. Please subscribe to access its real-time and historical data.");
      } else {
        setPopupTitle("Flight Data Unavailable");
        setPopupDescription("We couldn't find any real-time or historical data for this flight number. Please verify the flight number and try again.");
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
              events={[]}
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
