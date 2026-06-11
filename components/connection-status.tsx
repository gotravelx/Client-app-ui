"use client"

import { Wifi, WifiOff, Clock } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  lastUpdate: Date | null
}

export function ConnectionStatus({ isConnected, lastUpdate }: Readonly<ConnectionStatusProps>) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="flex items-center justify-between mb-6 p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">Connected to Blockchain</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">Disconnected</span>
          </>
        )}
      </div>

      {lastUpdate && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last update: {formatTime(lastUpdate)}</span>
        </div>
      )}
    </div>
  )
}
