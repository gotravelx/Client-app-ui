"use client"

import { useState, useEffect, useCallback, createContext } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Lock, Unlock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

interface CombinedFlightTableProps {
  events: Array<{ [key: string]: any }>
  searchResults?: any[]
  isSearchMode?: boolean
  currentSearchParams?: SearchParams | null
  onClearSearch?: () => void
  onSearchResults?: (results: any[], searchParams: SearchParams | null) => void
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL

type FlightData = {
  eventId: string // Unique identifier for each event
  timestamp: string // Event timestamp
  flightNumber: string
  carrierCode: string
  scheduledDepartureDate: string
  departureCity: string
  arrivalCity: string
  departureAirport: string
  arrivalAirport: string
  departureGate: string
  arrivalGate: string
  operatingAirlineCode: string
  equipmentModel: string
  flightStatus: string
  flightStatusCode: string
  currentFlightStatusTime: string
  DepartureState: string
  ArrivalState: string
  bagClaim: string
  // UTC times
  scheduledDepartureUTC: string
  scheduledArrivalUTC: string
  estimatedDepartureUTC: string
  estimatedArrivalUTC: string
  actualDepartureUTC: string
  actualArrivalUTC: string
  departureDelayMinutes: string
  arrivalDelayMinutes: string
  // Flight timeline
  outUtc: string
  offUtc: string
  onUtc: string
  inUtc: string
  // Raw event for reference
  events: any[]
  // Encrypted data tracking
  encryptedData: Record<string, string[]>
  decryptedData: Record<string, string[]>
  isDecrypting: boolean
  // Source of the data (blockchain or API)
  source: "blockchain" | "api"
}

// Define the SearchParams type
interface SearchParams {
  carrierCode?: string
  flightNumber?: string
  startDate?: Date
  endDate?: Date
}

// Helper function to check if a string might be encrypted
const isLikelyEncrypted = (str: string): boolean => {
  if (!str) return false

  // Check for common encryption patterns (hex:base64)
  const encryptionPattern = /^[a-f0-9]{32}:[A-Za-z0-9+/=]+$/
  const encryptionPatternExtended = /^[a-f0-9]{32}:[A-Za-z0-9+/=]{10,}$/

  return encryptionPattern.test(str) || encryptionPatternExtended.test(str)
}

// Function to get color for flight status
const getFlightStatusColor = (status: string): string => {
  if (!status) return "bg-gray-200 text-gray-700"

  const statusLower = status.toLowerCase()

  if (statusLower.includes("not departed") || statusLower === "ndpt") return "bg-blue-100 text-blue-800"
  if (statusLower.includes("departed") || statusLower === "out") return "bg-indigo-100 text-indigo-800"
  if (statusLower.includes("in flight") || statusLower === "off") return "bg-purple-100 text-purple-800"
  if (statusLower.includes("landed") || statusLower === "on") return "bg-amber-100 text-amber-800"
  if (statusLower.includes("arrived") || statusLower === "in") return "bg-green-100 text-green-800"
  if (statusLower.includes("cancel")) return "bg-red-100 text-red-800"
  if (statusLower.includes("delay")) return "bg-orange-100 text-orange-800"
  if (statusLower.includes("early")) return "bg-green-100 text-green-800"
  if (statusLower.includes("on time")) return "bg-green-100 text-green-800"
  if (statusLower.includes("pending")) return "bg-yellow-100 text-yellow-800"
  if (statusLower.includes("rerouted")) return "bg-purple-100 text-purple-800"
  if (statusLower.includes("extra stop")) return "bg-blue-100 text-blue-800"
  if (statusLower.includes("unavailable")) return "bg-gray-100 text-gray-800"

  return "bg-gray-100 text-gray-800"
}

// Function to get color for departure state
const getDepartureStateColor = (state: string): string => {
  if (!state) return "bg-gray-200 text-gray-700"

  const stateLower = state.toLowerCase()

  if (stateLower.includes("delayed") || stateLower === "dly") return "bg-orange-100 text-orange-800"
  if (stateLower.includes("cancelled") || stateLower === "cnl") return "bg-red-100 text-red-800"
  if (stateLower.includes("pending") || stateLower === "pnd") return "bg-yellow-100 text-yellow-800"
  if (stateLower.includes("rerouted") || stateLower === "div") return "bg-purple-100 text-purple-800"
  if (stateLower.includes("extra stop") || stateLower === "xsp") return "bg-blue-100 text-blue-800"
  if (stateLower.includes("cancelled") || stateLower === "nsp") return "bg-red-100 text-red-800"
  if (stateLower.includes("unavailable") || stateLower === "lck") return "bg-gray-100 text-gray-800"
  if (stateLower.includes("on time") || stateLower === "ont") return "bg-green-100 text-green-800"

  return "bg-gray-100 text-gray-800"
}

// Function to get color for arrival state
const getArrivalStateColor = (state: string): string => {
  if (!state) return "bg-gray-200 text-gray-700"

  const stateLower = state.toLowerCase()

  if (stateLower.includes("early") || stateLower === "erl") return "bg-green-100 text-green-800"
  if (stateLower.includes("delayed") || stateLower === "dly") return "bg-orange-100 text-orange-800"
  if (stateLower.includes("cancelled") || stateLower === "cnl") return "bg-red-100 text-red-800"
  if (stateLower.includes("pending") || stateLower === "pnd") return "bg-yellow-100 text-yellow-800"
  if (stateLower.includes("rerouted") || stateLower === "dvt") return "bg-purple-100 text-purple-800"
  if (stateLower.includes("extra stop") || stateLower === "xst") return "bg-blue-100 text-blue-800"
  if (stateLower.includes("cancelled") || stateLower === "nst") return "bg-red-100 text-red-800"
  if (stateLower.includes("unavailable") || stateLower === "lck") return "bg-gray-100 text-gray-800"
  if (stateLower.includes("on time") || stateLower === "ont") return "bg-green-100 text-green-800"

  return "bg-gray-100 text-gray-800"
}

// Update the mapStatusCodeToText function to ensure consistent capitalization
const mapStatusCodeToText = (code: string): string => {
  const statusMap: Record<string, string> = {
    NDPT: "Not Departed",
    OUT: "Departed",
    OFF: "In Flight",
    ON: "Landed",
    IN: "Arrived At Gate",
  }

  // If we have a mapping, use it with proper capitalization
  if (statusMap[code]) {
    return statusMap[code]
  }

  // For other values, ensure consistent capitalization
  if (typeof code === "string") {
    // Convert to title case (first letter of each word capitalized)
    return code.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())
  }

  return code || ""
}

// Map departure state codes to display text
const mapDepartureStateCodeToText = (code: string): string => {
  const stateMap: Record<string, string> = {
    DLY: "Delayed",
    CNL: "Cancelled",
    PND: "Pending",
    DIV: "Rerouted",
    XSP: "Extra Stop",
    NSP: "Cancelled",
    LCK: "Unavailable",
    ONT: "On Time",
  }

  // If we have a mapping, use it
  if (stateMap[code]) {
    return stateMap[code]
  }

  // For other values, return as is
  return code || ""
}

// Map arrival state codes to display text
const mapArrivalStateCodeToText = (code: string): string => {
  const stateMap: Record<string, string> = {
    ERL: "Early",
    DLY: "Delayed",
    CNL: "Cancelled",
    PND: "Pending",
    DVT: "Rerouted",
    XST: "Extra Stop",
    NST: "Cancelled",
    LCK: "Unavailable",
    ONT: "On Time",
  }

  // If we have a mapping, use it
  if (stateMap[code]) {
    return stateMap[code]
  }

  // For other values, return as is
  return code || ""
}

// Function to determine departure state based on flight data
const determineDepartureState = (flight: FlightData): string => {
  // If we already have a departure state from the API or blockchain, use it
  if (shouldShowCell(flight.DepartureState)) {
    return flight.DepartureState
  }

  // Parse timestamps
  const scheduledDeparture = flight.scheduledDepartureUTC ? new Date(flight.scheduledDepartureUTC) : null
  const estimatedDeparture = flight.estimatedDepartureUTC ? new Date(flight.estimatedDepartureUTC) : null
  const actualDeparture = flight.actualDepartureUTC ? new Date(flight.actualDepartureUTC) : null

  // Check if flight is cancelled
  if (flight.flightStatus && flight.flightStatus.toLowerCase().includes("cancel")) {
    return "CNL"
  }

  // Check for delay (EDT >= STD + X min)
  // For simplicity, we'll use X = 15 minutes
  if (estimatedDeparture && scheduledDeparture) {
    const delayThresholdMinutes = 15
    const delayMs = estimatedDeparture.getTime() - scheduledDeparture.getTime()
    const delayMinutes = delayMs / (1000 * 60)

    if (delayMinutes >= delayThresholdMinutes) {
      return "DLY"
    }
  }

  // Check if actual departure time > scheduled departure time
  if (actualDeparture && scheduledDeparture && actualDeparture > scheduledDeparture) {
    return "DLY"
  }

  // Default to "On Time"
  return "ONT"
}

// Function to determine arrival state based on flight data
const determineArrivalState = (flight: FlightData): string => {
  // If we already have an arrival state from the API or blockchain, use it
  if (shouldShowCell(flight.ArrivalState)) {
    return flight.ArrivalState
  }

  // Parse timestamps
  const scheduledArrival = flight.scheduledArrivalUTC ? new Date(flight.scheduledArrivalUTC) : null
  const estimatedArrival = flight.estimatedArrivalUTC ? new Date(flight.estimatedArrivalUTC) : null
  const actualArrival = flight.actualArrivalUTC ? new Date(flight.actualArrivalUTC) : null

  // Check if flight is cancelled
  if (flight.flightStatus && flight.flightStatus.toLowerCase().includes("cancel")) {
    return "CNL"
  }

  // Check for early arrival (STA >= ETA + X min)
  // For simplicity, we'll use X = 5 minutes
  if (estimatedArrival && scheduledArrival) {
    const earlyThresholdMinutes = 5
    const diffMs = scheduledArrival.getTime() - estimatedArrival.getTime()
    const diffMinutes = diffMs / (1000 * 60)

    if (diffMinutes >= earlyThresholdMinutes) {
      return "ERL"
    }
  }

  // Check if actual arrival time < scheduled arrival time
  if (actualArrival && scheduledArrival && actualArrival < scheduledArrival) {
    return "ERL"
  }

  // Check for delay (ETA >= STA + X min)
  // For simplicity, we'll use X = 15 minutes
  if (estimatedArrival && scheduledArrival) {
    const delayThresholdMinutes = 15
    const delayMs = estimatedArrival.getTime() - scheduledArrival.getTime()
    const delayMinutes = delayMs / (1000 * 60)

    if (delayMinutes >= delayThresholdMinutes) {
      return "DLY"
    }
  }

  // Check if actual arrival time > scheduled arrival time
  if (actualArrival && scheduledArrival && actualArrival > scheduledArrival) {
    return "DLY"
  }

  // Default to "On Time"
  return "ONT"
}

// Add a function to determine if a cell should be visible
const shouldShowCell = (value: any): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === "string" && (value.trim() === "" || value === "TBD" || value === "N/A" || value === "-"))
    return false
  return true
}

// Create a React Context for decryption state
// Create a context for decryption state
const DecryptionContext = createContext<{
  isDecrypting: boolean
  decryptedMap: Record<string, string>
  pendingDecryption: string[]
  timeFormat: "utc" | "local"
}>({
  isDecrypting: false,
  decryptedMap: {},
  pendingDecryption: [],
  timeFormat: "utc",
})

// Add a skeleton loader component for cells
const CellSkeleton = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="h-4 bg-muted rounded w-16"></div>
  </div>
)

// Update the formatDateTime function to show AM/PM for local time
const formatDateTime = (timestamp: string, format: "utc" | "local"): string => {
  if (!timestamp || timestamp === "TBD" || timestamp === "N/A") return timestamp

  try {
    const date = new Date(timestamp)

    if (format === "utc") {
      // Replace UTC with Z in the timestamp
      return date
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "Z")
    } else {
      // Local time format with AM/PM
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // This ensures AM/PM format
      })
    }
  } catch (e) {
    return timestamp
  }
}

// Determine flight status based on UTC timestamps
const determineFlightStatus = (flight: FlightData): string => {
  // If we already have a status from the blockchain, use it
  if (shouldShowCell(flight.flightStatus)) {
    return flight.flightStatus
  }

  // Otherwise, determine status based on UTC timestamps
  if (shouldShowCell(flight.inUtc)) {
    return "Arrived At Gate"
  } else if (shouldShowCell(flight.onUtc)) {
    return "Landed"
  } else if (shouldShowCell(flight.offUtc)) {
    return "In Flight"
  } else if (shouldShowCell(flight.outUtc)) {
    return "Departed"
  } else {
    return "Not Departed"
  }
}

// Determine flight status code based on UTC timestamps
const determineFlightStatusCode = (flight: FlightData): string => {
  // If we already have a status code from the blockchain, use it
  if (shouldShowCell(flight.flightStatus)) {
    return flight.flightStatus
  }

  console.log(flight)

  // Otherwise, determine status code based on UTC timestamps
  if (shouldShowCell(flight.inUtc)) {
    return "IN"
  } else if (shouldShowCell(flight.onUtc)) {
    return "ON"
  } else if (shouldShowCell(flight.offUtc)) {
    return "OFF"
  } else if (shouldShowCell(flight.outUtc)) {
    return "OUT"
  } else {
    return "NDPT"
  }
}

export function CombinedFlightTable({
  events,
  searchResults = [],
  isSearchMode = false,
  currentSearchParams = null,
  onClearSearch,
  onSearchResults,
}: CombinedFlightTableProps) {
  const [flightEvents, setFlightEvents] = useState<FlightData[]>([])
  const [filteredEvents, setFilteredEvents] = useState<FlightData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFormat, setTimeFormat] = useState<"utc" | "local">("utc")
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({})
  const [pendingDecryption, setPendingDecryption] = useState<string[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const processEvents = useCallback(() => {
    const flightEventMap = new Map<string, FlightData>()

    events.forEach((event) => {
      if (!event.args || !event.args.flightNumber || !event.args.carrierCode) return

      const timestamp = event.timestamp || new Date().toISOString()
      const flightNumber = event.args.flightNumber
      const carrierCode = event.args.carrierCode

      // Create a key combining these elements
      const flightKey = `${timestamp.split(".")[0]}-${flightNumber}-${carrierCode}`

      // Get existing flight data or create new
      const existingFlight = flightEventMap.get(flightKey)

      // Initialize flight data
      const flightData: FlightData = existingFlight || {
        eventId: flightKey,
        timestamp: timestamp,
        flightNumber: flightNumber,
        carrierCode: carrierCode,
        scheduledDepartureDate: event.args.scheduledDepartureDate || "",
        departureCity: event.args.departureCity || "",
        arrivalCity: event.args.arrivalCity || "",
        departureAirport: event.args.departureAirport || "",
        arrivalAirport: event.args.arrivalAirport || "",
        departureGate: event.args.departureGate || "",
        arrivalGate: event.args.arrivalGate || "",
        operatingAirlineCode: event.args.operatingAirlineCode || "",
        equipmentModel: event.args.equipmentModel || "",
        flightStatus: event.args.CurrentFlightStatus || event.args.FlightStatus || "",
        flightStatusCode: event.args.FlightStatusCode || "",
        currentFlightStatusTime: event.args.currentFlightStatusTime || "",
        DepartureState: event.args.DepartureState || "",
        ArrivalState: event.args.ArrivalState || "",
        bagClaim: event.args.bagClaim || "",
        scheduledDepartureUTC: "",
        scheduledArrivalUTC: "",
        estimatedDepartureUTC: "",
        estimatedArrivalUTC: "",
        actualDepartureUTC: "",
        actualArrivalUTC: "",
        departureDelayMinutes: event.args.departureDelayMinutes || "",
        arrivalDelayMinutes: event.args.arrivalDelayMinutes || "",
        outUtc: event.args.outUtc || "",
        offUtc: event.args.offUtc || "",
        onUtc: event.args.onUtc || "",
        inUtc: event.args.inUtc || "",
        events: [],
        encryptedData: {},
        decryptedData: {},
        isDecrypting: false,
        source: "blockchain",
      }

      // Merge data if we already have an entry
      if (existingFlight) {
        // Only update fields that are empty in the existing entry but have data in the new event
        if (!existingFlight.departureCity && event.args.departureCity)
          flightData.departureCity = event.args.departureCity

        if (!existingFlight.arrivalCity && event.args.arrivalCity) flightData.arrivalCity = event.args.arrivalCity

        if (!existingFlight.departureAirport && event.args.departureAirport)
          flightData.departureAirport = event.args.departureAirport

        if (!existingFlight.arrivalAirport && event.args.arrivalAirport)
          flightData.arrivalAirport = event.args.arrivalAirport

        if (!existingFlight.flightStatus && (event.args.CurrentFlightStatus || event.args.FlightStatus))
          flightData.flightStatus = event.args.CurrentFlightStatus || event.args.FlightStatus

        if (!existingFlight.flightStatusCode && event.args.FlightStatusCode)
          flightData.flightStatusCode = event.args.FlightStatusCode
      }

      // Process UTC times if available
      if (event.args.utcTimes) {
        if (!flightData.scheduledDepartureUTC && event.args.utcTimes.scheduledDepartureUTC)
          flightData.scheduledDepartureUTC = event.args.utcTimes.scheduledDepartureUTC

        if (!flightData.scheduledArrivalUTC && event.args.utcTimes.scheduledArrivalUTC)
          flightData.scheduledArrivalUTC = event.args.utcTimes.scheduledArrivalUTC

        if (!flightData.estimatedDepartureUTC && event.args.utcTimes.estimatedDepartureUTC)
          flightData.estimatedDepartureUTC = event.args.utcTimes.scheduledDepartureUTC

        if (!flightData.estimatedArrivalUTC && event.args.utcTimes.estimatedArrivalUTC)
          flightData.estimatedArrivalUTC = event.args.utcTimes.scheduledArrivalUTC

        if (!flightData.actualDepartureUTC && event.args.utcTimes.actualDepartureUTC)
          flightData.actualDepartureUTC = event.args.utcTimes.scheduledDepartureUTC

        if (!flightData.actualArrivalUTC && event.args.utcTimes.actualArrivalUTC)
          flightData.actualArrivalUTC = event.args.utcTimes.scheduledArrivalUTC
      }

      // Direct UTC time assignments
      if (!flightData.scheduledDepartureUTC && event.args.scheduledDepartureUTC)
        flightData.scheduledDepartureUTC = event.args.scheduledDepartureUTC

      if (!flightData.scheduledArrivalUTC && event.args.scheduledArrivalUTC)
        flightData.scheduledArrivalUTC = event.args.scheduledArrivalUTC

      if (!flightData.estimatedDepartureUTC && event.args.estimatedDepartureUTC)
        flightData.estimatedDepartureUTC = event.args.estimatedDepartureUTC

      if (!flightData.estimatedArrivalUTC && event.args.estimatedArrivalUTC)
        flightData.estimatedArrivalUTC = event.args.estimatedArrivalUTC

      if (!flightData.actualDepartureUTC && event.args.actualDepartureUTC)
        flightData.actualDepartureUTC = event.args.actualDepartureUTC

      if (!flightData.actualArrivalUTC && event.args.actualArrivalUTC)
        flightData.actualArrivalUTC = event.args.actualArrivalUTC

      // Extract baggage claim from the correct location in the event data
      if (!flightData.bagClaim) {
        // Try to get from direct args
        if (event.args.baggageClaim) {
          flightData.bagClaim = event.args.baggageClaim
        }
        // Try to get from utcTimes structure
        else if (event.args.utcTimes && event.args.utcTimes.baggageClaim) {
          flightData.bagClaim = event.args.utcTimes.baggageClaim
        }
      }

      // Extract arrival status from the correct location in the event data
      if (!flightData.ArrivalState) {
        // Try to get from direct args
        if (event.args.ArrivalState) {
          flightData.ArrivalState = event.args.ArrivalState
        }
        // Try to get from status structure
        else if (event.args.status && event.args.status.ArrivalState) {
          flightData.ArrivalState = event.args.status.ArrivalState
        }
      }

      // Extract departure status from the correct location in the event data
      if (!flightData.DepartureState) {
        // Try to get from direct args
        if (event.args.DepartureState) {
          flightData.DepartureState = event.args.DepartureState
        }
        // Try to get from status structure
        else if (event.args.status && event.args.status.DepartureState) {
          flightData.DepartureState = event.args.status.DepartureState
        }
      }

      // Extract UTC timeline data
      if (!flightData.outUtc && event.args.outUtc) {
        flightData.outUtc = event.args.outUtc
      } else if (event.args.status && event.args.status.outUtc) {
        flightData.outUtc = event.args.status.outUtc
      }

      if (!flightData.offUtc && event.args.offUtc) {
        flightData.offUtc = event.args.offUtc
      } else if (event.args.status && event.args.status.offUtc) {
        flightData.offUtc = event.args.status.offUtc
      }

      if (!flightData.onUtc && event.args.onUtc) {
        flightData.onUtc = event.args.onUtc
      } else if (event.args.status && event.args.status.onUtc) {
        flightData.onUtc = event.args.status.onUtc
      }

      if (!flightData.inUtc && event.args.inUtc) {
        flightData.inUtc = event.args.inUtc
      } else if (event.args.status && event.args.status.inUtc) {
        flightData.inUtc = event.args.status.inUtc
      }

      // Check for encrypted data in this event
      if (event.args) {
        Object.entries(event.args).forEach(([key, value]) => {
          if (typeof value === "string" && isLikelyEncrypted(value)) {
            if (!flightData.encryptedData[key]) {
              flightData.encryptedData[key] = []
            }
            if (!flightData.encryptedData[key].includes(value as string)) {
              flightData.encryptedData[key].push(value as string)
            }
          }
        })

        // Check for encrypted data in nested objects
        if (event.args.utcTimes) {
          Object.entries(event.args.utcTimes).forEach(([key, value]) => {
            if (typeof value === "string" && isLikelyEncrypted(value as string)) {
              const fullKey = `utcTimes.${key}`
              if (!flightData.encryptedData[fullKey]) {
                flightData.encryptedData[fullKey] = []
              }
              if (!flightData.encryptedData[fullKey].includes(value as string)) {
                flightData.encryptedData[fullKey].push(value as string)
              }
            }
          })
        }

        if (event.args.status) {
          Object.entries(event.args.status).forEach(([key, value]) => {
            if (typeof value === "string" && isLikelyEncrypted(value as string)) {
              const fullKey = `status.${key}`
              if (!flightData.encryptedData[fullKey]) {
                flightData.encryptedData[fullKey] = []
              }
              if (!flightData.encryptedData[fullKey].includes(value as string)) {
                flightData.encryptedData[fullKey].push(value as string)
              }
            }
          })
        }
      }

      // Add this event to the flight's events array
      flightData.events.push(event)

      // Store the updated flight data
      flightEventMap.set(flightKey, flightData)
    })

    // Convert map to array and sort by timestamp (newest first)
    const sortedData = Array.from(flightEventMap.values()).sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return sortedData
  }, [events])

  // Apply decrypted data to flights
  const getDecryptedFlights = useCallback(
    (flights: FlightData[]) => {
      if (Object.keys(decryptedMap).length === 0) return flights

      return flights.map((flight) => {
        const updatedFlight = { ...flight }
        const updatedDecryptedData = { ...flight.decryptedData }
        let wasDecrypted = false

        // Check all fields for encrypted data and update them
        Object.keys(updatedFlight).forEach((field) => {
          // Skip non-string fields or special fields
          if (
            field === "events" ||
            field === "encryptedData" ||
            field === "decryptedData" ||
            field === "isDecrypting" ||
            field === "eventId" ||
            field === "source"
          )
            return

          const value = updatedFlight[field as keyof FlightData]
          if (typeof value === "string" && isLikelyEncrypted(value)) {
            const decrypted = decryptedMap[value]
            if (decrypted) {
              // Update the field with decrypted value
              ;(updatedFlight as any)[field] = decrypted

              // Also store in decrypted data map
              if (!updatedDecryptedData[field]) {
                updatedDecryptedData[field] = []
              }
              updatedDecryptedData[field][0] = decrypted
              wasDecrypted = true
            }
          }
        })

        // Also process any encrypted values in the encryptedData map
        Object.entries(flight.encryptedData).forEach(([field, encryptedValues]) => {
          if (!updatedDecryptedData[field]) {
            updatedDecryptedData[field] = []
          }

          encryptedValues.forEach((encrypted, idx) => {
            const decrypted = decryptedMap[encrypted]
            if (decrypted) {
              updatedDecryptedData[field][idx] = decrypted
              wasDecrypted = true

              // Handle nested fields like utcTimes.baggageClaim
              if (field.includes(".")) {
                const [parentField, childField] = field.split(".")
                if (parentField === "utcTimes" && childField === "baggageClaim") {
                  updatedFlight.bagClaim = decrypted
                  if (!updatedDecryptedData["bagClaim"]) {
                    updatedDecryptedData["bagClaim"] = []
                  }
                  updatedDecryptedData["bagClaim"][0] = decrypted
                } else if (parentField === "status") {
                  if (childField === "ArrivalState") {
                    updatedFlight.ArrivalState = decrypted
                    if (!updatedDecryptedData["ArrivalState"]) {
                      updatedDecryptedData["ArrivalState"] = []
                    }
                    updatedDecryptedData["ArrivalState"][0] = decrypted
                  } else if (childField === "DepartureState") {
                    updatedFlight.DepartureState = decrypted
                    if (!updatedDecryptedData["DepartureState"]) {
                      updatedDecryptedData["DepartureState"] = []
                    }
                    updatedDecryptedData["DepartureState"][0] = decrypted
                  } else if (childField === "outUtc") {
                    updatedFlight.outUtc = decrypted
                    if (!updatedDecryptedData["outUtc"]) {
                      updatedDecryptedData["outUtc"] = []
                    }
                    updatedDecryptedData["outUtc"][0] = decrypted
                  } else if (childField === "offUtc") {
                    updatedFlight.offUtc = decrypted
                    if (!updatedDecryptedData["offUtc"]) {
                      updatedDecryptedData["offUtc"] = []
                    }
                    updatedDecryptedData["offUtc"][0] = decrypted
                  } else if (childField === "onUtc") {
                    updatedFlight.onUtc = decrypted
                    if (!updatedDecryptedData["onUtc"]) {
                      updatedDecryptedData["onUtc"] = []
                    }
                    updatedDecryptedData["onUtc"][0] = decrypted
                  } else if (childField === "inUtc") {
                    updatedFlight.inUtc = decrypted
                    if (!updatedDecryptedData["inUtc"]) {
                      updatedDecryptedData["inUtc"] = []
                    }
                    updatedDecryptedData["inUtc"][0] = decrypted
                  }
                }
              }
            }
          })
        })

        if (wasDecrypted) {
          updatedFlight.decryptedData = updatedDecryptedData
        }

        // Calculate departure and arrival states based on the rules
        if (!updatedFlight.DepartureState || updatedFlight.DepartureState === "") {
          updatedFlight.DepartureState = determineDepartureState(updatedFlight)
        }

        if (!updatedFlight.ArrivalState || updatedFlight.ArrivalState === "") {
          updatedFlight.ArrivalState = determineArrivalState(updatedFlight)
        }

        return { ...updatedFlight, isDecrypting: false }
      })
    },
    [decryptedMap],
  )

  // Process events when they change
  useEffect(() => {
    const processedEvents = processEvents()
    const decryptedProcessedEvents = getDecryptedFlights(processedEvents)
    setFlightEvents(decryptedProcessedEvents)
    setFilteredEvents(decryptedProcessedEvents)
  }, [events, processEvents, getDecryptedFlights])

  // Function to fetch historical flight data from API
  const fetchHistoricalFlightData = async (
    flightNumber: string,
    carrierCode: string,
    startDate: string,
    endDate: string,
  ) => {
    setIsLoading(true)
    setApiError(null)

    try {
      const response = await fetch(
        `${baseUrl}/v1/flights/fetch-historical/${flightNumber}/date-range?fromDate=${startDate}&toDate=${endDate}&carrierCode=${carrierCode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("API Response:", data)

      const apiFlightData: FlightData[] = data.flightDetails.map((flightDetail: any, index: number) => {
        const timestamp = new Date()
        timestamp.setHours(timestamp.getHours() - index)
        const flightId = `api-${flightDetail.flightNumber}-${flightDetail.scheduledDepartureDate}-${index}`

        const flightData: FlightData = {
          eventId: flightId,
          timestamp: timestamp.toISOString(),
          flightNumber: flightDetail.flightNumber,
          carrierCode: flightDetail.carrierCode,
          scheduledDepartureDate: flightDetail.scheduledDepartureDate,
          departureCity: flightDetail.departureCity || "",
          arrivalCity: flightDetail.arrivalCity || "",
          departureAirport: flightDetail.departureAirport || "",
          arrivalAirport: flightDetail.arrivalAirport || "",
          departureGate: flightDetail.departureGate || "",
          arrivalGate: flightDetail.arrivalGate || "",
          operatingAirlineCode: flightDetail.operatingAirlineCode || "",
          equipmentModel: flightDetail.equipmentModel || "",
          flightStatus: flightDetail.flightStatus || flightDetail.currentStatus || "",
          flightStatusCode: flightDetail.status?.statusCode || "",
          currentFlightStatusTime: "",
          DepartureState: flightDetail.status?.departureState || "",
          ArrivalState: flightDetail.status?.arrivalState || "",
          bagClaim: flightDetail.utcTimes?.bagClaim || "",
          scheduledDepartureUTC: "",
          scheduledArrivalUTC: "",
          estimatedDepartureUTC: "",
          estimatedArrivalUTC: "",
          actualDepartureUTC: "",
          actualArrivalUTC: "",
          departureDelayMinutes: "",
          arrivalDelayMinutes: "",
          outUtc: "",
          offUtc: "",
          onUtc: flightDetail.status?.onUtc || "", // Added onUtc property
          inUtc: "",
          events: [],
          encryptedData: {},
          decryptedData: {},
          isDecrypting: false,
          source: "api",
        }

        const collectEncryptedData = (obj: any, prefix = "") => {
          if (!obj) return

          Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key

            if (typeof value === "string" && isLikelyEncrypted(value as string)) {
              if (!flightData.encryptedData[fullKey]) {
                flightData.encryptedData[fullKey] = []
              }
              flightData.encryptedData[fullKey].push(value as string)

              // Also store encrypted values directly in the corresponding fields
              if (key === "departureCity") flightData.departureCity = value as string
              if (key === "arrivalCity") flightData.arrivalCity = value as string
              if (key === "departureGate") flightData.departureGate = value as string
              if (key === "arrivalGate") flightData.arrivalGate = value as string
              if (key === "flightStatus") flightData.flightStatus = value as string
              if (key === "equipmentModel") flightData.equipmentModel = value as string
              if (key === "operatingAirlineCode") flightData.operatingAirlineCode = value as string
            } else if (typeof value === "object" && value !== null) {
              collectEncryptedData(value, fullKey)
            }
          })
        }

        // Collect encrypted data from the flight detail
        collectEncryptedData(flightDetail)

        // Process utcTimes if available
        if (flightDetail.utcTimes) {
          // Store the encrypted values directly in the corresponding fields
          flightData.scheduledDepartureUTC = flightDetail.utcTimes.scheduledDeparture || ""
          flightData.scheduledArrivalUTC = flightDetail.utcTimes.scheduledArrival || ""
          flightData.estimatedDepartureUTC = flightDetail.utcTimes.estimatedDeparture || ""
          flightData.estimatedArrivalUTC = flightDetail.utcTimes.estimatedArrival || ""
          flightData.actualDepartureUTC = flightDetail.utcTimes.actualDeparture || ""
          flightData.actualArrivalUTC = flightDetail.utcTimes.actualArrival || ""
          flightData.departureDelayMinutes = flightDetail.utcTimes.departureDelayMinutes || ""
          flightData.arrivalDelayMinutes = flightDetail.utcTimes.arrivalDelayMinutes || ""
          flightData.bagClaim = flightDetail.utcTimes.bagClaim || ""

          collectEncryptedData(flightDetail.utcTimes, "utcTimes")
        }

        // Process status if available
        if (flightDetail.status) {
          flightData.flightStatusCode = flightDetail.status.statusCode || ""
          flightData.DepartureState = flightDetail.status.departureState || ""
          flightData.ArrivalState = flightDetail.status.arrivalState || ""
          flightData.outUtc = flightDetail.status.outUtc || ""
          flightData.offUtc = flightDetail.status.offUtc || ""
          flightData.onUtc = flightDetail.status.onUtc || ""
          flightData.inUtc = flightDetail.status.inUtc || ""

          collectEncryptedData(flightDetail.status, "status")
        }

        return flightData
      })

      console.log("Processed API Flight Data:", apiFlightData)

      // Collect all encrypted values for decryption
      const allEncryptedValues: string[] = []
      apiFlightData.forEach((flight) => {
        Object.values(flight.encryptedData).forEach((values) => {
          values.forEach((value) => {
            if (!allEncryptedValues.includes(value)) {
              allEncryptedValues.push(value)
            }
          })
        })
      })

      console.log("Encrypted values to decrypt:", allEncryptedValues)

      // If there are encrypted values, decrypt them
      if (allEncryptedValues.length > 0) {
        setIsDecrypting(true)

        try {
          const decryptResponse = await fetch(`${baseUrl}/v1/flights/decrypt-flight-data`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              encryptedData: allEncryptedValues,
            }),
          })

          if (!decryptResponse.ok) {
            throw new Error(`Decryption API error: ${decryptResponse.status}`)
          }

          const decryptData = await decryptResponse.json()
          console.log("Decryption response:", decryptData)

          // Create a mapping of encrypted to decrypted values
          const newDecryptedMap: Record<string, string> = { ...decryptedMap }
          allEncryptedValues.forEach((encrypted, index) => {
            if (decryptData.decryptedData[index]) {
              newDecryptedMap[encrypted] = decryptData.decryptedData[index]
            }
          })

          // Update the decryption map
          setDecryptedMap(newDecryptedMap)

          toast({
            title: "Decryption successful",
            description: `Successfully decrypted ${
              Object.keys(newDecryptedMap).length - Object.keys(decryptedMap).length
            } new values from historical data.`,
          })
        } catch (apiError) {
          console.error("Error decrypting historical data:", apiError)
          toast({
            title: "Decryption failed",
            description: "Failed to decrypt historical flight data.",
            variant: "destructive",
          })
        } finally {
          setIsDecrypting(false)
        }
      }

      return apiFlightData
    } catch (error) {
      console.error("Error fetching historical flight data:", error)
      setApiError(`Failed to fetch historical flight data: ${error instanceof Error ? error.message : "Unknown error"}`)
      toast({
        title: "API Error",
        description: `Failed to fetch historical flight data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(
    async (searchParams: SearchParams) => {
      setIsLoading(true)
      setApiError(null)

      try {
        // First, filter the existing blockchain events based on search parameters
        const filtered = flightEvents.filter((flight) => {
          // Match carrier code
          if (searchParams.carrierCode && flight.carrierCode.toLowerCase() !== searchParams.carrierCode.toLowerCase()) {
            return false
          }

          // Match flight number
          if (searchParams.flightNumber && !flight.flightNumber.includes(searchParams.flightNumber)) {
            return false
          }

          // Match date range if provided
          if (searchParams.startDate && searchParams.endDate) {
            const flightDate = new Date(flight.timestamp)
            const startDate = new Date(searchParams.startDate)
            const endDate = new Date(searchParams.endDate)

            if (flightDate < startDate || flightDate > endDate) {
              return false
            }

            return true
          }
        })

        // If we have a flight number and carrier code, also fetch historical data from API
        let apiFlights: FlightData[] = []
        if (searchParams.flightNumber && searchParams.carrierCode && searchParams.startDate && searchParams.endDate) {
          const startDateStr = searchParams.startDate.toISOString().split("T")[0]
          const endDateStr = searchParams.endDate.toISOString().split("T")[0]

          apiFlights = await fetchFlightDataFromAPI(
            searchParams.flightNumber,
            searchParams.carrierCode,
            startDateStr,
            endDateStr,
          )
        }

        // Combine blockchain and API data
        const combinedFlights = [...filtered]

        // Only add API flights that don't already exist in the blockchain data
        apiFlights.forEach((apiFlight) => {
          console.log("Adding API flight to combined flights:", apiFlight)
          const exists = combinedFlights.some(
            (flight) =>
              flight.flightNumber === apiFlight.flightNumber &&
              flight.carrierCode === apiFlight.carrierCode &&
              flight.scheduledDepartureDate === apiFlight.scheduledDepartureDate,
          )

          if (!exists) {
            combinedFlights.push(apiFlight)
          }
        })

        console.log("Combined flights before decryption:", combinedFlights)

        // Apply decryption to the combined flights
        const decryptedFlights = getDecryptedFlights(combinedFlights)
        console.log("Decrypted flights:", decryptedFlights)

        // Sort by timestamp (newest first)
        const sortedFlights = decryptedFlights.sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        })

        console.log("Final sorted flights to display:", sortedFlights)
        setFilteredEvents(sortedFlights)

        // Notify parent component about search results
        if (onSearchResults) {
          onSearchResults(sortedFlights, searchParams)
        }

        // Show toast with results
        toast({
          title: "Search completed",
          description: `Found ${sortedFlights.length} flights matching your criteria.`,
        })
      } catch (searchError) {
        console.error("Error searching flights:", searchError)
        setApiError(`Search error: ${searchError instanceof Error ? searchError.message : "Unknown error"}`)
      } finally {
        setIsLoading(false)
      }
    },
    [flightEvents, getDecryptedFlights, onSearchResults, toast],
  )

  // Add a new function to fetch flight data from API
  const fetchFlightDataFromAPI = async (
    flightNumber: string,
    carrierCode: string,
    startDate: string,
    endDate: string,
  ): Promise<FlightData[]> => {
    try {
      const data = await fetchHistoricalFlightData(flightNumber, carrierCode, startDate, endDate)

      // Process the API response into FlightData objects
      const apiFlightData: FlightData[] = data.flightDetails.map((flightDetail: any, index: number) => {
        const timestamp = new Date()
        timestamp.setHours(timestamp.getHours() - index) // Stagger timestamps for display

        // Create a unique ID for this flight
        const flightId = `api-${flightDetail.flightNumber}-${flightDetail.scheduledDepartureDate}-${index}`

        console.log(`Processing API flight: ${flightId}`, flightDetail)

        const flightData: FlightData = {
          eventId: flightId,
          timestamp: timestamp.toISOString(),
          flightNumber: flightDetail.flightNumber,
          carrierCode: flightDetail.carrierCode,
          scheduledDepartureDate: flightDetail.scheduledDepartureDate,
          departureCity: flightDetail.departureCity || "",
          arrivalCity: flightDetail.arrivalCity || "",
          departureAirport: flightDetail.departureAirport || "",
          arrivalAirport: flightDetail.arrivalAirport || "",
          departureGate: flightDetail.departureGate || "",
          arrivalGate: flightDetail.arrivalGate || "",
          operatingAirlineCode: flightDetail.operatingAirlineCode || "",
          equipmentModel: flightDetail.equipmentModel || "",
          flightStatus: flightDetail.flightStatus || flightDetail.currentStatus || "",
          flightStatusCode: flightDetail.status?.statusCode || "",
          currentFlightStatusTime: "",
          DepartureState: flightDetail.status?.departureState || "",
          ArrivalState: flightDetail.status?.arrivalState || "",
          bagClaim: flightDetail.utcTimes?.bagClaim || "",
          scheduledDepartureUTC: "",
          scheduledArrivalUTC: "",
          estimatedDepartureUTC: "",
          estimatedArrivalUTC: "",
          actualDepartureUTC: "",
          actualArrivalUTC: "",
          departureDelayMinutes: "",
          arrivalDelayMinutes: "",
          outUtc: "",
          offUtc: "",
          onUtc: "", // <-- Added missing property
          inUtc: "",
          events: [],
          encryptedData: {},
          decryptedData: {},
          isDecrypting: false,
          source: "api",
        }

        // Collect encrypted data from the API response
        const collectEncryptedData = (obj: any, prefix = "") => {
          if (!obj) return

          Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key

            if (typeof value === "string" && isLikelyEncrypted(value as string)) {
              if (!flightData.encryptedData[fullKey]) {
                flightData.encryptedData[fullKey] = []
              }
              flightData.encryptedData[fullKey].push(value as string)

              // Also store encrypted values directly in the corresponding fields
              if (key === "departureCity") flightData.departureCity = value as string
              if (key === "arrivalCity") flightData.arrivalCity = value as string
              if (key === "departureGate") flightData.departureGate = value as string
              if (key === "arrivalGate") flightData.arrivalGate = value as string
              if (key === "flightStatus") flightData.flightStatus = value as string
              if (key === "equipmentModel") flightData.equipmentModel = value as string
              if (key === "operatingAirlineCode") flightData.operatingAirlineCode = value as string
            } else if (typeof value === "object" && value !== null) {
              collectEncryptedData(value, fullKey)
            }
          })
        }

        // Collect encrypted data from the flight detail
        collectEncryptedData(flightDetail)

        // Process utcTimes if available
        if (flightDetail.utcTimes) {
          // Store the encrypted values directly in the corresponding fields
          flightData.scheduledDepartureUTC = flightDetail.utcTimes.scheduledDeparture || ""
          flightData.scheduledArrivalUTC = flightDetail.utcTimes.scheduledArrival || ""
          flightData.estimatedDepartureUTC = flightDetail.utcTimes.estimatedDeparture || ""
          flightData.estimatedArrivalUTC = flightDetail.utcTimes.estimatedArrival || ""
          flightData.actualDepartureUTC = flightDetail.utcTimes.actualDeparture || ""
          flightData.actualArrivalUTC = flightDetail.utcTimes.actualArrival || ""
          flightData.departureDelayMinutes = flightDetail.utcTimes.departureDelayMinutes || ""
          flightData.arrivalDelayMinutes = flightDetail.utcTimes.arrivalDelayMinutes || ""
          flightData.bagClaim = flightDetail.utcTimes.bagClaim || ""

          collectEncryptedData(flightDetail.utcTimes, "utcTimes")
        }

        // Process status if available
        if (flightDetail.status) {
          flightData.flightStatusCode = flightDetail.status.statusCode || ""
          flightData.DepartureState = flightDetail.status.departureState || ""
          flightData.ArrivalState = flightDetail.status.arrivalState || ""
          flightData.outUtc = flightDetail.status.outUtc || ""
          flightData.offUtc = flightDetail.status.offUtc || ""
          flightData.onUtc = flightDetail.status.onUtc || ""
          flightData.inUtc = flightDetail.status.inUtc || ""

          collectEncryptedData(flightDetail.status, "status")
        }

        return flightData
      })

      console.log("Processed API Flight Data:", apiFlightData)

      // Collect all encrypted values for decryption
      const allEncryptedValues: string[] = []
      apiFlightData.forEach((flight) => {
        Object.values(flight.encryptedData).forEach((values) => {
          values.forEach((value) => {
            if (!allEncryptedValues.includes(value)) {
              allEncryptedValues.push(value)
            }
          })
        })
      })

      console.log("Encrypted values to decrypt:", allEncryptedValues)

      // If there are encrypted values, decrypt them
      if (allEncryptedValues.length > 0) {
        setIsDecrypting(true)

        try {
          const decryptData = await decryptFlightData(allEncryptedValues)

          // Create a mapping of encrypted to decrypted values
          const newDecryptedMap: Record<string, string> = { ...decryptedMap }
          allEncryptedValues.forEach((encrypted, index) => {
            if (decryptData.decryptedData[index]) {
              newDecryptedMap[encrypted] = decryptData.decryptedData[index]
            }
          })

          // Update the decryption map
          setDecryptedMap(newDecryptedMap)

          toast({
            title: "Decryption successful",
            description: `Successfully decrypted ${
              Object.keys(newDecryptedMap).length - Object.keys(decryptedMap).length
            } new values from historical data.`,
          })
        } catch (apiError) {
          console.error("Error decrypting historical data:", apiError)
          toast({
            title: "Decryption failed",
            description: "Failed to decrypt historical flight data.",
            variant: "destructive",
          })
        } finally {
          setIsDecrypting(false)
        }
      }

      return apiFlightData
    } catch (error) {
      console.error("Error fetching historical flight data:", error)
      setApiError(`Failed to fetch historical flight data: ${error instanceof Error ? error.message : "Unknown error"}`)
      toast({
        title: "API Error",
        description: `Failed to fetch historical flight data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
      return []
    }
  }

  // Collect encrypted values from all flights - do this once
  const collectEncryptedValues = useCallback(() => {
    if (isDecrypting || Object.keys(decryptedMap).length > 0) return null

    // Collect all encrypted values from all flights
    const allEncryptedValues: string[] = []

    flightEvents.forEach((flight) => {
      // Check all fields for encrypted data
      Object.entries(flight).forEach(([field, value]) => {
        if (
          typeof value === "string" &&
          isLikelyEncrypted(value) &&
          field !== "events" &&
          field !== "encryptedData" &&
          field !== "decryptedData" &&
          field !== "isDecrypting" &&
          field !== "eventId" &&
          field !== "source"
        ) {
          if (!allEncryptedValues.includes(value)) {
            allEncryptedValues.push(value)
          }
        }
      })

      // Also check the encryptedData object
      Object.values(flight.encryptedData).forEach((values) => {
        values.forEach((value) => {
          if (!allEncryptedValues.includes(value)) {
            allEncryptedValues.push(value)
          }
        })
      })
    })

    // Update pending decryption state
    if (allEncryptedValues.length > 0) {
      setPendingDecryption(allEncryptedValues)
    }

    return allEncryptedValues.length > 0 ? allEncryptedValues : null
  }, [flightEvents, isDecrypting, decryptedMap])

  // Execute auto-decryption only once after initial load
  useEffect(() => {
    const encryptedValues = collectEncryptedValues()

    if (!encryptedValues) return

    const decryptData = async () => {
      setIsDecrypting(true)

      try {
        console.log("Auto-decrypting data:", {
          encryptedData: encryptedValues,
        })

        const response = await fetch(`${baseUrl}/v1/flights/decrypt-flight-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            encryptedData: encryptedValues,
          }),
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()

        // Create a mapping of encrypted to decrypted values
        const newDecryptedMap: Record<string, string> = {}
        encryptedValues.forEach((encrypted, index) => {
          if (data.decryptedData[index]) {
            newDecryptedMap[encrypted] = data.decryptedData[index]
          }
        })

        // Update the decryption map only once
        setDecryptedMap(newDecryptedMap)

        toast({
          title: "Decryption successful",
          description: `Successfully decrypted ${Object.keys(newDecryptedMap).length} values.`,
        })
      } catch (error) {
        console.error("Error auto-decrypting data:", error)
        toast({
          title: "Decryption failed",
          description: "Failed to decrypt flight data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsDecrypting(false)
      }
    }

    decryptData()
  }, [collectEncryptedValues, toast])

  // Single function for manual decryption of a specific flight
  const decryptSingleFlight = async (flight: FlightData) => {
    if (!flight.encryptedData || Object.keys(flight.encryptedData).length === 0) {
      toast({
        title: "No encrypted data",
        description: "This flight event doesn't have any encrypted data to decrypt.",
      })
      return
    }

    // Collect all encrypted values into a single array
    const allEncryptedValues: string[] = []
    Object.entries(flight).forEach(([field, value]) => {
      if (typeof value === "string" && isLikelyEncrypted(value)) {
        if (!allEncryptedValues.includes(value)) {
          allEncryptedValues.push(value)
        }
      }
    })

    // Also check the encryptedData object
    Object.values(flight.encryptedData).forEach((values) => {
      values.forEach((value) => {
        if (!allEncryptedValues.includes(value)) {
          allEncryptedValues.push(value)
        }
      })
    })

    setIsDecrypting(true)

    try {
      const response = await fetch(`${baseUrl}/v1/flights/decrypt-flight-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encryptedData: allEncryptedValues,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Create a mapping of encrypted to decrypted values
      const newDecryptedValues: Record<string, string> = { ...decryptedMap }
      allEncryptedValues.forEach((encrypted, index) => {
        if (data.decryptedData[index]) {
          newDecryptedValues[encrypted] = data.decryptedData[index]
        }
      })

      // Update the global decryption map
      setDecryptedMap(newDecryptedValues)

      toast({
        title: "Decryption successful",
        description: `Successfully decrypted ${
          Object.keys(newDecryptedValues).length - Object.keys(decryptedMap).length
        } new values.`,
      })
    } catch (error) {
      console.error("Error decrypting data:", error)
      toast({
        title: "Decryption failed",
        description: "Failed to decrypt flight data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDecrypting(false)
    }
  }

  const hasEncryptedData = (flight: FlightData) => {
    // Check all fields for encrypted data
    for (const [field, value] of Object.entries(flight)) {
      if (
        typeof value === "string" &&
        isLikelyEncrypted(value) &&
        field !== "events" &&
        field !== "encryptedData" &&
        field !== "decryptedData" &&
        field !== "isDecrypting" &&
        field !== "eventId" &&
        field !== "source"
      ) {
        return true
      }
    }
    return Object.keys(flight.encryptedData).length > 0
  }

  const columnDescriptions = {
    "Txn DTM": "Timestamp of when the transaction was recorded (in UTC/GMT)",
    Carrier: "Airline code (e.g., UA for United Airlines)",
    "Flt Nbr": "Flight number",
    "Dep Stn": "Departure airport code and city",
    "Dep State": "Departure status (e.g., On-time, Delayed)",
    "Arr Stn": "Arrival airport code and city",
    "Arr State": "Arrival status (e.g., On-time, Delayed)",
    "Flt Status": "Flight status in text format (e.g., Departed)",
    "Flt Status Cd": "Abbreviated flight status (OUT = Departed, IN = Arrived, NDPT = Not Departed)",
    "Dep Gate": "Assigned departure gate at the airport",
    "Arr Gate": "Assigned arrival gate at the airport",
    "Sch Dep DTM": "Scheduled departure date and time (in UTC/GMT)",
    "Sch Arr DTM": "Scheduled arrival date and time (in UTC/GMT)",
    "Est Dep DTM": "Estimated departure date and time based on current data",
    "Est Arr DTM": "Estimated arrival date and time based on current data",
    "Actual Dep DTM": "Actual time the flight departed (when it left the gate)",
    "Actual Arr DTM": "Actual time the flight arrived (when it reached the gate)",
    Bagclaim: "Baggage claim carousel/area for the arriving flight",
    Source: "Source of the flight data (blockchain or API)",
  }

  const renderTableHeaderWithTooltip = (label: keyof typeof columnDescriptions) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer flex items-center">{label}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p>{columnDescriptions[label] || "No description available"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // Update the renderCellValue function to use the context and show skeletons
  const renderCellValue = (flight: FlightData, field: keyof FlightData) => {
    const value = flight[field] as string

    // Special handling for baggage claim and actual arrival - show TBD if missing
    if ((field === "bagClaim" || field === "actualArrivalUTC") && !shouldShowCell(value)) {
      return <span className="text-muted-foreground text-xs font-medium">TBD</span>
    }

    // Don't show empty or TBD values for other fields
    if (!shouldShowCell(value)) {
      // For missing fields in rows that have most data, show TBD
      return <span className="text-muted-foreground text-xs font-medium">TBD</span>
    }

    // Check if this value is encrypted
    if (isLikelyEncrypted(value)) {
      // If we're currently decrypting this value, show a skeleton
      if (isDecrypting && pendingDecryption.includes(value)) {
        return <CellSkeleton />
      }

      // If we have already decrypted this value
      if (decryptedMap[value]) {
        const decryptedValue = decryptedMap[value]

        // For status fields, apply special formatting
        if (field === "flightStatus" || field === "flightStatusCode") {
          const displayValue = mapStatusCodeToText(decryptedValue)
          const colorClass = getFlightStatusColor(decryptedValue)

          return (
            <div className="flex items-center gap-1">
              <Unlock className="h-3 w-3 text-green-500" />
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{displayValue}</span>
            </div>
          )
        }

        // For departure state field, apply special formatting
        if (field === "DepartureState") {
          const displayValue = mapDepartureStateCodeToText(decryptedValue)
          const colorClass = getDepartureStateColor(decryptedValue)

          return (
            <div className="flex items-center gap-1">
              <Unlock className="h-3 w-3 text-green-500" />
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{displayValue}</span>
            </div>
          )
        }

        // For arrival state field, apply special formatting
        if (field === "ArrivalState") {
          const displayValue = mapArrivalStateCodeToText(decryptedValue)
          const colorClass = getArrivalStateColor(decryptedValue)

          return (
            <div className="flex items-center gap-1">
              <Unlock className="h-3 w-3 text-green-500" />
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{displayValue}</span>
            </div>
          )
        }

        // Format date/time fields based on selected format
        if (
          field === "scheduledDepartureUTC" ||
          field === "scheduledArrivalUTC" ||
          field === "estimatedDepartureUTC" ||
          field === "estimatedArrivalUTC" ||
          field === "actualDepartureUTC" ||
          field === "actualArrivalUTC" ||
          field === "outUtc" ||
          field === "offUtc" ||
          field === "onUtc" ||
          field === "inUtc"
        ) {
          return (
            <div className="flex items-center gap-1">
              <Unlock className="h-3 w-3 text-green-500" />
              <span>{formatDateTime(decryptedValue, timeFormat)}</span>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-1">
            <Unlock className="h-3 w-3 text-green-500" />
            <span>{decryptedValue}</span>
          </div>
        )
      }

      // If it's still encrypted
      return (
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-amber-500" />
          <span className="text-xs">Encrypted</span>
        </div>
      )
    }

    // For non-encrypted status fields, apply special formatting with consistent capitalization
    if (field === "flightStatus") {
      const displayValue = mapStatusCodeToText(value)
      const colorClass = getFlightStatusColor(value)

      return <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{displayValue}</span>
    }

    // For non-encrypted departure state field, apply special formatting
    if (field === "DepartureState") {
      const displayValue = mapDepartureStateCodeToText(value)
      const colorClass = getDepartureStateColor(value)

      return <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{displayValue}</span>
    }

    // For non-encrypted arrival state field, apply special formatting
    if (field === "ArrivalState") {
      const displayValue = mapArrivalStateCodeToText(value)
      const colorClass = getArrivalStateColor(value)

      return <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{displayValue}</span>
    }

    // Format date/time fields based on selected format
    if (
      field === "scheduledDepartureUTC" ||
      field === "scheduledArrivalUTC" ||
      field === "estimatedDepartureUTC" ||
      field === "estimatedArrivalUTC" ||
      field === "actualDepartureUTC" ||
      field === "actualArrivalUTC" ||
      field === "outUtc" ||
      field === "offUtc" ||
      field === "onUtc" ||
      field === "inUtc"
    ) {
      return formatDateTime(value, timeFormat)
    }

    // Special handling for source field
    if (field === "source") {
      return (
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${
            value === "api" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
          }`}
        >
          {value === "api" ? "API" : "Blockchain"}
        </span>
      )
    }

    return value
  }

  // Clear pending decryption when decryption is complete
  useEffect(() => {
    if (!isDecrypting && pendingDecryption.length > 0) {
      setPendingDecryption([])
    }
  }, [isDecrypting, pendingDecryption])

  return (
    <DecryptionContext.Provider
      value={{
        isDecrypting,
        decryptedMap,
        pendingDecryption,
        timeFormat,
      }}
    >
      <div className="space-y-4">
        <style jsx global>{`
          .flight-table-header {
            background-color: black;
            color: white;
          }

          .flight-table-header th {
            white-space: nowrap;
            background-color: black;
            color: white;
            text-align: left;
            font-weight: 600;
          }

          .flight-table-row td {
            text-align: left;
            white-space: nowrap;
          }

          .flight-table-container {
            width: 100%;
            overflow-x: auto;
          }

          /* Fix for Txn DTM column to show full values */
          .txn-dtm-cell {
            min-width: 150px;
            max-width: 200px;
          }
        `}</style>

        <div className="flight-table-container">
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow className="flight-table-header ">
                  <TableHead className="txn-dtm-cell">{renderTableHeaderWithTooltip("Txn DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Carrier")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Flt Nbr")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Dep Stn")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Dep State")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Arr Stn")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Arr State")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Flt Status")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Flt Status Cd")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Dep Gate")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Arr Gate")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Sch Dep DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Sch Arr DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Est Dep DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Est Arr DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Actual Dep DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Actual Arr DTM")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Bagclaim")}</TableHead>
                  <TableHead>{renderTableHeaderWithTooltip("Source")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                        <TableCell>
                          <CellSkeleton />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredEvents.length > 0 ? (
                  filteredEvents
                    .filter((flight) => {
                      // Only show rows that have essential data
                      const hasEssentialData =
                        shouldShowCell(flight.flightNumber) &&
                        shouldShowCell(flight.carrierCode) &&
                        (shouldShowCell(flight.departureAirport) || shouldShowCell(flight.departureCity)) &&
                        (shouldShowCell(flight.arrivalAirport) || shouldShowCell(flight.arrivalCity))
                      return hasEssentialData
                    })
                    .map((flight, index) => {
                      // Determine flight status based on UTC timestamps if not already set
                      const displayFlightStatus = shouldShowCell(flight.flightStatus)
                        ? flight.flightStatus
                        : determineFlightStatus(flight)

                      const displayFlightStatusCode = shouldShowCell(flight.flightStatusCode)
                        ? flight.flightStatusCode
                        : determineFlightStatusCode(flight)

                      // Determine departure and arrival states if not already set
                      const displayDepartureState = shouldShowCell(flight.DepartureState)
                        ? flight.DepartureState
                        : determineDepartureState(flight)

                      const displayArrivalState = shouldShowCell(flight.ArrivalState)
                        ? flight.ArrivalState
                        : determineArrivalState(flight)

                      return (
                        <TableRow
                          key={flight.eventId}
                          className={`flight-table-row ${index % 2 === 0 ? "bg-muted/20" : ""}`}
                        >
                          <TableCell className="txn-dtm-cell">{renderCellValue(flight, "timestamp")}</TableCell>
                          <TableCell>{renderCellValue(flight, "carrierCode")}</TableCell>
                          <TableCell className="font-medium">{flight.flightNumber}</TableCell>

                          <TableCell>
                            {shouldShowCell(flight.departureCity) || shouldShowCell(flight.departureAirport) ? (
                              <>
                                {renderCellValue(flight, "departureCity")}
                                {shouldShowCell(flight.departureAirport) && (
                                  <> ({renderCellValue(flight, "departureAirport")})</>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs font-medium">TBD</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getDepartureStateColor(
                                displayDepartureState,
                              )}`}
                            >
                              {mapDepartureStateCodeToText(displayDepartureState)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {shouldShowCell(flight.arrivalCity) || shouldShowCell(flight.arrivalAirport) ? (
                              <>
                                {renderCellValue(flight, "arrivalCity")}
                                {shouldShowCell(flight.arrivalAirport) && (
                                  <> ({renderCellValue(flight, "arrivalAirport")})</>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs font-medium">TBD</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getArrivalStateColor(
                                displayArrivalState,
                              )}`}
                            >
                              {mapArrivalStateCodeToText(displayArrivalState)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getFlightStatusColor(
                                displayFlightStatus,
                              )}`}
                            >
                              {mapStatusCodeToText(displayFlightStatus)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getFlightStatusColor(
                                displayFlightStatusCode,
                              )}`}
                            >
                              {displayFlightStatusCode}
                            </span>
                          </TableCell>

                          <TableCell>{renderCellValue(flight, "departureGate")}</TableCell>
                          <TableCell>{renderCellValue(flight, "arrivalGate")}</TableCell>
                          <TableCell>{renderCellValue(flight, "scheduledDepartureUTC")}</TableCell>
                          <TableCell>{renderCellValue(flight, "scheduledArrivalUTC")}</TableCell>
                          <TableCell>{renderCellValue(flight, "estimatedDepartureUTC")}</TableCell>
                          <TableCell>{renderCellValue(flight, "estimatedArrivalUTC")}</TableCell>
                          <TableCell>{renderCellValue(flight, "actualDepartureUTC")}</TableCell>
                          <TableCell>{renderCellValue(flight, "actualArrivalUTC")}</TableCell>
                          <TableCell>{renderCellValue(flight, "bagClaim")}</TableCell>
                          <TableCell>{renderCellValue(flight, "source")}</TableCell>
                        </TableRow>
                      )
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                      {isSearchMode
                        ? "No flight data found matching your search criteria"
                        : "No flight data available. Use the search above to find historical flight data."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </DecryptionContext.Provider>
  )
}
function decryptFlightData(allEncryptedValues: string[]) {
  throw new Error("Function not implemented.")
}
