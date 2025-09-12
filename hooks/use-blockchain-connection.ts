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
    try {
      const websocket = new WebSocket(WS_PROVIDER_URL)

      websocket.onopen = () => {
        setIsConnected(true)
        console.log("Connected to Camino blockchain")

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

        websocket.send(JSON.stringify(subscribeMessage))
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.params && data.params.result) {
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
        }
      }

      websocket.onclose = () => {
        setIsConnected(false)
        console.log("Disconnected from blockchain")
        // Attempt to reconnect after 5 seconds
        setTimeout(connectToBlockchain, 5000)
      }

      websocket.onerror = (error) => {
        setIsConnected(false)
      }

      wsRef.current = websocket
    } catch (error) {
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

  const extractFlightNumber = (data: string) => {
    // Extract flight number from event data
    // This would need to be implemented based on the actual event data structure
    return "Unknown"
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
