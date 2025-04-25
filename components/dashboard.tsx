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
import { Bell, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
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
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === "transactions") {
      setNewTxCount(0);
    }
  }, [activeTab]);

  useEffect(() => {
    const connectToBlockchain = async () => {
      try {
        // Connect to Camino Network WebSocket provider
        const wsProvider = new ethers.WebSocketProvider(WS_PROVIDER_URL);
        setProvider(wsProvider);

        // Create contract instance
        const flightContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          wsProvider
        );
        setContract(flightContract);
        setIsConnected(true);

        // Listen for all events from the contract
        flightContract.on("FlightDataSet", (...args) => {
          const event = args[args.length - 1];
          const newEvent = {
            ...event,
            eventName: "FlightDataSet",
            timestamp: new Date().toISOString(),
          };
          console.log("FlightDataSet event received:", newEvent);
          setEvents((prev) => [newEvent, ...prev]);

          // Show toast notification
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

          // Show toast notification
          toast({
            title: "Flight Status Update",
            description: `Flight ${event.args.flightNumber} status updated`,
          });
        });

        // flightContract.on("UTCTimeSet", (...args) => {
        //   const event = args[args.length - 1];
        //   const newEvent = {
        //     ...event,
        //     eventName: "UTCTimeSet",
        //     timestamp: new Date().toISOString(),
        //   };
        //   console.log("UTCTimeSet event received:", newEvent);
        //   setEvents((prev) => [newEvent, ...prev]);

        //   // Show toast notification
        //   toast({
        //     title: "Flight Time Update",
        //     description: "Flight schedule times have been updated",
        //   });
        // });

        flightContract.on("SubscriptionDetails", (...args) => {
          const event = args[args.length - 1];
          const newEvent = {
            ...event,
            eventName: "SubscriptionDetails",
            timestamp: new Date().toISOString(),
          };
          console.log("SubscriptionDetails event received:", newEvent);
          setEvents((prev) => [newEvent, ...prev]);

          // Show toast notification
          toast({
            title: "Subscription Update",
            description: `User ${event.args.user.substring(0, 6)}... ${
              event.args.isSubscribe ? "subscribed to" : "unsubscribed from"
            } flight ${event.args.flightNumber}`,
          });
        });

        // Listen for transactions to the contract
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

              // Show toast notification
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

        // Show error toast
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

  return (
    <div className="mx-auto px-3 p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <ConnectionStatus isConnected={isConnected} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="combined" className="relative">
              <Plane className="mr-2 h-4 w-4" />
              Flight Data
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
            <CombinedFlightTable events={events} />
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
