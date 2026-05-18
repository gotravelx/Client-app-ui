"use client"

import type React from "react"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"

interface SearchBarProps {
  onSearch: (flightNumber: string) => void
  loading: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [flightNumber, setFlightNumber] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (flightNumber.trim()) {
      onSearch(flightNumber.trim().toUpperCase())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          placeholder="Enter flight number UA3682"
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          className="w-full px-4 py-3 pr-12 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !flightNumber.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-primary disabled:opacity-50"
          aria-label="Search"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" data-testid="loading-spinner" />
          ) : (
            <Search className="h-5 w-5" data-testid="search-icon" />
          )}
        </button>
      </div>
    </form>
  )
}
