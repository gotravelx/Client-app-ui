import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Plane,
  Clock,
  Activity,
  ArrowRight,
  PlaneTakeoff,
  PlaneLanding,
  MapPin,
  LogOut,
  AlertCircle,
  ArrowDown,
} from "lucide-react"
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
      const localTime = moment.utc(utcTime).tz(timezone)

      if (!localTime.isValid()) return null

      return {
        time: localTime.format("h:mm A"), // 7:00 AM format
        date: localTime.format("dddd DD-MMM-YYYY"), // Monday 28-Jul-2025
        timezone: localTime.format("z"), // CDT, EDT, etc.
        full: localTime,
        raw: localTime.format(),
      }
    } catch (error) {
      console.error("Error converting time:", error)
      return null
    }
  }

  const calculateFlightDuration = () => {
    const depTime = flight.utcTimes?.scheduledDeparture || flight.utcTimes?.estimatedDeparture
    const arrTime = flight.utcTimes?.scheduledArrival || flight.utcTimes?.estimatedArrival

    if (!depTime || !arrTime) return null

    try {
      const departure = moment.utc(depTime)
      const arrival = moment.utc(arrTime)

      if (!departure.isValid() || !arrival.isValid()) return null

      const duration = moment.duration(arrival.diff(departure))
      const hours = Math.floor(duration.asHours())
      const minutes = duration.minutes()

      console.log(`Flight duration: ${hours}h ${minutes}m`);
      

      return {
        hours,
        minutes,
        total: `${hours}h ${minutes}m`,
      }
    } catch (error) {
      console.error("Error calculating duration:", error)
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
    const status = flight.status
    const now = moment.utc()

    // OUT - Pushback from gate
    if (status?.outUtc && status.outUtc !== "") {
      const outLocal = convertToLocalTime(status.outUtc, flight.departureAirport)
      events.push({
        type: "OUT",
        title: "Left Gate",
        description: `Departed from Gate ${flight.departureGate || "N/A"}`,
        timestamp: status.outUtc,
        local: outLocal,
        icon: LogOut,
        status: "completed",
        location: `${flight.departureAirport} - ${flight.departureCity}`,
      })
    } else {
      // Show upcoming OUT event
      const scheduledDep = flight.utcTimes?.scheduledDeparture || flight.utcTimes?.estimatedDeparture
      if (scheduledDep) {
        const depLocal = convertToLocalTime(scheduledDep, flight.departureAirport)
        const isUpcoming = moment.utc(scheduledDep).isAfter(now)
        events.push({
          type: "OUT",
          title: isUpcoming ? "Scheduled Departure" : "Expected Departure",
          description: `${isUpcoming ? "Scheduled" : "Expected"} to leave Gate ${flight.departureGate || "TBD"}`,
          timestamp: scheduledDep,
          local: depLocal,
          icon: LogOut,
          status: isUpcoming ? "upcoming" : "scheduled",
          location: `${flight.departureAirport} - ${flight.departureCity}`,
        })
      }
    }

    // OFF - Takeoff
    if (status?.offUtc && status.offUtc !== "") {
      const offLocal = convertToLocalTime(status.offUtc, flight.departureAirport)
      events.push({
        type: "OFF",
        title: "Takeoff",
        description: `Departed ${flight.departureAirport}`,
        timestamp: status.offUtc,
        local: offLocal,
        icon: PlaneTakeoff,
        status: "completed",
        location: `${flight.departureAirport} - ${flight.departureCity}`,
      })
    } else if (status?.outUtc) {
      // Show upcoming takeoff if already left gate
      const estimatedTakeoff = moment.utc(status.outUtc).add(15, "minutes").toISOString()
      const takeoffLocal = convertToLocalTime(estimatedTakeoff, flight.departureAirport)
      const isUpcoming = moment.utc(estimatedTakeoff).isAfter(now)
      events.push({
        type: "OFF",
        title: isUpcoming ? "Estimated Takeoff" : "Expected Takeoff",
        description: `${isUpcoming ? "Estimated" : "Expected"} departure from ${flight.departureAirport}`,
        timestamp: estimatedTakeoff,
        local: takeoffLocal,
        icon: PlaneTakeoff,
        status: isUpcoming ? "upcoming" : "estimated",
        location: `${flight.departureAirport} - ${flight.departureCity}`,
      })
    }

    // ON - Landing
    if (status?.onUtc && status.onUtc !== "") {
      const onLocal = convertToLocalTime(status.onUtc, flight.arrivalAirport)
      events.push({
        type: "ON",
        title: "Landing",
        description: `Landed at ${flight.arrivalAirport}`,
        timestamp: status.onUtc,
        local: onLocal,
        icon: PlaneLanding,
        status: "completed",
        location: `${flight.arrivalAirport} - ${flight.arrivalCity}`,
      })
    } else if (flight.utcTimes?.estimatedArrival || flight.utcTimes?.scheduledArrival) {
      // Show upcoming landing
      const arrivalTime = flight.utcTimes?.estimatedArrival || flight.utcTimes?.scheduledArrival
      const landingLocal = convertToLocalTime(arrivalTime, flight.arrivalAirport)
      const isUpcoming = moment.utc(arrivalTime).isAfter(now)
      events.push({
        type: "ON",
        title: isUpcoming ? "Estimated Landing" : "Expected Landing",
        description: `${isUpcoming ? "Estimated" : "Expected"} arrival at ${flight.arrivalAirport}`,
        timestamp: arrivalTime,
        local: landingLocal,
        icon: PlaneLanding,
        status: isUpcoming ? "upcoming" : "estimated",
        location: `${flight.arrivalAirport} - ${flight.arrivalCity}`,
      })
    }

    // IN - Arrival at gate
    if (status?.inUtc && status.inUtc !== "") {
      const inLocal = convertToLocalTime(status.inUtc, flight.arrivalAirport)
      events.push({
        type: "IN",
        title: "Arrived at Gate",
        description: `Arrived at Gate ${flight.arrivalGate || "N/A"}`,
        timestamp: status.inUtc,
        local: inLocal,
        icon: MapPin,
        status: "completed",
        location: `${flight.arrivalAirport} - ${flight.arrivalCity}`,
      })
    } else if (status?.onUtc || flight.utcTimes?.estimatedArrival || flight.utcTimes?.scheduledArrival) {
      // Show upcoming gate arrival
      const baseTime = status?.onUtc || flight.utcTimes?.estimatedArrival || flight.utcTimes?.scheduledArrival
      const estimatedGate = moment.utc(baseTime).add(15, "minutes").toISOString()
      const gateLocal = convertToLocalTime(estimatedGate, flight.arrivalAirport)
      const isUpcoming = moment.utc(estimatedGate).isAfter(now)
      events.push({
        type: "IN",
        title: isUpcoming ? "Estimated Gate Arrival" : "Expected Gate Arrival",
        description: `${isUpcoming ? "Estimated" : "Expected"} arrival at Gate ${flight.arrivalGate || "TBD"}`,
        timestamp: estimatedGate,
        local: gateLocal,
        icon: MapPin,
        status: isUpcoming ? "upcoming" : "estimated",
        location: `${flight.arrivalAirport} - ${flight.arrivalCity}`,
      })
    }

    // Sort events by timestamp
    return events.sort((a, b) => {
      try {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      } catch {
        return 0
      }
    })
  }

  const departureLocal = {
    scheduled: convertToLocalTime(flight.utcTimes?.scheduledDeparture, flight.departureAirport),
    estimated: convertToLocalTime(flight.utcTimes?.estimatedDeparture, flight.departureAirport),
    actual: convertToLocalTime(flight.utcTimes?.actualDeparture, flight.departureAirport),
  }

  const arrivalLocal = {
    scheduled: convertToLocalTime(flight.utcTimes?.scheduledArrival, flight.arrivalAirport),
    estimated: convertToLocalTime(flight.utcTimes?.estimatedArrival, flight.arrivalAirport),
    actual: convertToLocalTime(flight.utcTimes?.actualArrival, flight.arrivalAirport),
  }

  const flightDuration = calculateFlightDuration()
  const flightEvents = getFlightEventsTimeline()

  const departureDelay = getDelayInfo(
    flight.utcTimes?.scheduledDeparture,
    flight.utcTimes?.actualDeparture || flight.utcTimes?.estimatedDeparture,
    flight.departureAirport,
  )

  const arrivalDelay = getDelayInfo(
    flight.utcTimes?.scheduledArrival,
    flight.utcTimes?.actualArrival || flight.utcTimes?.estimatedArrival,
    flight.arrivalAirport,
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
      console.error("Error formatting date:", dateString, error)
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

  const getStatusDisplay = (statusCode: string) => {
    const statusInfo = FLIGHT_STATUS_CODES[statusCode]
    return statusInfo ? statusInfo.display : statusCode || "N/A"
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
                  <FlightStatusBadge status={flight.status?.statusCode || flight.flightStatus} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{flight.departureAirport}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{flight.arrivalAirport}</span>
                  </div>
                  <div className="text-muted-foreground">{departureLocal.scheduled?.date || "N/A"}</div>
                </div>

                {/* Flight Route with Times */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Departure */}
                  <div className="text-left">
                    <div className="text-2xl font-bold">{flight.departureAirport}</div>
                    <div className="text-sm text-muted-foreground">{flight.departureCity}</div>
                    <div className="text-xs mt-1">Gate {flight.departureGate || "TBD"}</div>
                    <div className="text-xs text-muted-foreground">
                      {flight.departureAirport &&
                        getAirportTimezone(flight.departureAirport).split("/")[1]?.replace("_", " ")}
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
                    <div className="text-2xl font-bold">{flight.arrivalAirport}</div>
                    <div className="text-sm text-muted-foreground">{flight.arrivalCity}</div>
                    <div className="text-xs mt-1">Gate {flight.arrivalGate || "TBD"}</div>
                    <div className="text-xs text-muted-foreground">
                      {flight.arrivalAirport &&
                        getAirportTimezone(flight.arrivalAirport).split("/")[1]?.replace("_", " ")}
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
                          className={`text-xs px-2 py-1 rounded ${getDepartureStateColor(flight.status?.departureState || flight.flightStatus)}`}
                        >
                          {getStatusDisplay(flight.status?.departureState || flight.flightStatus)}
                        </div>
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scheduled:</span>
                          <span>{departureLocal.scheduled?.time || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated:</span>
                          <span>{departureLocal.estimated?.time || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual:</span>
                          <span>{departureLocal.actual?.time || "N/A"}</span>
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
                          className={`text-xs px-2 py-1 rounded ${getArrivalStateColor(flight.status?.arrivalState || flight.flightStatus)}`}
                        >
                          {getStatusDisplay(flight.status?.arrivalState || flight.flightStatus)}
                        </div>
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scheduled:</span>
                          <span>{arrivalLocal.scheduled?.time || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated:</span>
                          <span>{arrivalLocal.estimated?.time || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual:</span>
                          <span>{arrivalLocal.actual?.time || "N/A"}</span>
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
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Flight Timeline Events
                    {upcomingEvents > 0 && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {upcomingEvents} Upcoming
                      </Badge>
                    )}
                  </h4>
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
                                      </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-medium">{event.local?.time || "N/A"}</span>
                                        <span className="text-muted-foreground">{event.local?.timezone}</span>
                                      </div>

                                      <div className="text-muted-foreground">{event.location}</div>
                                    </div>

                                    {event.local?.date && (
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