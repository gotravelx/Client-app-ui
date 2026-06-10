"use client"

import { RefreshCw, LogOut, Wallet, ChevronDown, User, Wifi, WifiOff, Clock } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { CONTRACT_ADDRESS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const { theme, resolvedTheme } = useTheme()
  const { isConnected: isConnectedWallet, walletAddress, disconnect: disconnectWallet } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [explorerBaseUrl, setExplorerBaseUrl] = useState("https://columbus.caminoscan.com/address/")

  useEffect(() => {
    setMounted(true)
    if (window.location.hostname === 'localhost' || window.location.hostname === 'client.gotravelx.com') {
      setExplorerBaseUrl("https://caminoscan.com/address/")
    }
  }, [])

  const redirectOnApp = () => {
    window.location.href = "https://dev.gotravelx.com"
  }

  const handleLogout = () => {
    disconnectWallet()
    window.location.href = "/"
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
    <div className="border-b px-4 bg-background/95 sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex h-20 items-center">
        <div className="flex items-center gap-2 mr-4 ml-2 md:ml-8 lg:ml-12">
          <Link href="/" className="cursor-pointer flex items-center">
            <span className="sr-only">GoTravelX</span>
            {mounted ? (
              <Image
                src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                alt="GoTravelX Logo"
                width={240}
                height={80}
                className="h-16 w-auto object-contain"
                priority
              />
            ) : (
              <div className="h-18 w-[186px]" />
            )}
          </Link>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 mr-4">
          <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-md self-end">Client-realtime-app</span>

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
            <div className="items-center gap-1 text-[10px] md:text-sm text-muted-foreground hidden md:flex">
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
                <span className="text-[10px] lg:text-sm text-muted-foreground hidden lg:inline">
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
              href={`${explorerBaseUrl}${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono"
            >
              {CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.substring(0, 6)}...${CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)}` : 'N/A'}
            </a>
          </div>

          {isConnectedWallet && (
            <div className="flex items-center gap-3">
              {/* Wallet Badge with Hover Tooltip */}
              <div className="relative group">
                <div className="flex items-center gap-2 bg-white text-black dark:bg-zinc-800 dark:text-white border px-3 py-1.5 rounded-lg font-mono text-sm font-semibold shadow-sm cursor-help">
                  <Wallet className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : ""}
                  </span>
                </div>
                
                {/* Custom Hover Tooltip */}
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-zinc-900 text-white border border-zinc-700 rounded-lg p-2 px-3 shadow-xl font-mono text-xs z-50 w-max select-all animate-in fade-in slide-in-from-top-1 duration-150">
                  {walletAddress}
                </div>
              </div>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 h-9 px-3 rounded-full hover:bg-muted text-foreground"
                  >
                    <span className="text-sm font-medium">Profile</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48" align="end">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/profile" className="flex items-center w-full">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 font-semibold"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
