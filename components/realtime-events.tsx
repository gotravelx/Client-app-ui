"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Wifi, WifiOff, Plane } from "lucide-react"
import { CONTRACT_ADDRESS, WS_PROVIDER_URL } from "@/lib/constants"

interface RealtimeEventsProps {
  events: any[]
  onEventsUpdate: (events: any[]) => void
}

export function RealtimeEvents({ events, onEventsUpdate }: Readonly<RealtimeEventsProps>) {
  const [isConnected, setIsConnected] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)

  const connectToBlockchain = () => {
    if (globalThis.window === undefined) return;

    try {
      const websocket = new WebSocket(WS_PROVIDER_URL)

      websocket.onopen = () => {
        setIsConnected(true)

        // Subscribe to contract events
        const subscribeMessage = {
          jsonrpc: "2.0",
          method: "eth_subscribe",
          params: [
            "logs",
            {
              address: CONTRACT_ADDRESS,
              topics: [],
            },
          ],
          id: 1,
        }

        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify(subscribeMessage))
        }
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.params?.result) {
            const logData = data.params.result
            const newEvent = {
              id: Date.now(),
              blockNumber: logData.blockNumber,
              transactionHash: logData.transactionHash,
              topics: logData.topics,
              data: logData.data,
              timestamp: new Date().toISOString(),
              type: getEventType(logData.topics[0]),
            }

            onEventsUpdate([newEvent, ...events.slice(0, 49)]) // Keep last 50 events
          }
        } catch (error) {
          console.error("Error parsing websocket message:", error)
        }
      }

      websocket.onclose = () => {
        setIsConnected(false)
      }

      websocket.onerror = () => {
        setIsConnected(false)
        // Silent error handler to avoid MetaMask issues
      }

      setWs(websocket)
    } catch (error) {
      console.error("Error connecting to blockchain:", error)
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      setWs(null)
    }
  }

  const getEventType = (topic: string) => {
    // Map topic hashes to event names based on ABI
    const eventTypes: { [key: string]: string } = {
      // These would be the actual keccak256 hashes of the event signatures
      FlightDataSet: "Flight Data Set",
      FlightStatusUpdate: "Flight Status Update",
      SubscriptionDetails: "Subscription Details",
      SubscriptionsRemoved: "Subscriptions Removed",
    }

    return eventTypes[topic] || "Unknown Event"
  }

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [ws])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <span className="font-medium">Blockchain Connection</span>
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>

        {isConnected ? (
          <Button variant="outline" onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button onClick={connectToBlockchain}>Connect to Blockchain</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Events</CardTitle>
          <CardDescription>Real-time flight events from the Camino blockchain</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events yet. Connect to blockchain to start monitoring.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <Card key={event.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-medium">Block:</span> {Number.parseInt(event.blockNumber, 16)}
                      </p>
                      <p>
                        <span className="font-medium">Tx Hash:</span>
                        <span className="font-mono text-xs ml-1">{event.transactionHash.substring(0, 10)}...</span>
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
