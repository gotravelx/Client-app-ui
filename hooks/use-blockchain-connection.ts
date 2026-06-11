"use client"

import { useState, useEffect, useRef } from "react"
import { CONTRACT_ADDRESS, WS_PROVIDER_URL } from "@/lib/constants"

export function useBlockchainConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    connectToBlockchain()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

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

            // Parse event data to extract flight information
            const eventType = getEventType(logData.topics[0])
            const flightInfo = parseEventData(logData.data, logData.topics)

            const newEvent = {
              id: Date.now(),
              blockNumber: logData.blockNumber,
              transactionHash: logData.transactionHash,
              topics: logData.topics,
              data: logData.data,
              timestamp: new Date().toISOString(),
              type: eventType,
              flightNumber: flightInfo.flightNumber,
              carrierCode: flightInfo.carrierCode,
              status: flightInfo.status,
              description: flightInfo.description,
            }

            setEvents((prev) => [newEvent, ...prev.slice(0, 49)])
            setLastUpdate(new Date())
          }
        } catch (error) {
          console.warn("Failed to parse blockchain event log:", error);
        }
      }

      websocket.onclose = () => {
        setIsConnected(false)
        // Attempt silent reconnect after delay
        setTimeout(() => connectToBlockchain(), 5000)
      }

      websocket.onerror = () => {
        setIsConnected(false)
        // Silent error handler to avoid triggering wallet extension popups
      }

      wsRef.current = websocket
    } catch (error) {
      console.warn("Failed to initialize blockchain connection:", error);
    }
  }

  const getEventType = (topic: string) => {
    // Map topic hashes to event names
    const eventTypes: { [key: string]: string } = {
      // Add actual keccak256 hashes here
      "0x123456": "Flight Data Set",
      "0xabcdef": "Flight Status Update",
      "0x789abc": "Subscription Details",
    }
    return eventTypes[topic] || "Flight Event"
  }


  const parseEventData = (data: string, topics: string[]) => {
    // Parse the event data based on the ABI structure
    // This is a simplified version - you'd need to properly decode the hex data
    return {
      flightNumber: "Unknown", // Extract from decoded data
      carrierCode: "Unknown", // Extract from decoded data
      status: "Updated", // Extract from decoded data
      description: "Flight status updated via blockchain",
    }
  }

  return { isConnected, lastUpdate, events }
}
