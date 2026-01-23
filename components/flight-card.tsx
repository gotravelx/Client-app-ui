import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Plane, Clock, Activity, ArrowRight, PlaneTakeoff, PlaneLanding, MapPin, LogOut, AlertCircle, ArrowDown, ExternalLink } from 'lucide-react'
import { FlightStatusBadge } from "@/components/flight-status-badge"
import { FLIGHT_STATUS_CODES, getArrivalStateColor, getDepartureStateColor } from "@/lib/flight-status"
import moment from "moment-timezone"

interface FlightTimelineCardProps {
  flight: any
  events?: any[]
}

export function FlightCard({ flight, events = [] }: FlightTimelineCardProps) {
  // Airport to timezone mapping for major US airports
  const getAirportTimezone = (airportCode: string): string => {
    const timezones: { [key: string]: string } = {
      // Eastern Time
      ATL: "America/New_York", // Atlanta
      BOS: "America/New_York", // Boston
      BWI: "America/New_York", // Baltimore
      CLT: "America/New_York", // Charlotte
      DCA: "America/New_York", // Washington DC
      DTW: "America/New_York", // Detroit
      EWR: "America/New_York", // Newark
      FLL: "America/New_York", // Fort Lauderdale
      IAD: "America/New_York", // Washington Dulles
      JFK: "America/New_York", // New York JFK
      LGA: "America/New_York", // New York LaGuardia
      MIA: "America/New_York", // Miami
      MCO: "America/New_York", // Orlando
      PHL: "America/New_York", // Philadelphia
      PIT: "America/New_York", // Pittsburgh
      RDU: "America/New_York", // Raleigh-Durham
      TPA: "America/New_York", // Tampa

      // Central Time
      AUS: "America/Chicago", // Austin
      DFW: "America/Chicago", // Dallas/Fort Worth
      DAL: "America/Chicago", // Dallas Love Field
      HOU: "America/Chicago", // Houston Hobby
      IAH: "America/Chicago", // Houston Intercontinental
      MCI: "America/Chicago", // Kansas City
      MDW: "America/Chicago", // Chicago Midway
      MSP: "America/Chicago", // Minneapolis
      MSY: "America/Chicago", // New Orleans
      OKC: "America/Chicago", // Oklahoma City
      ORD: "America/Chicago", // Chicago O'Hare
      SAT: "America/Chicago", // San Antonio
      STL: "America/Chicago", // St. Louis

      // Mountain Time
      DEN: "America/Denver", // Denver
      PHX: "America/Phoenix", // Phoenix (no DST)
      SLC: "America/Denver", // Salt Lake City
      ABQ: "America/Denver", // Albuquerque
      BOI: "America/Denver", // Boise
      BIL: "America/Denver", // Billings

      // Pacific Time
      LAX: "America/Los_Angeles", // Los Angeles
      SFO: "America/Los_Angeles", // San Francisco
      SAN: "America/Los_Angeles", // San Diego
      SEA: "America/Los_Angeles", // Seattle
      PDX: "America/Los_Angeles", // Portland
      LAS: "America/Los_Angeles", // Las Vegas
      SMF: "America/Los_Angeles", // Sacramento
      SJC: "America/Los_Angeles", // San Jose
      BUR: "America/Los_Angeles", // Burbank
      OAK: "America/Los_Angeles", // Oakland

      // Alaska Time
      ANC: "America/Anchorage", // Anchorage
      FAI: "America/Anchorage", // Fairbanks

      // Hawaii Time
      HNL: "Pacific/Honolulu", // Honolulu
    }

    return timezones[airportCode] || "America/New_York" // Default to Eastern
  }

  const convertToLocalTime = (utcTime: string, airportCode: string) => {
    if (!utcTime || utcTime === "") return null

    try {
      const timezone = getAirportTimezone(airportCode)

      // Parse in the airport's timezone, but keep local clock time
      const localTime = moment.tz(utcTime, timezone)

      if (!localTime.isValid()) return null

      return {
        time: localTime.format("h:mm A"), // 9:35 AM
        date: localTime.format("dddd DD-MMM-YYYY"), // Thursday 25-Sep-2025
        timezone: localTime.format("z"), // CDT, EDT, etc.
        full: localTime,
        raw: localTime.format(),
      }
    } catch (error) {
      return null
    }
  }




  const calculateFlightDuration = () => {
    const depTime = flight.times?.scheduledDeparture || flight.times?.estimatedDeparture
    const arrTime = flight.times?.scheduledArrival || flight.times?.estimatedArrival

    if (!depTime || !arrTime) return null

    try {
      const departure = moment.utc(depTime)
      const arrival = moment.utc(arrTime)

      if (!departure.isValid() || !arrival.isValid()) return null

      const duration = moment.duration(arrival.diff(departure))
      const hours = Math.floor(duration.asHours())
      const minutes = duration.minutes()



      return {
        hours,
        minutes,
        total: `${hours}h ${minutes}m`,
      }
    } catch (error) {
      return null
    }
  }

  const getDelayInfo = (scheduledTime: string, actualTime: string, airportCode: string) => {
    if (!scheduledTime || !actualTime) return null

    try {
      const scheduled = moment.utc(scheduledTime)
      const actual = moment.utc(actualTime)

      if (!scheduled.isValid() || !actual.isValid()) return null

      const diffMinutes = actual.diff(scheduled, "minutes")

      if (diffMinutes > 0) {
        return {
          type: "late",
          minutes: diffMinutes,
          text: `${diffMinutes} minutes late`,
        }
      } else if (diffMinutes < 0) {
        return {
          type: "early",
          minutes: Math.abs(diffMinutes),
          text: `${Math.abs(diffMinutes)} minutes early`,
        }
      }

      return {
        type: "ontime",
        minutes: 0,
        text: "on time",
      }
    } catch (error) {
      return null
    }
  }

  const getFlightEventsTimeline = () => {
    const events = []
    const status = flight.times
    const now = moment.utc()

    // Check if flight is cancelled
    const isCancelled = flight.status?.legStatus?.includes('CNCL') ||
      flight?.status.legStatus?.includes('CNCL') ||
      flight.status?.legStatus === 'C' ||
      flight?.status.legStatus === 'C'

    // If cancelled, show cancellation event first
    if (isCancelled) {
      const cancelTime = flight.times?.scheduledDeparture || new Date().toISOString()
      const cancelLocal = convertToLocalTime(cancelTime, flight.departureAirport?.code)
      events.push({
        type: "CNCL",
        title: "Flight Cancelled",
        description: `Flight ${flight.carrierCode} ${flight.flightNumber} has been cancelled`,
        timestamp: cancelTime,
        local: cancelLocal,
        icon: AlertCircle,
        status: "cancelled",
        location: `${flight.departureAirport?.code} - ${flight.departureCity?.city}`,
        order: 0
      })
      return events // Return only cancellation event for cancelled flights
    }

    // 1. OUT - Pushback from gate (First event)
    if (status?.outTime && status.outTime !== "") {
      const outLocal = convertToLocalTime(status.outTime, flight.departureAirport?.code)
      events.push({
        type: "OUT",
        title: "Left Gate",
        description: `Departed from Gate ${flight.departureGate || "N/A"}`,
        timestamp: status.outUtc,
        local: outLocal,
        icon: LogOut,
        status: "completed",
        location: `${flight.departureAirport?.code} - ${flight.departureAirport?.city}`,
        order: 1
      })
    } else {
      // Show scheduled/estimated departure
      const scheduledDep = flight.times?.scheduledDeparture || flight.times?.estimatedDeparture
      if (scheduledDep) {
        const depLocal = convertToLocalTime(scheduledDep, flight.departureAirport?.code)
        const isUpcoming = moment.utc(scheduledDep).isAfter(now)
        events.push({
          type: "OUT",
          title: isUpcoming ? "Scheduled Departure" : "Expected Departure",
          description: `${isUpcoming ? "Scheduled" : "Expected"} to leave Gate ${flight.departureGate || "TBD"}`,
          timestamp: scheduledDep,
          local: depLocal,
          icon: LogOut,
          status: isUpcoming ? "upcoming" : "scheduled",
          location: `${flight.departureAirport?.code} - ${flight.departureAirport?.city}`,
          order: 1
        })
      }
    }

    // 2. OFF - Takeoff (Second event)
    if (status?.offTime && status.offTime !== "") {
      const offLocal = convertToLocalTime(status.offTime, flight.departureAirport?.code)
      events.push({
        type: "OFF",
        title: "Takeoff",
        description: `Departed ${flight.departureAirport?.code}`,
        timestamp: status.offUtc,
        local: offLocal,
        icon: PlaneTakeoff,
        status: "completed",
        location: `${flight.departureAirport?.code} - ${flight.departureAirport?.city}`,
        order: 2
      })
    } else {
      // Show estimated takeoff based on departure status
      let takeoffTime = null
      let takeoffStatus = "scheduled"
      let takeoffTitle = "Scheduled Takeoff"

      if (status?.outTime) {
        // If already left gate, estimate takeoff in 15 minutes
        takeoffTime = moment.utc(status.outTime).add(15, "minutes").toISOString()
        takeoffStatus = moment.utc(takeoffTime).isAfter(now) ? "upcoming" : "estimated"
        takeoffTitle = takeoffStatus === "upcoming" ? "Estimated Takeoff" : "Expected Takeoff"
      } else if (flight.times?.scheduledDeparture) {
        // If not left gate yet, estimate takeoff 30 minutes after scheduled departure
        takeoffTime = moment.utc(flight.times.scheduledDeparture).add(30, "minutes").toISOString()
        takeoffStatus = "tbd"
        takeoffTitle = "Takeoff - TBD"
      }

      if (takeoffTime) {
        const takeoffLocal = convertToLocalTime(takeoffTime, flight.departureAirport?.code)
        events.push({
          type: "OFF",
          title: takeoffTitle,
          description: takeoffStatus === "tbd" ?
            `Takeoff time to be decided from ${flight.departureAirport?.code}` :
            `${takeoffTitle.split(' ')[0]} departure from ${flight.departureAirport.code}`,
          timestamp: takeoffTime,
          local: takeoffLocal,
          icon: PlaneTakeoff,
          status: takeoffStatus,
          location: `${flight.departureAirport?.code} - ${flight.departureAirport?.code}`,
          order: 2
        })
      }
    }

    // 3. ON - Landing (Third event)
    if (status?.onTime && status.onTime !== "") {
      const onLocal = convertToLocalTime(status.onTime, flight.arrivalAirport?.code)
      events.push({
        type: "ON",
        title: "Landing",
        description: `Landed at ${flight.arrivalAirport?.code}`,
        timestamp: status.onTime,
        local: onLocal,
        icon: PlaneLanding,
        status: "completed",
        location: `${flight.arrivalAirport?.code} - ${flight.arrivalAirport?.city}`,
        order: 3
      })
    } else {
      // Show estimated landing
      const arrivalTime = flight.times?.estimatedArrival || flight.times?.scheduledArrival
      if (arrivalTime) {
        const landingLocal = convertToLocalTime(arrivalTime, flight.arrivalAirport?.code)
        const isUpcoming = moment.utc(arrivalTime).isAfter(now)
        events.push({
          type: "ON",
          title: isUpcoming ? "Estimated Landing" : "Expected Landing",
          description: `${isUpcoming ? "Estimated" : "Expected"} arrival at ${flight.arrivalAirport?.code}`,
          timestamp: arrivalTime,
          local: landingLocal,
          icon: PlaneLanding,
          status: isUpcoming ? "upcoming" : "estimated",
          location: `${flight.arrivalAirport?.code} - ${flight.arrivalAirport?.city}`,
          order: 3
        })
      }
    }

    // 4. IN - Arrival at gate (Fourth event)
    if (status?.inTime && status.inTime !== "") {
      const inLocal = convertToLocalTime(status.inTime, flight.arrivalAirport?.code)
      events.push({
        type: "IN",
        title: "Arrived at Gate",
        description: `Arrived at Gate ${flight.arrivalGate || "N/A"}`,
        timestamp: status.inUtc,
        local: inLocal,
        icon: MapPin,
        status: "completed",
        location: `${flight.arrivalAirport?.code} - ${flight.arrivalAirport?.city}`,
        order: 4
      })
    } else {
      // Show estimated gate arrival
      let gateTime = null

      if (status?.onTime) {
        // If already landed, estimate gate arrival in 15 minutes
        gateTime = moment.utc(status.onTime).add(15, "minutes").toISOString()
      } else if (flight.times?.estimatedArrival || flight.times?.scheduledArrival) {
        // If not landed yet, estimate gate arrival 15 minutes after landing
        const baseTime = flight.times?.estimatedArrival || flight.times?.scheduledArrival
        gateTime = moment.utc(baseTime).add(15, "minutes").toISOString()
      }

      if (gateTime) {
        const gateLocal = convertToLocalTime(gateTime, flight.arrivalAirport?.code)
        const isUpcoming = moment.utc(gateTime).isAfter(now)
        events.push({
          type: "IN",
          title: isUpcoming ? "Estimated Gate Arrival" : "Expected Gate Arrival",
          description: `${isUpcoming ? "Estimated" : "Expected"} arrival at Gate ${flight.arrivalGate || "TBD"}`,
          timestamp: gateTime,
          local: gateLocal,
          icon: MapPin,
          status: isUpcoming ? "upcoming" : "estimated",
          location: `${flight.arrivalAirport?.code} - ${flight.arrivalAirport?.city}`,
          order: 4
        })
      }
    }

    // Sort events by order to maintain sequence: OUT -> OFF -> ON -> IN
    return events.sort((a, b) => a.order - b.order)
  }

  const departureLocal = {
    scheduled: convertToLocalTime(flight.times?.scheduledDeparture, flight.departureAirport?.code),
    estimated: convertToLocalTime(flight.times?.estimatedDeparture, flight.departureAirport?.code),
    actual: convertToLocalTime(flight.times?.actualDeparture, flight.departureAirport?.code),
  }

  const arrivalLocal = {
    scheduled: convertToLocalTime(flight.times?.scheduledArrival, flight.arrivalAirport?.code),
    estimated: convertToLocalTime(flight.times?.estimatedArrival, flight.arrivalAirport?.code),
    actual: convertToLocalTime(flight.times?.actualArrival, flight.arrivalAirport?.code),
  }

  const flightDuration = calculateFlightDuration()
  const flightEvents = getFlightEventsTimeline()

  const departureDelay = getDelayInfo(
    flight.times?.scheduledDeparture,
    flight.times?.actualDeparture || flight.times?.estimatedDeparture,
    flight.departureAirport?.code,
  )

  const arrivalDelay = getDelayInfo(
    flight.times?.scheduledArrival,
    flight.times?.actualArrival || flight.times?.estimatedArrival,
    flight.arrivalAirport?.code,
  )

  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: "N/A", time: "N/A" }

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return { date: "N/A", time: "N/A" }
      }

      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    } catch (error) {
      return { date: "N/A", time: "N/A" }
    }
  }

  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false
    try {
      const date = new Date(dateString)
      return !isNaN(date.getTime())
    } catch {
      return false
    }
  }

  const getStatusDisplay = (legStatus: string) => {
    const statusInfo = FLIGHT_STATUS_CODES[legStatus]
    return statusInfo ? statusInfo.display : legStatus || "N/A"
  }

  const getDelayBadgeColor = (delayInfo: any) => {
    if (!delayInfo) return ""

    switch (delayInfo.type) {
      case "early":
        return "bg-green-100 text-green-800"
      case "late":
        return "bg-red-100 text-red-800"
      case "ontime":
        return "bg-green-100 text-green-800"
      default:
        return ""
    }
  }

  const getEventVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "upcoming":
        return "secondary"
      case "estimated":
        return "outline"
      case "scheduled":
        return "outline"
      case "tbd":
        return "destructive"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getEventCardStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
      case "upcoming":
        return "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
      case "estimated":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
      case "scheduled":
        return "bg-muted/50"
      case "tbd":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
      case "cancelled":
        return "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
      default:
        return "bg-muted/50"
    }
  }

  const getEventIconStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white"
      case "upcoming":
        return "bg-orange-500 text-white"
      case "estimated":
        return "bg-blue-500 text-white"
      case "scheduled":
        return "bg-muted text-muted-foreground"
      case "tbd":
        return "bg-yellow-500 text-white"
      case "cancelled":
        return "bg-red-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Count upcoming events
  const upcomingEvents = flightEvents.filter((event) => event.status === "upcoming").length

  return (
    <Card>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="flight-details">
          <Card className="w-full border-none shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  {flight.carrierCode} {flight.flightNumber}

                  {upcomingEvents > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {upcomingEvents} Upcoming Event{upcomingEvents > 1 ? "s" : ""}
                    </Badge>
                  )}
                </CardTitle>
                <FlightStatusBadge status={flight.status?.legStatus || flight.flightStatus} />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{flight.departureAirport?.code}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{flight.arrivalAirport?.code}</span>
                </div>
                <div className="text-muted-foreground">{departureLocal.scheduled?.date || "N/A"}</div>
              </div>

              {/* Flight Route with Times */}
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Departure */}
                <div className="text-left">
                  <div className="text-2xl font-bold">{flight.departureAirport?.code}</div>
                  <div className="text-sm text-muted-foreground">{flight.departureAirport?.city}</div>
                  <div className="text-xs mt-1">Gate {flight.departureGate || "TBD"}</div>
                  <div className="text-xs text-muted-foreground">
                    {flight.departureAirport &&
                      getAirportTimezone(flight.departureAirport?.code).split("/")[1]?.replace("_", " ")}
                  </div>

                  {/* Departure Time Display */}
                  <div className="mt-2 p-2 bg-muted/50 rounded">
                    <div className="text-sm font-medium">
                      {departureLocal.actual?.time ||
                        departureLocal.estimated?.time ||
                        departureLocal.scheduled?.time ||
                        "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {departureLocal.actual?.timezone ||
                        departureLocal.estimated?.timezone ||
                        departureLocal.scheduled?.timezone}
                    </div>
                    {departureDelay && (
                      <Badge variant="secondary" className={`text-xs mt-1 ${getDelayBadgeColor(departureDelay)}`}>
                        {departureDelay.text}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Flight Path */}
                <div className="text-center">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-muted-foreground"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <div className="bg-background px-2">
                        <Plane className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">{flight.equipmentModel}</div>
                  {flightDuration && <div className="text-xs font-medium mt-1">{flightDuration.total}</div>}
                </div>

                {/* Arrival */}
                <div className="text-right">
                  <div className="text-2xl font-bold">{flight.arrivalAirport?.code}</div>
                  <div className="text-sm text-muted-foreground">{flight.arrivalAirport?.city}</div>
                  <div className="text-xs mt-1">Gate {flight.arrivalGate || "TBD"}</div>
                  <div className="text-xs text-muted-foreground">
                    {flight.arrivalAirport &&
                      getAirportTimezone(flight.arrivalAirport?.code).split("/")[1]?.replace("_", " ")}
                  </div>

                  {/* Arrival Time Display */}
                  <div className="mt-2 p-2 bg-muted/50 rounded">
                    <div className="text-sm font-medium">
                      {arrivalLocal.actual?.time ||
                        arrivalLocal.estimated?.time ||
                        arrivalLocal.scheduled?.time ||
                        "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {arrivalLocal.actual?.timezone ||
                        arrivalLocal.estimated?.timezone ||
                        arrivalLocal.scheduled?.timezone}
                    </div>
                    {arrivalDelay && (
                      <Badge variant="secondary" className={`text-xs mt-1 ${getDelayBadgeColor(arrivalDelay)}`}>
                        {arrivalDelay.text}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Times Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h5 className="font-semibold mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Departure Times
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${getDepartureStateColor(flight.status?.departureStatus || flight.flightStatus)}`}
                      >
                        {getStatusDisplay(flight.status?.departureStatus || flight.flightStatus)}
                      </div>
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled:</span>
                        <span>{departureLocal.scheduled?.time || "TBD"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated:</span>
                        <span>{departureLocal.estimated?.time || "TBD"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual:</span>
                        <span>{departureLocal.actual?.time || "TBD"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h5 className="font-semibold mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Arrival Times
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${getArrivalStateColor(flight.status?.arrivalStatus || flight.flightStatus)}`}
                      >
                        {getStatusDisplay(flight.status?.arrivalStatus || flight.flightStatus)}
                      </div>
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled:</span>
                        <span>{arrivalLocal.scheduled?.time || "TBD"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated:</span>
                        <span>{arrivalLocal.estimated?.time || "TBD"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual:</span>
                        <span>{arrivalLocal.actual?.time || "TBD"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">BagClaim:</span>
                        <span>{flight?.baggageClaim || "TBD"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardHeader>
          </Card>
          <AccordionTrigger >
            <span className="cursor-pointer">See Details</span>
          </AccordionTrigger>
          <AccordionContent>
            <Card className="border-none shadow-none">
              <CardContent className="space-y-6 pt-0">
                {/* Flight Events Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Flight Timeline Events (OUT → OFF → ON → IN)
                      {upcomingEvents > 0 && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {upcomingEvents} Upcoming
                        </Badge>
                      )}
                    </h4>
                    <div className="mr-2">
                      {(flight.blockchainHash || flight.blockchainTxHash || flight.transactionHash || flight.txHash || events[0]?.transactionHash) ? (
                        <div
                          className="inline-flex items-center gap-1 cursor-pointer text-primary hover:underline text-xs font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://columbus.caminoscan.com/tx/${flight.blockchainHash || flight.blockchainTxHash || flight.transactionHash || flight.txHash || events[0]?.transactionHash}`, '_blank');
                          }}
                        >
                          View Transaction
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Verifying...</span>
                      )}
                    </div>
                  </div>
                  {flightEvents.length > 0 ? (
                    <div className="space-y-3">
                      {flightEvents.map((event, index) => {
                        const Icon = event.icon
                        const isLast = index === flightEvents.length - 1

                        return (
                          <div key={`${event.type}-${index}`} className="relative">
                            {!isLast && <div className="absolute left-6 top-12 w-px h-8 bg-border"></div>}

                            <Card className={`transition-all duration-200 ${getEventCardStyle(event.status)}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className={`p-2 rounded-full ${getEventIconStyle(event.status)}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <h5 className="font-semibold">{event.title}</h5>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={getEventVariant(event.status)}>{event.type}</Badge>
                                        {event.status === "upcoming" && (
                                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Upcoming
                                          </Badge>
                                        )}
                                        {event.status === "tbd" && (
                                          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">
                                            TBD
                                          </Badge>
                                        )}
                                        {event.status === "cancelled" && (
                                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                                            CANCELLED
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>


                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-medium">
                                          {event.status === "tbd" ? "TBD" : event.local?.time || "N/A"}
                                        </span>
                                        {event.status !== "tbd" && (
                                          <span className="text-muted-foreground">{event.local?.timezone}</span>
                                        )}
                                      </div>

                                      <div className="text-muted-foreground">{event.location}</div>
                                    </div>

                                    {event.local?.date && event.status !== "tbd" && (
                                      <div className="text-xs text-muted-foreground mt-1">{event.local.date}</div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No timeline events available</p>
                    </div>
                  )}
                </div>

                {/* Live Updates */}
                {events.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h5 className="font-semibold mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Live Blockchain Updates
                      </h5>
                      <div className="space-y-2">
                        {events.slice(0, 5).map((event, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded text-sm"
                          >
                            <div>
                              <span className="font-medium">{event.type}</span>
                              {event.status && <span className="ml-2 text-muted-foreground">• {event.status}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {isValidDate(event.timestamp) ? formatDateTime(event.timestamp).time : "N/A"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
