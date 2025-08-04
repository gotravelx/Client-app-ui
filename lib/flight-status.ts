export const FLIGHT_STATUS_CODES: {
  [key: string]: { display: string; variant: "default" | "secondary" | "destructive" | "outline" }
} = {
  // Flight/Leg STATUS - Operational Event
  NDPT: { display: "Not Departed", variant: "secondary" },
  CNCL: { display: "Cancelled", variant: "destructive" },
  OUT: { display: "Departed Gate", variant: "default" },
  OFF: { display: "In Flight", variant: "default" },
  ON: { display: "Landed", variant: "default" },
  IN: { display: "Arrived at Gate", variant: "default" },
  RTBL: { display: "Returned to Gate", variant: "outline" },
  RTFL: { display: "Returned to Airport", variant: "outline" },
  DVRT: { display: "Diverted", variant: "destructive" },
  LOCK: { display: "Contact United", variant: "destructive" },

  // State at departure
  DLY: { display: "Delayed", variant: "destructive" },
  CNL: { display: "Cancelled", variant: "destructive" },
  PND: { display: "Pending", variant: "secondary" },
  DIVR: { display: "Rerouted", variant: "outline" },
  XSP: { display: "Extra Stop", variant: "outline" },
  NSP: { display: "Cancelled", variant: "destructive" },
  LCK: { display: "Unavailable", variant: "destructive" },
  ONT: { display: "On Time", variant: "default" },
  OT: { display: "On Time", variant: "default" },

  // State at arrival
  ERL: { display: "Early", variant: "default" },
  DVT: { display: "Rerouted", variant: "outline" },
  XST: { display: "Extra Stop", variant: "outline" },
  NST: { display: "Cancelled", variant: "destructive" },
}


export const getDepartureStateColor = (state: string): string => {
  if (!state) return "bg-gray-200 text-gray-700"

  const stateLower = state.toLowerCase()

  if (stateLower.includes("delayed") || stateLower === "dly") return "bg-orange-100 text-orange-800"
  if (stateLower.includes("cancelled") || stateLower === "cnl") return "bg-red-100 text-red-800"
  if (stateLower.includes("pending") || stateLower === "pnd") return "bg-yellow-100 text-yellow-800"
  if (stateLower.includes("rerouted") || stateLower === "div") return "bg-purple-100 text-purple-800"
  if (stateLower.includes("extra stop") || stateLower === "xsp") return "bg-blue-100 text-blue-800"
  if (stateLower.includes("unavailable") || stateLower === "lck") return "bg-gray-100 text-gray-800"
  if (stateLower.includes("on time") || stateLower === "ont" || stateLower === "ot" || stateLower === "ca")
    return "bg-green-100 text-green-800"

  return "bg-gray-100 text-gray-800"
}

export const getArrivalStateColor = (state: string): string => {
  if (!state) return "bg-gray-200 text-gray-700"

  const stateLower = state.toLowerCase()

  if (stateLower.includes("early") || stateLower === "erl") return "bg-green-100 text-green-800"
  if (stateLower.includes("delayed") || stateLower === "dly") return "bg-orange-100 text-orange-800"
  if (stateLower.includes("cancelled") || stateLower === "cnl") return "bg-red-100 text-red-800"
  if (stateLower.includes("pending") || stateLower === "pnd") return "bg-yellow-100 text-yellow-800"
  if (stateLower.includes("rerouted") || stateLower === "dvt") return "bg-purple-100 text-purple-800"
  if (stateLower.includes("extra stop") || stateLower === "xst") return "bg-blue-100 text-blue-800"
  if (stateLower.includes("unavailable") || stateLower === "lck") return "bg-gray-100 text-gray-800"
  if (stateLower.includes("on time") || stateLower === "ont" || stateLower === "co")
    return "bg-green-100 text-green-800"

  return "bg-gray-100 text-gray-800"
}