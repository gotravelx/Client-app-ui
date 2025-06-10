"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionLog } from "@/components/transaction-log";
import { ConnectionStatus } from "@/components/connection-status";
import { CombinedFlightTable } from "@/components/combined-flight-table";

import { CONTRACT_ABI } from "@/lib/contract-abi";
import { CONTRACT_ADDRESS, WS_PROVIDER_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plane, RefreshCcwDotIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchHistoricalFlightData } from "@/utils/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ApiFlightTable } from "./historical-flight-table";
import { FlightSearchHeader } from "./flight-search-header";

// Define the SearchParams type
interface SearchParams {
  flightNumber: string;
  carrierCode: string;
  startDate: Date | null;
  endDate: Date | null;
}

export default function Dashboard() {
  const [provider, setProvider] = useState<ethers.WebSocketProvider | null>(
    null
  );
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [newTxCount, setNewTxCount] = useState(0);
  const [activeTab, setActiveTab] = useState("combined");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentSearchParams, setCurrentSearchParams] =
    useState<SearchParams | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFormat, setTimeFormat] = useState<"utc" | "local">("utc");
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === "transactions") {
      setNewTxCount(0);
    }
  }, [activeTab]);

  useEffect(() => {
    const connectToBlockchain = async () => {
      try {
        const wsProvider = new ethers.WebSocketProvider(WS_PROVIDER_URL);
        setProvider(wsProvider);
        const flightContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          wsProvider
        );
        setContract(flightContract);
        setIsConnected(true);
        flightContract.on("FlightDataSet", (...args) => {
          const event = args[args.length - 1];
          const newEvent = {
            ...event,
            eventName: "FlightDataSet",
            timestamp: new Date().toISOString(),
          };
          console.log("FlightDataSet event received:", newEvent);
          setEvents((prev) => [newEvent, ...prev]);

          toast({
            title: "New Flight Data",
            description: `Flight ${event.args.flightNumber} data has been updated`,
          });
        });

        flightContract.on("FlightStatusUpdate", (...args) => {
          const event = args[args.length - 1];
          const newEvent = {
            ...event,
            eventName: "FlightStatusUpdate",
            timestamp: new Date().toISOString(),
          };
          console.log("FlightStatusUpdate event received:", newEvent);
          setEvents((prev) => [newEvent, ...prev]);

          toast({
            title: "Flight Status Update",
            description: `Flight ${event.args.flightNumber} status updated`,
          });
        });

        flightContract.on("SubscriptionDetails", (...args) => {
          const event = args[args.length - 1];
          const newEvent = {
            ...event,
            eventName: "SubscriptionDetails",
            timestamp: new Date().toISOString(),
          };
          console.log("SubscriptionDetails event received:", newEvent);
          setEvents((prev) => [newEvent, ...prev]);
          toast({
            title: "Subscription Update",
            description: `User ${event.args.user.substring(0, 6)}... ${
              event.args.isSubscribe ? "subscribed to" : "unsubscribed from"
            } flight ${event.args.flightNumber}`,
          });
        });

        wsProvider.on("pending", (tx) => {
          wsProvider.getTransaction(tx).then((transaction) => {
            if (
              transaction &&
              transaction.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
            ) {
              console.log("Transaction detected:", transaction);
              setTransactions((prev) => [
                {
                  ...transaction,
                  timestamp: Math.floor(Date.now() / 1000),
                },
                ...prev,
              ]);

              if (activeTab !== "transactions") {
                setNewTxCount((prev) => prev + 1);
              }

              toast({
                title: "New Transaction",
                description: `Transaction ${transaction.hash.substring(
                  0,
                  10
                )}... detected`,
              });
            }
          });
        });

        console.log("Connected to Camino Network via WebSocket");

        return () => {
          wsProvider.removeAllListeners();
          if (flightContract) {
            flightContract.removeAllListeners();
          }
        };
      } catch (error) {
        console.error("Failed to connect to Camino Network:", error);
        setIsConnected(false);

        toast({
          title: "Connection Error",
          description: "Failed to connect to Camino Network",
          variant: "destructive",
        });
      }
    };

    connectToBlockchain();

    return () => {
      if (provider) {
        provider.removeAllListeners();
      }
      if (contract) {
        contract.removeAllListeners();
      }
    };
  }, [activeTab, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "transactions") {
      setNewTxCount(0);
    }
  };

  const handleSearchResults = (
    results: any[],
    searchParams: SearchParams | null
  ) => {
    setSearchResults(results);
    setCurrentSearchParams(searchParams);

    if (results.length > 0) {
      setIsSearchMode(true);
    } else {
      setIsSearchMode(false);
    }
  };

  const handleClearSearch = () => {
    setIsSearchMode(false);
    setSearchResults([]);
    setCurrentSearchParams(null);
    setApiData(null);
    setApiError(null);
  };

  const handleSearch = async (searchParams: SearchParams) => {
    setIsLoading(true);
    setApiError(null);
    setApiData(null);

    try {
      if (
        searchParams.flightNumber &&
        searchParams.carrierCode &&
        searchParams.startDate &&
        searchParams.endDate
      ) {
        const startDateStr = searchParams.startDate.toISOString().split("T")[0];
        const endDateStr = searchParams.endDate.toISOString().split("T")[0];

        const data = await fetchHistoricalFlightData(
          searchParams.flightNumber,
          searchParams.carrierCode,
          startDateStr,
          endDateStr
        );

        setApiData(data);
        setCurrentSearchParams(searchParams);
        setIsSearchMode(true);

        if (data.flightDetails === "Flight does not exist") {
          setApiError(
            `Flight ${searchParams.flightNumber} with carrier ${searchParams.carrierCode} does not exist in the specified date range.`
          );
        } else {
          toast({
            title: "Flight Data Retrieved",
            description: `Successfully retrieved flight data for ${searchParams.carrierCode} ${searchParams.flightNumber}`,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching flight data:", error);
      setApiError(
        `Failed to fetch flight data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeFormatChange = (format: "utc" | "local") => {
    setTimeFormat(format);
  };

  return (
    <div className="mx-auto px-3 p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <ConnectionStatus isConnected={isConnected} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid max-w-screen-sm grid-cols-3">
            <TabsTrigger value="combined" className="relative">
              <Plane className="mr-2 h-4 w-4" />
              Flight Data
            </TabsTrigger>
            <TabsTrigger value="flight-history" className="relative">
              <RefreshCcwDotIcon className="mr-2 h-4 w-4" />
              Flight History
            </TabsTrigger>
            <TabsTrigger value="transactions" className="relative">
              Transactions
              {newTxCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {newTxCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="combined">
            <CombinedFlightTable
              events={events}
              searchResults={searchResults}
              isSearchMode={isSearchMode}
              currentSearchParams={currentSearchParams}
              onClearSearch={handleClearSearch}
              onSearchResults={handleSearchResults}
            />
          </TabsContent>

          <TabsContent value="flight-history">
            <FlightSearchHeader
              onTimeFormatChange={handleTimeFormatChange}
              timeFormat={timeFormat}
              onSearch={handleSearch}
              onClearSearch={handleClearSearch}
              flightData={searchResults}
              isSearchMode={isSearchMode}
              currentSearchParams={currentSearchParams}
            />

            {apiError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              apiData && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-md font-semibold">
                      Flight Status Timeline: {currentSearchParams?.carrierCode}{" "}
                      {currentSearchParams?.flightNumber}
                    </CardTitle>
                    <CardDescription>
                      Showing all the events for flight{" "}
                      {currentSearchParams?.flightNumber}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ApiFlightTable
                      apiData={apiData}
                      timeFormat={timeFormat}
                      onClearSearch={handleClearSearch}
                      currentSearchParams={currentSearchParams}
                    />
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contract Transactions</CardTitle>
                    <CardDescription>
                      Real-time transactions to the FlightStatusOracle contract
                      on Camino Network
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {transactions.length} transactions
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TransactionLog data={transactions} type="transaction" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
