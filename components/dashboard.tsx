"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionLog } from "@/components/transaction-log"
import { ConnectionStatus } from "@/components/connection-status"
import { CONTRACT_ABI } from "@/lib/contract-abi"
import { CONTRACT_ADDRESS, WS_PROVIDER_URL } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function Dashboard() {
  const [provider, setProvider] = useState<ethers.WebSocketProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [newEventsCount, setNewEventsCount] = useState(0)
  const [newTxCount, setNewTxCount] = useState(0)
  const [activeTab, setActiveTab] = useState("events")
  const { toast } = useToast()

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedEvents = localStorage.getItem("goTravelX_events")
    const savedTransactions = localStorage.getItem("goTravelX_transactions")

    if (savedEvents) {
      try {
        setEvents(JSON.parse(savedEvents))
      } catch (e) {
        console.error("Failed to parse saved events", e)
      }
    }

    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions))
      } catch (e) {
        console.error("Failed to parse saved transactions", e)
      }
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem("goTravelX_events", JSON.stringify(events))
    }
  }, [events])

  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem("goTravelX_transactions", JSON.stringify(transactions))
    }
  }, [transactions])

  // Reset notification counters when tab changes
  useEffect(() => {
    if (activeTab === "events") {
      setNewEventsCount(0)
    } else if (activeTab === "transactions") {
      setNewTxCount(0)
    }
  }, [activeTab])

  useEffect(() => {
    const connectToBlockchain = async () => {
      try {
        // Connect to Camino Network WebSocket provider
        const wsProvider = new ethers.WebSocketProvider(WS_PROVIDER_URL)
        setProvider(wsProvider)

        // Create contract instance
        const flightContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wsProvider)
        setContract(flightContract)
        setIsConnected(true)

        // Listen for all events from the contract
        flightContract.on("FlightDataSet", (...args) => {
          const event = args[args.length - 1]
          const newEvent = { ...event, eventName: "FlightDataSet", timestamp: new Date().toISOString() }
          setEvents((prev) => [newEvent, ...prev])

          if (activeTab !== "events") {
            setNewEventsCount((prev) => prev + 1)
          }

          // Show toast notification
          toast({
            title: "New Flight Data",
            description: `Flight ${event.args.flightNumber} data has been updated`,
          })
        })

        flightContract.on("currentFlightStatus", (...args) => {
          const event = args[args.length - 1]
          const newEvent = { ...event, eventName: "currentFlightStatus", timestamp: new Date().toISOString() }
          setEvents((prev) => [newEvent, ...prev])

          if (activeTab !== "events") {
            setNewEventsCount((prev) => prev + 1)
          }

          // Show toast notification
          toast({
            title: "Flight Status Update",
            description: `Flight ${event.args.flightNumber} status: ${event.args.FlightStatus}`,
          })
        })

        flightContract.on("UTCTimeSet", (...args) => {
          const event = args[args.length - 1]
          const newEvent = { ...event, eventName: "UTCTimeSet", timestamp: new Date().toISOString() }
          setEvents((prev) => [newEvent, ...prev])

          if (activeTab !== "events") {
            setNewEventsCount((prev) => prev + 1)
          }

          // Show toast notification
          toast({
            title: "Flight Time Update",
            description: "Flight schedule times have been updated",
          })
        })

        flightContract.on("SubscriptionDetails", (...args) => {
          const event = args[args.length - 1]
          const newEvent = { ...event, eventName: "SubscriptionDetails", timestamp: new Date().toISOString() }
          setEvents((prev) => [newEvent, ...prev])

          if (activeTab !== "events") {
            setNewEventsCount((prev) => prev + 1)
          }

          // Show toast notification
          toast({
            title: "Subscription Update",
            description: `User ${event.args.user.substring(0, 6)}... ${event.args.isSubscribe ? "subscribed to" : "unsubscribed from"} flight ${event.args.flightNumber}`,
          })
        })

        // Listen for transactions to the contract
        wsProvider.on("pending", (tx) => {
          wsProvider.getTransaction(tx).then((transaction) => {
            if (transaction && transaction.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
              setTransactions((prev) => [transaction, ...prev])

              if (activeTab !== "transactions") {
                setNewTxCount((prev) => prev + 1)
              }

              // Show toast notification
              toast({
                title: "New Transaction",
                description: `Transaction ${transaction.hash.substring(0, 10)}... detected`,
              })
            }
          })
        })

        console.log("Connected to Camino Network via WebSocket")

        return () => {
          wsProvider.removeAllListeners()
          if (flightContract) {
            flightContract.removeAllListeners()
          }
        }
      } catch (error) {
        console.error("Failed to connect to Camino Network:", error)
        setIsConnected(false)

        // Show error toast
        toast({
          title: "Connection Error",
          description: "Failed to connect to Camino Network",
          variant: "destructive",
        })
      }
    }

    connectToBlockchain()

    return () => {
      if (provider) {
        provider.removeAllListeners()
      }
      if (contract) {
        contract.removeAllListeners()
      }
    }
  }, [activeTab, toast])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "events") {
      setNewEventsCount(0)
    } else if (value === "transactions") {
      setNewTxCount(0)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <ConnectionStatus isConnected={isConnected} />
          <div className="text-sm text-muted-foreground">Monitoring flight status events in real-time</div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events" className="relative">
              Events
              {newEventsCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {newEventsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="relative">
              Transactions
              {newTxCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {newTxCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Flight Status Events</CardTitle>
                    <CardDescription>
                      Real-time events from the FlightStatusOracle contract on Camino Network
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{events.length} events</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TransactionLog data={events} type="event" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contract Transactions</CardTitle>
                    <CardDescription>
                      Real-time transactions to the FlightStatusOracle contract on Camino Network
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{transactions.length} transactions</span>
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
  )
}
