"use client";
import { Plane } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTRACT_ADDRESS } from "@/lib/constants";

export function Navbar() {
  const redirectOnApp = () => {
    window.location.href = "https://gotravelx.com";
  };

  return (
    <div className="border-b  px-4 bg-background dark:bg-background-dark">
      <div className="flex h-16 items-center">
        <div className="flex items-center gap-2 mr-4">
          <Plane className="h-6 w-6 text-primary" />
          <h3
            onClick={redirectOnApp}
            className="cursor-pointer flex items-center"
          >
            <span className="text-xl font-bold">GoTravelX</span>
          </h3>
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md">
            Client-realtime-app
          </span>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <div className="text-sm">
            Contract:{" "}
            <a
              href={`https://columbus.caminoscan.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono"
            >
              {CONTRACT_ADDRESS.substring(0, 6)}...
              {CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)}
            </a>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
