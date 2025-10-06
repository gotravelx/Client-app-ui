"use client"

import { Plane, Wifi, WifiOff, Clock, RefreshCw } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { CONTRACT_ADDRESS } from "@/lib/constants"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  isConnected?: boolean
  lastUpdate?: Date | null
  onRefresh?: () => void
  refreshing?: boolean
  showRefresh?: boolean
  lastRefresh?: Date | null
}

export function Navbar({
  isConnected = false,
  lastUpdate,
  onRefresh,
  refreshing = false,
  showRefresh = false,
  lastRefresh,
}: NavbarProps) {
  const redirectOnApp = () => {
    window.location.href = "https://gotravelx.com"
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="border-b px-4 bg-background dark:bg-background-dark sticky top-0 z-50 backdrop-blur-sm dark:bg-gray-900/95">
      <div className="flex h-16 items-center">
        <div className="flex items-center gap-2 mr-4">
          <Plane className="h-6 w-6 text-primary" />
          <h3 onClick={redirectOnApp} className="cursor-pointer flex items-center">
            <span className="text-xl font-bold">GoTravelX</span>
          </h3>
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md">Client-realtime-app</span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 mr-4">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium hidden sm:inline">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 font-medium hidden sm:inline">Disconnected</span>
            </>
          )}

          {lastUpdate && (
            <div className="items-center gap-1 text-sm text-muted-foreground hidden md:flex">
              <Clock className="h-3 w-3" />
              <span>Last: {formatTime(lastUpdate)}</span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {/* Refresh Button */}
          {showRefresh && onRefresh && (
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-sm text-muted-foreground hidden lg:inline">
                  Updated: {formatTime(lastRefresh)}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          )}

          <div className="text-sm hidden lg:block">
            Contract:{" "}
            <a
              href={`https://columbus.caminoscan.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono"
            >
              {CONTRACT_ADDRESS.substring(0, 6)}...{CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)}
            </a>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
