"use client"

import { Badge } from "@/components/ui/badge"

interface FlightStatusBadgeProps {
  status: string
}

export function FlightStatusBadge({ status }: FlightStatusBadgeProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "NDPT":
        return { display: "Not Departed", variant: "secondary" as const }
      case "OUT":
        return { display: "Departed Gate", variant: "default" as const }
      case "OFF":
        return { display: "In Flight", variant: "default" as const }
      case "ON":
        return { display: "Landed", variant: "default" as const }
      case "IN":
        return { display: "Arrived", variant: "default" as const }
      case "CNCL":
        return { display: "Cancelled", variant: "destructive" as const }
      case "DLY":
        return { display: "Delayed", variant: "destructive" as const }
      case "ONT":
        return { display: "On Time", variant: "default" as const }
      default:
        return { display: status, variant: "secondary" as const }
    }
  }

  const statusInfo = getStatusInfo(status)
  return <Badge className="text-lg" variant={statusInfo.variant}>{statusInfo.display}</Badge>
}
